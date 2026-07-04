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

    const nexmoClientRef = useRef(null);   // NexmoClient class instance
    const voiceAppRef = useRef(null);      // createSession() se mila hua session/application object — isi par callServer() hota hai
    const activeCallRef = useRef(null);
    const audioRef = useRef(null);
    const isMountedRef = useRef(true);

    useEffect(() => {
        isMountedRef.current = true;
        audioRef.current = new Audio('/sounds/ringtone.mp3');

        return () => {
            isMountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        let clientApp = null;

        const initVonageClient = async () => {
            try {
                const response = await api.get('/communications/voice-token');
                if (!response.data?.token) return;

                const nexmo = new NexmoClient({ debug: false });
                nexmoClientRef.current = nexmo;

                clientApp = await nexmo.createSession(response.data.token);
                voiceAppRef.current = clientApp;   // 👈 Session object save karein — isi par callServer() call hoga

                if (!isMountedRef.current) return;

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

                        if (audioRef.current) {
                            audioRef.current.loop = true;
                            audioRef.current.play().catch(e => console.log("Audio play deferred:", e));
                        }

                        call.on('status:changed', (status) => {
                            if (status === 'completed' || status === 'rejected') {
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
            if (audioRef.current) audioRef.current.pause();
        };
    }, []);

    const cleanUpCallState = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
        }
        activeCallRef.current = null;

        if (!isMountedRef.current) return;

        setCallState({ status: 'idle', phoneNumber: null, clientName: null, isMuted: false });
        setShowCallWidget(false);
    };

    const makeCall = async (phoneNumber, clientName) => {
        if (!voiceAppRef.current) {
            alert("Voice server abhi tayyar nahi hai. Kuch second baad dobara koshish karein.");
            return;
        }
        if (!phoneNumber) {
            alert("Customer ka phone number missing hai!");
            return;
        }

        // Agar pehle se koi call active/ringing hai to naya call na banayein
        if (callState.status !== 'idle') {
            alert("Ek call pehle se chal rahi hai. Pehle usay end karein.");
            return;
        }

        const formattedNumber = phoneNumber.replace(/\D/g, '');

        setCallState({ status: 'ringing', phoneNumber: formattedNumber, clientName, isMuted: false });
        setShowCallWidget(true);

        try {
            // 👇 FIX: voiceAppRef (session object) use karein, nexmoClientRef nahi
            const call = await voiceAppRef.current.callServer(formattedNumber, 'phone');
            activeCallRef.current = call;

            call.on('status:changed', (status) => {
                if (!isMountedRef.current) return;

                if (status === 'answered') {
                    setCallState(prev => ({ ...prev, status: 'active' }));
                } else if (status === 'completed' || status === 'rejected' || status === 'failed') {
                    cleanUpCallState();
                }
            });
        } catch (error) {
            console.error("Failed to establish call:", error);
            cleanUpCallState();
        }
    };

    const answerCall = () => {
        if (activeCallRef.current && callState.status === 'incoming') {
            if (audioRef.current) audioRef.current.pause();

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

    // --- Cancel / End / Reject Call ---
    // Works for all states: ringing (outbound not yet answered),
    // incoming (reject before answering), and active (hang up connected call).
    const endCall = () => {
        const call = activeCallRef.current;

        // UI turant reset karein taake user ko lag na lage ke button response nahi de raha
        cleanUpCallState();

        if (!call) return;

        try {
            if (typeof call.hangUp === 'function') {
                call.hangUp().catch(err => console.log('hangUp() error (safe to ignore if already ended):', err));
            } else if (typeof call.hangup === 'function') {
                call.hangup();
            } else if (typeof call.reject === 'function') {
                call.reject();
            }
        } catch (e) {
            console.log('End call error (call likely already ended):', e);
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