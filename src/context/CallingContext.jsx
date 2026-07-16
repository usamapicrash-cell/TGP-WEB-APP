import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import NexmoClient from 'nexmo-client';
import api from '../api/axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// 1. Pusher globally bind karein
window.Pusher = Pusher;

// 2. Laravel Echo instance create karein jo .env variables use karega
const echoInstance = new Echo({
    broadcaster: 'pusher',
    key: import.meta.env.VITE_PUSHER_APP_KEY || '355c9972a93b7b6dc813',
    cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER || 'ap2',
    forceTLS: true
});

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

    // 3. Pusher (Laravel Echo) Webhook Listener
    // Jab backend (Laravel) par completed/busy ka webhook aayega, yeh real-time trigger hoga
    useEffect(() => {
        console.log("Connecting to Pusher Channel: vonage-calls...");
        const channel = echoInstance.channel('vonage-calls');
        
        channel.listen('.CallStatusUpdated', (data) => {
            console.log("Real-time call status received via Pusher:", data);
            
            const endStates = ['completed', 'busy', 'cancelled', 'timeout', 'rejected', 'failed'];
            if (endStates.includes(data.status)) {
                console.log(`[Pusher] Call ended remotely with status: ${data.status}`);
                cleanUpCallState(`Pusher remote status: ${data.status}`);
            }
        });

        return () => {
            echoInstance.leaveChannel('vonage-calls');
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

    // Global Conversation/Member event listener
    const listenToGlobalSessionEvents = (session) => {
        if (!session) return;

        session.on("conversation:member:joined", (member, event) => {
            console.log("Global Member Joined Session:", member);
        });

        session.on("conversation:member:left", (member, event) => {
            console.log("Global Member Left Session:", member);
            cleanUpCallState("Client disconnected (left session)");
        });
    };

    // Call ke direct events bind karne ka safe tarika
    const bindDirectCallEvents = (call) => {
        if (!call) return;

        // WebRTC stream ready hone par stream attach karein
        call.on('member:media', (member, event) => {
            console.log("Media stream event triggered");
            attachAudioStream(call);
        });

        // State change tracking
        call.on('member:state', (member, event) => {
            const state = (event?.body?.status || member.state || "").toLowerCase();
            console.log(`[Call Member State Update]: ${state}`);

            if (['answered', 'joined'].includes(state)) {
                stopAllSounds();
                attachAudioStream(call);
                
                setCallState(prev => ({
                    ...prev,
                    status: 'active'
                }));
            } 
            else if (['left', 'completed', 'rejected', 'failed', 'busy', 'timeout', 'unanswered', 'canceled'].includes(state)) {
                cleanUpCallState(`Call state ended with: ${state}`);
            }
        });

        // Vonage SIP levels status tracking
        call.on('status:changed', (status) => {
            const s = status.toLowerCase();
            console.log(`[Call Status Changed]: ${s}`);

            if (['answered', 'joined', 'active'].includes(s)) {
                stopAllSounds();
                attachAudioStream(call);
                setCallState(prev => ({ ...prev, status: 'active' }));
            } 
            else if (['completed', 'rejected', 'failed', 'busy', 'timeout', 'unanswered', 'left', 'cancelled'].includes(s)) {
                cleanUpCallState(`Status changed to: ${s}`);
            }
        });
    };

    // Vonage Client Initialization
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
            console.warn("Voice server abhi tayyar nahi hai.");
            return;
        }
        if (!phoneNumber) return;
        if (callState.status !== 'idle') return;

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            console.error("Mic Error:", err);
            alert("Microphone permission are required to place calls!");
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
            const call = await voiceAppRef.current.callServer(formattedNumber, 'phone', {
                number: formattedNumber
            });
            activeCallRef.current = call;

            bindDirectCallEvents(call);

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
        
        // Instant React UI cleanup so there is no lag
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