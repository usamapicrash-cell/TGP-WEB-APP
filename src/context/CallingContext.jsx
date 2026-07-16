import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import NexmoClient from 'nexmo-client';
import api from '../api/axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const CallContext = createContext();

export const CallProvider = ({ children }) => {
    const [callState, setCallState] = useState({
        status: 'idle', // idle | ringing | incoming | active
        phoneNumber: null,
        clientName: null,
        isMuted: false,
    });
    const [showCallWidget, setShowCallWidget] = useState(false);

    const nexmoClientRef = useRef(null);   
    const voiceAppRef = useRef(null);      
    const activeCallRef = useRef(null);
    const echoInstanceRef = useRef(null); 

    const ringtoneAudioRef = useRef(null);   
    const ringbackAudioRef = useRef(null);   
    const remoteAudioRef = useRef(null);     
    const isMountedRef = useRef(true);

    // Audio initializations
    useEffect(() => {
        isMountedRef.current = true;
        
        ringtoneAudioRef.current = new Audio('/sounds/ringtone.mp3'); 
        ringbackAudioRef.current = new Audio('/sounds/ringback.mp3'); 

        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        remoteAudioRef.current = audioEl;
        document.body.appendChild(audioEl);

        return () => {
            isMountedRef.current = false;
            stopAllSounds();
            if (audioEl) audioEl.remove();
        };
    }, []);

    // Laravel Echo Setup for Webhooks (Completed/Ended calls)
    useEffect(() => {
        console.log("Setting up Pusher Connection...");
        try {
            const pusherKey = import.meta.env.VITE_PUSHER_APP_KEY || '355c9972a93b7b6dc813';
            const pusherCluster = import.meta.env.VITE_PUSHER_APP_CLUSTER || 'ap2';

            if (!echoInstanceRef.current) {
                echoInstanceRef.current = new Echo({
                    broadcaster: 'pusher',
                    key: pusherKey,
                    cluster: pusherCluster,
                    forceTLS: true,
                    disableStats: true
                });
            }

            const channel = echoInstanceRef.current.channel('vonage-calls');
            
            const handleCallStatusUpdate = (data) => {
                console.log("[Pusher Webhook] Call status received:", data);
                const status = (data.status || data.call_status || '').toLowerCase();
                const endStates = ['completed', 'busy', 'cancelled', 'timeout', 'rejected', 'failed', 'no-answer'];
                
                if (endStates.includes(status)) {
                    console.log(`[Pusher] Ending call state due to webhook status: ${status}`);
                    cleanUpCallState(`Pusher remote status: ${status}`);
                }
            };

            channel.listen('CallStatusUpdated', handleCallStatusUpdate);
            channel.listen('.CallStatusUpdated', handleCallStatusUpdate);
            channel.listen('.call.status.updated', handleCallStatusUpdate);

        } catch (error) {
            console.error("Echo Setup Failed:", error);
        }

        return () => {
            if (echoInstanceRef.current) {
                echoInstanceRef.current.leaveChannel('vonage-calls');
            }
        };
    }, []);

    const stopAllSounds = () => {
        console.log("Stopping all sounds...");
        if (ringtoneAudioRef.current) {
            ringtoneAudioRef.current.pause();
            ringtoneAudioRef.current.currentTime = 0;
        }
        if (ringbackAudioRef.current) {
            ringbackAudioRef.current.pause();
            ringbackAudioRef.current.currentTime = 0;
        }
    };

    const cleanUpCallState = (reason = "Unknown Reason") => {
        console.log(`[Call Cleanup] Reason: ${reason}`);
        stopAllSounds();
        activeCallRef.current = null;

        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }

        setShowCallWidget(false);
        setCallState({ 
            status: 'idle', 
            phoneNumber: null, 
            clientName: null, 
            isMuted: false 
        });
    };

    const attachAudioStream = (call) => {
        if (!call) return;
        console.log("Attempting to attach audio stream...");
        
        const stream = call.htmlAudio?.srcObject || call.stream;
        if (stream && remoteAudioRef.current) {
            console.log("Stream found, playing in element.");
            remoteAudioRef.current.srcObject = stream;
        } else if (typeof call.setAudioElement === 'function' && remoteAudioRef.current) {
            console.log("Using setAudioElement for stream setup.");
            call.setAudioElement(remoteAudioRef.current);
        }
    };

    // Call ke events ko bilkul bulletproof bind karne ka naya function
    // 1. Updated and Bulletproof Call Event Binder
