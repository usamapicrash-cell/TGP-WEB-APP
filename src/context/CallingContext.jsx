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
        
        // Sounds paths (Inhe public folder ke public/sounds/ mein rakhain)
        ringtoneAudioRef.current = new Audio('/sounds/ringtone.mp3'); 
        ringbackAudioRef.current = new Audio('/sounds/ringback.mp3'); 

        // CRITICAL FIX: WebRTC ka audio track play karne ke liye invisible Audio element create karna
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

    const cleanUpCallState = () => {
        stopAllSounds();
        activeCallRef.current = null;

        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null; // Audio stream disconnect karein
        }

        if (!isMountedRef.current) return;

        setCallState({ status: 'idle', phoneNumber: null, clientName: null, isMuted: false });
        setShowCallWidget(false);
    };

    // Helper to attach WebRTC stream to HTML audio element
    const attachAudioStream = (call) => {
        if (call && remoteAudioRef.current) {
            // Vonage WebRTC stream ko html audio tag ke source main inject karna
            const stream = call.htmlAudio?.srcObject || call.stream;
            if (stream) {
                remoteAudioRef.current.srcObject = stream;
            } else if (typeof call.setAudioElement === 'function') {
                // Alternately try Vonage standard SDK bindings
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
                            clientName: "Incoming Call (TGP Portal)",
                            isMuted: false
                        });
                        setShowCallWidget(true);

                        if (ringtoneAudioRef.current) {
                            ringtoneAudioRef.current.loop = true;
                            ringtoneAudioRef.current.play().catch(e => console.log("Audio play deferred:", e));
                        }

                        // Event Listeners for Inbound Call
                        call.on('status:changed', (status) => {
                            if (!isMountedRef.current) return;
                            console.log("Inbound Call Status Update:", status);

                            if (status === 'answered') {
                                stopAllSounds();
                                attachAudioStream(call); // WebRTC stream link karein taake dono taraf awaz jaye
                                setCallState(prev => ({ ...prev, status: 'active' }));
                            } else if (['completed', 'rejected', 'failed', 'busy', 'timeout', 'unanswered'].includes(status.toLowerCase())) {
                                cleanUpCallState();
                            }
                        });

                        call.on('member:left', () => {
                            cleanUpCallState();
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
        if (!phoneNumber) {
            alert("Customer ka phone number missing hai!");
            return;
        }
        if (callState.status !== 'idle') {
            alert("Ek call pehle se chal rahi hai. Pehle usay end karein.");
            return;
        }

        // Microphone Permission Prompt (Laazmi browser pop-up)
        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.error("Mic Error:", err);
            alert("Microphone ki permission required hai! Browser settings mein mic allow karein.");
            return;
        }

        const formattedNumber = phoneNumber.replace(/\D/g, '');

        setCallState({ status: 'ringing', phoneNumber: formattedNumber, clientName, isMuted: false });
        setShowCallWidget(true);

        if (ringbackAudioRef.current) {
            ringbackAudioRef.current.loop = true;
            ringbackAudioRef.current.play().catch(e => console.log("Ringing sound error:", e));
        }

        try {
            const call = await voiceAppRef.current.callServer(formattedNumber, 'phone');
            activeCallRef.current = call;

            // Handle WebRTC Stream addition (Jab audio connect ho jaye)
            call.on('member:media', (member, event) => {
                console.log("Media channel joined/updated:", event);
                attachAudioStream(call); // Audio routing start!
            });

            // Jab remote user (mobile wala) call status update kare
            call.on('member:state', (member, event) => {
                if (!isMountedRef.current) return;
                
                const currentState = (event?.body?.status || member.state || "").toLowerCase();
                console.log("Member State Update:", currentState);

                if (currentState === 'answered') {
                    stopAllSounds(); 
                    attachAudioStream(call); // Stream ko audio output par link karein
                    setCallState(prev => ({ ...prev, status: 'active' }));
                }
            });

            // Call status changes fallback
            call.on('status:changed', (status) => {
                if (!isMountedRef.current) return;
                
                const s = status.toLowerCase();
                console.log("Call Status Update:", s);

                if (s === 'answered') {
                    stopAllSounds();
                    attachAudioStream(call);
                    setCallState(prev => ({ ...prev, status: 'active' }));
                } else if (['completed', 'rejected', 'failed', 'busy', 'timeout', 'unanswered'].includes(s)) {
                    cleanUpCallState();
                }
            });

            call.on('member:left', (member) => {
                console.log("Member left the call:", member);
                cleanUpCallState();
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
                    if (!isMountedRef.current) return;
                    attachAudioStream(activeCallRef.current);
                    setCallState(prev => ({ ...prev, status: 'active' }));
                })
                .catch((err) => {
                    console.error("Error answering call via Nexmo API:", err);
                    cleanUpCallState();
                });
        }
    };

    const endCall = () => {
        const call = activeCallRef.current;
        cleanUpCallState();

        if (!call) return;

        try {
            if (typeof call.hangUp === 'function') {
                call.hangUp().catch(err => console.log('hangUp() error:', err));
            } else if (typeof call.hangup === 'function') {
                call.hangup();
            } else if (typeof call.reject === 'function') {
                call.reject();
            }
        } catch (e) {
            console.log('End call error:', e);
        }
    };

    const toggleMute = () => {
        if (activeCallRef.current && callState.status === 'active') {
            try {
                if (callState.isMuted) {
                    activeCallRef.current.unmute();
                } else {
                    activeCallRef.current.mute();
                }
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