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
    const activeConversationRef = useRef(null); // Conversation tracker taake status events miss na hon

    const ringtoneAudioRef = useRef(null);   
    const ringbackAudioRef = useRef(null);   
    const remoteAudioRef = useRef(null);     
    const isMountedRef = useRef(true);

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

    // UI ko clean aur close karne ke liye absolute cleanup function
    const cleanUpCallState = () => {
        console.log("Cleaning up call state immediately...");
        stopAllSounds();
        activeCallRef.current = null;
        activeConversationRef.current = null;

        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }

        // State update using functional update to prevent React state batching issues
        setShowCallWidget(false);
        setCallState({ 
            status: 'idle', 
            phoneNumber: null, 
            clientName: null, 
            isMuted: false 
        });
    };

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

    // Conversation events register karne ka common function (Both Inbound & Outbound)
    const registerConversationEvents = (conversation) => {
        if (!conversation) return;
        activeConversationRef.current = conversation;

        // Jab conversation (call) me koi bhi change aaye (Answer, Hangup, Cancel, Reject)
        conversation.on('member:state', (member, event) => {
            if (!isMountedRef.current) return;
            
            const state = (event?.body?.status || member.state || "").toLowerCase();
            const memberId = member.id;
            const myMemberId = conversation.me?.id;

            console.log(`Conversation Member State Changed [Member: ${memberId}]:`, state);

            // 1. CALL CONNECTED (Attended / Answered)
            if (['answered', 'joined'].includes(state)) {
                console.log("Call was answered by destination!");
                stopAllSounds();
                // Audio stream attach karna zaroori hai tabhi awaz aayegi
                if (activeCallRef.current) attachAudioStream(activeCallRef.current);
                
                setCallState(prev => ({
                    ...prev,
                    status: 'active'
                }));
            }
            
            // 2. CALL DISCONNECTED (Client cut call, Rejected, Completed, or Timeout)
            if (['left', 'completed', 'rejected', 'failed', 'busy', 'timeout', 'unanswered', 'canceled'].includes(state)) {
                // Agar doosra banda left kar gaya ya call end ho gayi
                console.log("Call disconnected from client side. Cleaning up UI...");
                cleanUpCallState();
            }
        });
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

                // INBOUND CALLS (Customer Call To Us)
                clientApp.on("member:call", (member, call) => {
                    if (call.direction === "inbound") {
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
                            ringtoneAudioRef.current.play().catch(e => console.log("Ringtone error:", e));
                        }

                        // Conversation events connect karein
                        registerConversationEvents(call.conversation);
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

    // OUTBOUND CALLS (We Call Customer)
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
            return alert("Microphone ki permission required hai!");
        }

        const formattedNumber = phoneNumber.replace(/\D/g, '');
        setCallState({ status: 'ringing', phoneNumber: formattedNumber, clientName, isMuted: false });
        setShowCallWidget(true);

        if (ringbackAudioRef.current) {
            ringbackAudioRef.current.loop = true;
            ringbackAudioRef.current.play().catch(e => console.log("Ringing sound error:", e));
        }

        try {
            // Outbound Call initiate ki
            const call = await voiceAppRef.current.callServer(formattedNumber, 'phone', {
                number: formattedNumber
            });
            activeCallRef.current = call;

            call.on('member:media', (member, event) => {
                attachAudioStream(call);
            });

            // Is call ki conversation ke events monitor karein (Connect/Disconnect tracking)
            if (call.conversation) {
                registerConversationEvents(call.conversation);
            }

            // Call Level Direct Status Fallback listeners
            call.on('status:changed', (status) => {
                const s = status.toLowerCase();
                console.log("Direct Call Status Changed:", s);

                if (['answered', 'joined', 'active'].includes(s)) {
                    stopAllSounds();
                    attachAudioStream(call);
                    setCallState(prev => ({ ...prev, status: 'active' }));
                } 
                else if (['completed', 'rejected', 'failed', 'busy', 'timeout', 'unanswered', 'left', 'cancelled'].includes(s)) {
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
        console.log("Manual end call triggered by agent");
        const call = activeCallRef.current;
        cleanUpCallState(); // UI ko fauran reset karein

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