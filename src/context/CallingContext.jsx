import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import NexmoClient from 'nexmo-client';
import api from '../api/axios';

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
    
    // Sounds & WebRTC Audio Elements Refs
    const ringtoneAudioRef = useRef(null);   // Jab customer call kare (Incoming)
    const ringbackAudioRef = useRef(null);   // Jab hum customer ko call karein (Outbound Ringing)
    const remoteAudioRef = useRef(null);     // WebRTC call audio stream output karne ke liye
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        
        // Sounds paths
        ringtoneAudioRef.current = new Audio('/sounds/ringtone.mp3'); 
        ringbackAudioRef.current = new Audio('/sounds/ringback.mp3'); 

        // WebRTC ka audio track play karne ke liye invisible Audio element create karna
        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        remoteAudioRef.current = audioEl;
        document.body.appendChild(audioEl);

        return () => {
            isMountedRef.current = false;
            stopAllSounds();
            if (audioEl) {
                audioEl.remove();
            }
        };
    }, []);

    const stopAllSounds = () => {
        if (ringtoneAudioRef.current) {
            ringtoneAudioRef.current.pause();
            ringtoneAudioRef.current.currentTime = 0;
        }
        if (ringbackAudioRef.current) {
            ringbackAudioRef.current.pause();
            ringbackAudioRef.current.currentTime = 0;
        }
    };

    // FIXED: Cleanup state with immediate state updates
    const cleanUpCallState = () => {
        console.log("Cleaning up call state, hiding popup...");
        stopAllSounds();
        activeCallRef.current = null;

        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null; // Audio stream disconnect karein
        }

        // Force react state to trigger immediately
        setShowCallWidget(false);
        setCallState({ 
            status: 'idle', 
            phoneNumber: null, 
            clientName: null, 
            isMuted: false 
        });
    };

    // Helper to attach WebRTC stream to HTML audio element
    const attachAudioStream = (call) => {
        if (call && remoteAudioRef.current) {
            const stream = call.htmlAudio?.srcObject || call.stream;
            if (stream) {
                remoteAudioRef.current.srcObject = stream;
            } else if (typeof call.setAudioElement === 'function') {
                call.setAudioElement(remoteAudioRef.current);
            }
        }
    };

    useEffect(() => {
        let clientApp = null;

        const initVonageClient = async () => {
            try {
                const response = await api.get('/communications/voice-token');
                if (!response.data?.token) return;

                const nexmo = new NexmoClient({ debug: false });
                nexmoClientRef.current = nexmo;

                clientApp = await nexmo.createSession(response.data.token);
                voiceAppRef.current = clientApp;   

                if (!isMountedRef.current) return;

                // Handle INBOUND CALLS (Jab customer call kare)
                clientApp.on("member:call", (member, call) => {
                    if (call.direction === "inbound") {
                        activeCallRef.current = call;

                        setCallState({
                            status: 'incoming',
                            phoneNumber: call.from || 'Unknown Customer',
                            clientName: "Incoming Call",
                            isMuted: false
                        });
                        setShowCallWidget(true);

                        if (ringtoneAudioRef.current) {
                            ringtoneAudioRef.current.loop = true;
                            ringtoneAudioRef.current.play().catch(e => console.log("Audio play deferred:", e));
                        }

                        // INBOUND Event Listeners
                        call.on('member:state', (memberObj, event) => {
                            const state = (memberObj.state || event?.body?.status || "").toLowerCase();
                            console.log("Inbound Member State Update:", state);

                            if (['left', 'completed', 'canceled', 'rejected'].includes(state)) {
                                cleanUpCallState();
                            }
                        });

                        call.on('status:changed', (status) => {
                            const s = status.toLowerCase();
                            console.log("Inbound Call Status Update:", s);

                            if (['answered', 'active', 'joined'].includes(s)) {
                                stopAllSounds();
                                attachAudioStream(call);
                                setCallState(prev => ({ ...prev, status: 'active' }));
                            } else if (['completed', 'rejected', 'failed', 'busy', 'timeout', 'unanswered', 'left'].includes(s)) {
                                cleanUpCallState();
                            }
                        });
                    }
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

    // OUTBOUND CALLS (React se Customer ko call lagana)
    const makeCall = async (phoneNumber, clientName) => {
        if (!voiceAppRef.current) {
            alert("Voice server abhi tayyar nahi hai. Kuch second baad dobara koshish karein.");
            return;
        }
        if (!phoneNumber) return alert("Customer ka phone number missing hai!");
        if (callState.status !== 'idle') return alert("Ek call pehle se chal rahi hai. Pehle usay end karein.");

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.error("Mic Error:", err);
            return alert("Microphone ki permission required hai! Browser settings mein mic allow karein.");
        }

        const formattedNumber = phoneNumber.replace(/\D/g, '');
        setCallState({ status: 'ringing', phoneNumber: formattedNumber, clientName, isMuted: false });
        setShowCallWidget(true);

        if (ringbackAudioRef.current) {
            ringbackAudioRef.current.loop = true;
            ringbackAudioRef.current.play().catch(e => console.log("Ringing sound error:", e));
        }

        try {
            const call = await voiceAppRef.current.callServer(formattedNumber, 'phone', {
                number: formattedNumber
            });
            activeCallRef.current = call;

            call.on('member:media', (member, event) => {
                attachAudioStream(call);
            });

            // FIXED: Pure State management update within WebRTC context
            call.on('member:state', (member, event) => {
                const currentState = (event?.body?.status || member.state || "").toLowerCase();
                console.log("Outbound Member State Update:", currentState);

                if (['answered', 'joined'].includes(currentState)) {
                    stopAllSounds(); 
                    attachAudioStream(call);
                    // Explicitly call state update so popup switches state
                    setCallState(prev => ({ ...prev, status: 'active' }));
                } 
                else if (['left', 'completed', 'rejected', 'failed', 'busy', 'timeout', 'unanswered', 'canceled'].includes(currentState)) {
                    console.log("Closing popup now...");
                    cleanUpCallState();
                }
            });

            // FIXED: Fallback listeners on direct call state change
            call.on('status:changed', (status) => {
                const s = status.toLowerCase();
                console.log("Outbound Call Status Update:", s);

                if (['answered', 'joined', 'active'].includes(s)) {
                    stopAllSounds();
                    attachAudioStream(call);
                    setCallState(prev => ({ ...prev, status: 'active' }));
                } 
                else if (['completed', 'rejected', 'failed', 'busy', 'timeout', 'unanswered', 'left', 'cancelled'].includes(s)) {
                    console.log("Closing popup on status change:", s);
                    cleanUpCallState();
                }
            });

            call.on('error', (error) => {
                console.error("Call Encountered an Error:", error);
                cleanUpCallState();
            });

        } catch (error) {
            console.error("Failed to establish call:", error);
            cleanUpCallState();
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
                    cleanUpCallState();
                });
        }
    };

    const endCall = () => {
        console.log("Manual end call triggered");
        const call = activeCallRef.current;
        cleanUpCallState(); // Isko foran call karein taake popup usi waqt gayab ho jaye

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