const bindDirectCallEvents = (call) => {
    if (!call) return;
    console.log("Binding events directly to Call Object:", call);

    // Stream ready hone par audio play karein
    call.on('member:media', (member, event) => {
        console.log("Event: member:media triggered!");
        attachAudioStream(call);
    });

    // Jab koi member call join kare (chahe inbound ho ya outbound)
    call.on('member:joined', (member) => {
        console.log("Event: member:joined -> Name:", member.user.name, "State:", member.state);
        
        // Agar remote user join ho gaya hai (Answered State)
        if (member.user.name !== 'tgp_portal_user') { 
            console.log("!!! REMOTE USER HAS JOINED / ANSWERED !!!");
            stopAllSounds();
            attachAudioStream(call);
            setCallState(prev => ({
                ...prev,
                status: 'active'
            }));
        }
    });

    // Jab member update ho (Fallback mechanism for answer state)
    call.on('member:updated', (member) => {
        console.log("Event: member:updated -> State:", member.state);
        const state = (member.state || "").toLowerCase();

        if (['answered', 'joined'].includes(state)) {
            console.log("!!! CALL ANSWERED (MEMBER UPDATED) !!!");
            stopAllSounds();
            attachAudioStream(call);
            setCallState(prev => ({ ...prev, status: 'active' }));
        }
    });

    // Call Hangup / Disconnect states
    call.on('member:left', (member) => {
        console.log("Event: member:left -> Member left the call.");
        cleanUpCallState("Remote party left the call");
    });
};

    // Global Conversation/Member event listener
    const listenToGlobalSessionEvents = (session) => {
        if (!session) return;

        session.on("conversation:member:joined", (member, event) => {
            console.log("Global Event: Member Joined Session:", member);
        });

        session.on("conversation:member:left", (member, event) => {
            console.log("Global Event: Member Left Session:", member);
            cleanUpCallState("Client disconnected (left session)");
        });
    };

    // Vonage Client Initialization
    useEffect(() => {
        let clientApp = null;

        const initVonageClient = async () => {
            try {
                const response = await api.get('/communications/voice-token');
                if (!response.data?.token) return;

                const nexmo = new NexmoClient({ debug: true }); // Debug on kiya taake console me exact library behavior dikhe
                nexmoClientRef.current = nexmo;

                clientApp = await nexmo.createSession(response.data.token);
                voiceAppRef.current = clientApp;   

                if (!isMountedRef.current) return;

                listenToGlobalSessionEvents(clientApp);

                // INBOUND CALLS
                clientApp.on("member:call", (member, call) => {
                    if (call.direction === "inbound") {
                        console.log("Inbound Call Detected!");
                        activeCallRef.current = call;

                        setCallState({
                            status: 'incoming',
                            phoneNumber: call.from || 'Unknown',
                            clientName: "Incoming Call",
                            isMuted: false
                        });
                        setShowCallWidget(true);

                        if (ringtoneAudioRef.current) {
                            ringtoneAudioRef.current.loop = true;
                            ringtoneAudioRef.current.play().catch(e => console.log("Ringtone play error:", e));
                        }

                        bindDirectCallEvents(call);
                    }
                });

                // OUTBOUND CALL TRUCKING (YAHAN SE KOI BHI NAYA OUTBOUND LEG DIRECT DETECT HOGA)
                clientApp.on("call:created", (call) => {
                    console.log("Outbound Call Created globally on Client:", call);
                    activeCallRef.current = call;
                    bindDirectCallEvents(call);
                });

            } catch (error) {
                console.error("Vonage Voice Client Initialization Failed:", error);
            }
        };

        initVonageClient();

        return () => {
            stopAllSounds();
        };
    }, []);

    // OUTBOUND CALLS
    const makeCall = async (phoneNumber, clientName) => {
    if (!voiceAppRef.current) {
        console.warn("Voice server abhi tayyar nahi hai.");
        return;
    }
    if (!phoneNumber) return;
    if (callState.status !== 'idle') return;

    try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
        console.error("Mic Error:", err);
        alert("Microphone permission is required to place calls!");
        return;
    }

    const formattedNumber = phoneNumber.replace(/\D/g, '');
    
    // Sabse pehle local state ko ringing karein aur ringback tone chalayein
    setCallState({ 
        status: 'ringing', 
        phoneNumber: formattedNumber, 
        clientName: clientName || 'Customer', 
        isMuted: false 
    });
    setShowCallWidget(true);

    if (ringbackAudioRef.current) {
        ringbackAudioRef.current.loop = true;
        ringbackAudioRef.current.play().catch(e => console.log("Ringing sound play error:", e));
    }

    try {
        console.log(`Placing Outbound Call to: ${formattedNumber}`);
        
        // Vonage call routing setup
        const call = await voiceAppRef.current.callServer(formattedNumber, 'phone', {
            number: formattedNumber
        });
        
        activeCallRef.current = call;
        
        // Events connect karein jo upar update kiye hain
        bindDirectCallEvents(call);

        // EXTRA SAFETY: Call object ke conversation level par direct listen karein
        if (call.conversation) {
            console.log("Binding to call.conversation events");
            call.conversation.on('member:joined', (member) => {
                console.log("Conversation Level Event: member:joined -> State:", member.state);
                if (member.user.name !== 'tgp_portal_user') {
                    stopAllSounds();
                    attachAudioStream(call);
                    setCallState(prev => ({ ...prev, status: 'active' }));
                }
            });
        }

    } catch (error) {
        console.error("Failed to establish call:", error);
        cleanUpCallState("Server call fail");
    }
};

    const answerCall = () => {
        if (activeCallRef.current && callState.status === 'incoming') {
            stopAllSounds();

            activeCallRef.current.answer()
                .then(() => {
                    attachAudioStream(activeCallRef.current);
                    setCallState(prev => ({ ...prev, status: 'active' }));
                })
                .catch((err) => {
                    console.error("Error answering call:", err);
                    cleanUpCallState("Answer call exception");
                });
        }
    };

    const endCall = () => {
        console.log("Manual end call triggered");
        const call = activeCallRef.current;
        
        cleanUpCallState("Agent ended call"); 

        if (!call) return;
        try {
            if (typeof call.hangUp === 'function') call.hangUp().catch(() => {});
            else if (typeof call.hangup === 'function') call.hangup();
            else if (typeof call.reject === 'function') call.reject();
        } catch (e) {
            console.log('End call error:', e);
        }
    };

    const toggleMute = () => {
        if (activeCallRef.current && callState.status === 'active') {
            try {
                if (callState.isMuted) activeCallRef.current.unmute();
                else activeCallRef.current.mute();
                setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
            } catch (e) {
                console.error('Mute toggle error:', e);
            }
        }
    };

    return (
        <CallContext.Provider value={{ callState, showCallWidget, setShowCallWidget, makeCall, answerCall, endCall, toggleMute }}>
            {children}
        </CallContext.Provider>
    );
};

export const useCall = () => useContext(CallContext);