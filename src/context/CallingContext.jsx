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
        if (call && remoteAudioRef.current) {
            const stream = call.htmlAudio?.srcObject || call.stream;
            if (stream) {
                remoteAudioRef.current.srcObject = stream;
            } else if (typeof call.setAudioElement === 'function') {
                call.setAudioElement(remoteAudioRef.current);
            }
        }
    };

    // Global Conversation/Member event listener jo pure Nexmo Session par listen karega
    const listenToGlobalSessionEvents = (session) => {
        if (!session) return;

        // Sabse important event jo user ke call uthane ya kaatne par triggers bhejta hai
        session.on("conversation:member:joined", (member, event) => {
            console.log("Global Member Joined Session:", member);
        });

        session.on("conversation:member:left", (member, event) => {
            console.log("Global Member Left Session:", member);
            alert("Client ne call cut kar di hai!");
            cleanUpCallState("Client disconnected (left session)");
        });
    };

    // Call ke direct events bind karne ka safe tarika
    const bindDirectCallEvents = (call) => {
        if (!call) return;

        // 1. WebRTC stream ready hone par stream attach karein
        call.on('member:media', (member, event) => {
            console.log("Media stream event triggered");
            attachAudioStream(call);
        });

        // 2. State change (Direct Call Member Update)
        call.on('member:state', (member, event) => {
            const state = (event?.body?.status || member.state || "").toLowerCase();
            console.log(`[Call Member State Update]: ${state}`);

            if (['answered', 'joined'].includes(state)) {
                stopAllSounds();
                attachAudioStream(call);
                
                // CLIENT NE CALL UTHALI
                alert("Client ne call utha li hai (Attended)!");

                setCallState(prev => ({
                    ...prev,
                    status: 'active'
                }));
            } 
            else if (['left', 'completed', 'rejected', 'failed', 'busy', 'timeout', 'unanswered', 'canceled'].includes(state)) {
                // CLIENT NE CALL CUT KI YA REJECT KI
                alert(`Call End ho gayi hai! Reason: ${state}`);
                cleanUpCallState(`Call state ended with: ${state}`);
            }
        });

        // 3. Status Changed (Vonage SIP levels status tracking)
        call.on('status:changed', (status) => {
            const s = status.toLowerCase();
            console.log(`[Call Status Changed]: ${s}`);

            if (['answered', 'joined', 'active'].includes(s)) {
                stopAllSounds();
                attachAudioStream(call);
                setCallState(prev => ({ ...prev, status: 'active' }));
            } 
            else if (['completed', 'rejected', 'failed', 'busy', 'timeout', 'unanswered', 'left', 'cancelled'].includes(s)) {
                alert(`Call disconnect ho gayi! (Status: ${s})`);
                cleanUpCallState(`Status changed to: ${s}`);
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

                // Session level tracking active karein
                listenToGlobalSessionEvents(clientApp);

                // INBOUND CALLS (Client Call To Us)
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

                        // Direct events bind karein
                        bindDirectCallEvents(call);
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
            // Outbound Call connect/fire karna
            const call = await voiceAppRef.current.callServer(formattedNumber, 'phone', {
                number: formattedNumber
            });
            activeCallRef.current = call;

            // Is outbound call par direct events/alerts register karein
            bindDirectCallEvents(call);

        } catch (error) {
            console.error("Failed to establish call:", error);
            alert("Call Server se connect nahi ho saki!");
            cleanUpCallState("Server call fail");
        }
    };

    const answerCall = () => {
        if (activeCallRef.current && callState.status === 'incoming') {
            stopAllSounds();

            activeCallRef.current.answer()
                .then(() => {
                    alert("Aapne Call Answer (Attend) kar li hai!");
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
        alert("Aapne call end/cut kar di!");
        
        const call = activeCallRef.current;
        cleanUpCallState("Agent ended call"); // UI foran reset karein

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