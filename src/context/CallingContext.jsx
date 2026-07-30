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

    const stopAllSounds = () => {
        console.log("Stopping all sound effects...");
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

    // Laravel Echo Setup (FIXED EVENT BINDING)
    useEffect(() => {
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
            console.log("[Pusher Remote Status Received]:", data);
            const status = (data?.status || data?.call_status || '').toLowerCase();
            
            if (['answered', 'connected'].includes(status)) {
                stopAllSounds();
                setCallState(prev => ({ ...prev, status: 'active' }));
            }

            // Expanded End States
            const endStates = ['completed', 'busy', 'cancelled', 'timeout', 'rejected', 'failed', 'no-answer', 'unanswered', 'disconnected', 'remote_busy'];
            if (endStates.includes(status)) {
                console.log(`[Pusher] Forcing cleanup for remote status: ${status}`);
                cleanUpCallState(`Pusher Webhook Event: ${status}`);
            }
        };

        // Standard laravel-echo event listeners
        channel.listen('CallStatusUpdated', handleCallStatusUpdate);
        channel.listen('.CallStatusUpdated', handleCallStatusUpdate);

    } catch (error) {
        console.error("Echo Setup Error:", error);
    }

    return () => {
        if (echoInstanceRef.current) {
            echoInstanceRef.current.leaveChannel('vonage-calls');
        }
    };
}, []);

    const attachAudioStream = (call) => {
        if (!call) return;
        console.log("Attaching audio stream...");
        
        const stream = call.htmlAudio?.srcObject || call.stream;
        if (stream && remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = stream;
        } else if (typeof call.setAudioElement === 'function' && remoteAudioRef.current) {
            call.setAudioElement(remoteAudioRef.current);
        }
    };

    // FIXED: Direct Event Binding on Vonage Call Object
    const bindDirectCallEvents = (call) => {
    if (!call) return;
    console.log("Binding robust direct event listeners on call instance...", call);

    const handleCallAnswered = () => {
        console.log("[Call State] Answered! Transitioning UI to active.");
        stopAllSounds();
        attachAudioStream(call);
        setCallState(prev => ({ ...prev, status: 'active' }));
    };

    const handleCallEnded = (reason) => {
        console.log(`[Call State] Call Terminated via Event: ${reason}`);
        cleanUpCallState(`Call ended via ${reason}`);
    };

    // 1. Media & Connection
    call.on('member:media', () => attachAudioStream(call));

    // 2. Answer / Connection States
    call.on('member:joined', handleCallAnswered);
    call.on('member:updated', (member) => {
        const state = (member?.state || '').toLowerCase();
        if (['answered', 'joined', 'ready'].includes(state)) {
            handleCallAnswered();
        } else if (['left', 'hungup', 'rejected', 'failed', 'busy'].includes(state)) {
            handleCallEnded(`member:updated state -> ${state}`);
        }
    });

    // 3. Vonage SDK Core Disconnect Events (Crucial for User Cut / Busy)
    call.on('rtc:hangup', () => handleCallEnded('rtc:hangup'));
    call.on('member:left', () => handleCallEnded('member:left'));
    call.on('call:ended', () => handleCallEnded('call:ended'));
    call.on('sip:hangup', () => handleCallEnded('sip:hangup'));

    // 4. Leg Status Updates (Outbound PSTN Legs)
    call.on('leg:status:update', (leg) => {
        console.log("Leg Status Update received:", leg);
        const status = (leg?.status || leg?.detail || '').toLowerCase();
        
        if (['answered'].includes(status)) {
            handleCallAnswered();
        } else if (['completed', 'busy', 'rejected', 'cancelled', 'failed', 'remote_busy', 'hangup'].includes(status)) {
            handleCallEnded(`leg status -> ${status}`);
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

                const nexmo = new NexmoClient({ debug: true });
                nexmoClientRef.current = nexmo;

                clientApp = await nexmo.createSession(response.data.token);
                voiceAppRef.current = clientApp;   

                if (!isMountedRef.current) return;

                // INBOUND CALLS
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
                            ringtoneAudioRef.current.play().catch(e => console.log("Ringtone play error:", e));
                        }

                        bindDirectCallEvents(call);
                    }
                });

                // OUTBOUND CALLS
                clientApp.on("call:created", (call) => {
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

    // OUTBOUND CALL TRIGGER
    const makeCall = async (phoneNumber, clientName) => {
        if (!voiceAppRef.current || !phoneNumber || callState.status !== 'idle') return;

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            alert("Microphone permission is required!");
            return;
        }

        const formattedNumber = phoneNumber.replace(/\D/g, '');
        
        setCallState({ 
            status: 'ringing', 
            phoneNumber: formattedNumber, 
            clientName: clientName || 'Customer', 
            isMuted: false 
        });
        setShowCallWidget(true);

        if (ringbackAudioRef.current) {
            ringbackAudioRef.current.loop = true;
            ringbackAudioRef.current.play().catch(e => console.log("Ringing play error:", e));
        }

        try {
            console.log(`Placing Outbound Call to: ${formattedNumber}`);
            
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