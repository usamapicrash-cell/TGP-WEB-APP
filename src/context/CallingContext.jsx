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
    
    // Sounds Refs
    const ringtoneAudioRef = useRef(null);   // Jab customer call kare (Incoming)
    const ringbackAudioRef = useRef(null);   // Jab hum customer ko call karein (Outbound Ringing)
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        // Sounds paths (Inhe public folder ke public/sounds/ mein rakhain)
        ringtoneAudioRef.current = new Audio('/sounds/ringtone.mp3'); 
        ringbackAudioRef.current = new Audio('/sounds/ringback.mp3'); // Outbound ringing sound

        return () => {
            isMountedRef.current = false;
            stopAllSounds();
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

        if (!isMountedRef.current) return;

        setCallState({ status: 'idle', phoneNumber: null, clientName: null, isMuted: false });
        setShowCallWidget(false);
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
                            if (status === 'completed' || status === 'rejected' || status === 'failed') {
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
        if (!phoneNumber) {
            alert("Customer ka phone number missing hai!");
            return;
        }
        if (callState.status !== 'idle') {
            alert("Ek call pehle se chal rahi hai. Pehle usay end karein.");
            return;
        }

        const formattedNumber = phoneNumber.replace(/\D/g, '');

        setCallState({ status: 'ringing', phoneNumber: formattedNumber, clientName, isMuted: false });
        setShowCallWidget(true);

        // Ringback tone start karein (Tring-Tring sound)
        if (ringbackAudioRef.current) {
            ringbackAudioRef.current.loop = true;
            ringbackAudioRef.current.play().catch(e => console.log("Ringing sound error:", e));
        }

        try {
            const call = await voiceAppRef.current.callServer(formattedNumber, 'phone');
            activeCallRef.current = call;

            // Jab outbound call answer ho jaye ya disconnect ho jaye
            call.on('status:changed', (status) => {
                if (!isMountedRef.current) return;

                if (status === 'answered') {
                    stopAllSounds(); // Ringing sound band karein
                    setCallState(prev => ({ ...prev, status: 'active' }));
                } else if (status === 'completed' || status === 'rejected' || status === 'failed') {
                    cleanUpCallState();
                }
            });

            // CRITICAL FIX: Agar dusri side se user call cut (reject/busy) kar de
            call.on('member:left', (member) => {
                console.log("Member left the call:", member);
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