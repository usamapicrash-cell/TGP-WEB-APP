import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import NexmoClient from 'nexmo-client';
import api from '../api/axios';
import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

window.Pusher = Pusher;

const CallContext = createContext();

export const CallProvider = ({ children }) => {
    const [callState, setCallState] = useState({
        status: 'idle', // idle | calling | ringing | incoming | active
        phoneNumber: null,
        clientName: null,
        isMuted: false,
    });
    const [showCallWidget, setShowCallWidget] = useState(false);

    const nexmoClientRef = useRef(null);   
    const voiceAppRef = useRef(null);      
    const activeCallRef = useRef(null);
    const echoInstanceRef = useRef(null); 
    const remoteAudioRef = useRef(null);     
    const isMountedRef = useRef(true);
    const isCleaningUpRef = useRef(false);

    const callDirectionRef = useRef(null); // 'outbound' | 'inbound' | null

    const safeString = (val, fallback = '') => {
        if (!val) return fallback;
        if (typeof val === 'string') return val;
        if (typeof val === 'number') return String(val);
        if (typeof val === 'object') {
            return val.number || val.display_name || val.name || val.id || fallback;
        }
        return fallback;
    };

    useEffect(() => {
        isMountedRef.current = true;

        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        remoteAudioRef.current = audioEl;
        document.body.appendChild(audioEl);

        return () => {
            isMountedRef.current = false;
            if (audioEl) audioEl.remove();
        };
    }, []);

    const cleanUpCallState = (reason = "Unknown Reason") => {
        if (isCleaningUpRef.current) return;
        isCleaningUpRef.current = true;
        callDirectionRef.current = null;

        console.log(`[Call Cleanup] Executing -> Reason: ${reason}`);

        if (activeCallRef.current) {
            try {
                if (typeof activeCallRef.current.off === 'function') {
                    activeCallRef.current.off('member:media');
                    activeCallRef.current.off('member:joined');
                    activeCallRef.current.off('member:updated');
                    activeCallRef.current.off('rtc:hangup');
                    activeCallRef.current.off('member:left');
                    activeCallRef.current.off('call:ended');
                    activeCallRef.current.off('sip:hangup');
                    activeCallRef.current.off('leg:status:update');
                }
            } catch (e) {
                console.log("Error unbinding call events:", e);
            }
            activeCallRef.current = null;
        }

        if (remoteAudioRef.current) {
            remoteAudioRef.current.srcObject = null;
        }

        if (isMountedRef.current) {
            setShowCallWidget(false);
            setCallState({ 
                status: 'idle', 
                phoneNumber: null, 
                clientName: null, 
                isMuted: false 
            });
        }

        setTimeout(() => {
            isCleaningUpRef.current = false;
        }, 150);
    };

    const attachAudioStream = (call) => {
        if (!call) return;
        try {
            const stream = call.htmlAudio?.srcObject || call.stream;
            if (stream && remoteAudioRef.current) {
                remoteAudioRef.current.srcObject = stream;
            } else if (typeof call.setAudioElement === 'function' && remoteAudioRef.current) {
                call.setAudioElement(remoteAudioRef.current);
            }
        } catch (err) {
            console.error("Audio stream attach error:", err);
        }
    };

    // Robust Status Parsing Helper for Webhook Payload Variations
    const parseEventStatus = (data) => {
        if (!data) return '';
        if (typeof data === 'string') return data.toLowerCase();
        const rawStatus = data.status || data.call_status || data.state || data.detail || (data.payload && data.payload.status) || '';
        return String(rawStatus).toLowerCase().trim();
    };

    // Laravel Echo / Pusher Listener (Bulletproof Event Catching)
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
                if (!isMountedRef.current) return;
                const status = parseEventStatus(data);
                console.log(`[Pusher Broadcaster Incoming] Extracted Status: "${status}"`, data);

                if (['ringing', 'ring'].includes(status)) {
                    setCallState(prev => ({ ...prev, status: 'ringing' }));
                } else if (['answered', 'connected', 'active'].includes(status)) {
                    setCallState(prev => ({ ...prev, status: 'active' }));
                }

                const endStates = [
                    'completed', 'busy', 'remote_busy', 'cancelled', 
                    'timeout', 'ring_timeout', 'rejected', 'failed', 
                    'no-answer', 'unanswered', 'disconnected', 'declined', 'hangup', 'ok'
                ];

                if (endStates.includes(status)) {
                    cleanUpCallState(`Pusher Broadcast Status: ${status}`);
                }
            };

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

    const bindDirectCallEvents = (call) => {
        if (!call || typeof call.on !== 'function') return;

        const handleCallAnswered = () => {
            if (!isMountedRef.current) return;
            console.log("[SDK Event] Call Answered & Media Connected");
            attachAudioStream(call);
            setCallState(prev => ({ ...prev, status: 'active' }));
        };

        const handleCallEnded = (reason) => {
            cleanUpCallState(`SDK Call Event -> ${reason}`);
        };

        try {
            call.on('member:media', () => attachAudioStream(call));

            call.on('member:updated', (member) => {
                if (!isMountedRef.current) return;
                const state = parseEventStatus(member);
                console.log(`[SDK member:updated] State: ${state}`);

                if (['answered', 'joined', 'connected'].includes(state)) {
                    handleCallAnswered();
                } else if (['ringing'].includes(state)) {
                    setCallState(prev => ({ ...prev, status: 'ringing' }));
                } else if (['left', 'hungup', 'rejected', 'failed', 'busy', 'completed', 'remote_busy'].includes(state)) {
                    handleCallEnded(`member:updated state = ${state}`);
                }
            });

            call.on('leg:status:update', (leg) => {
                if (!isMountedRef.current) return;
                const status = parseEventStatus(leg);
                console.log(`[SDK leg:status:update] Status: ${status}`);

                if (['ringing'].includes(status)) {
                    setCallState(prev => ({ ...prev, status: 'ringing' }));
                } else if (['answered', 'connected'].includes(status)) {
                    handleCallAnswered();
                } else if (['completed', 'busy', 'rejected', 'cancelled', 'failed', 'remote_busy', 'hangup', 'ok'].includes(status)) {
                    handleCallEnded(`leg:status = ${status}`);
                }
            });

            call.on('rtc:hangup', () => handleCallEnded('rtc:hangup'));
            call.on('member:left', () => handleCallEnded('member:left'));
            call.on('call:ended', () => handleCallEnded('call:ended'));
            call.on('sip:hangup', () => handleCallEnded('sip:hangup'));

        } catch (e) {
            console.error("Failed to bind direct call events:", e);
        }
    };

    // Initialize Vonage WebRTC Client
    useEffect(() => {
        let clientApp = null;

        const initVonageClient = async () => {
            try {
                const response = await api.get('/communications/voice-token');
                if (!response.data?.token || !isMountedRef.current) return;

                const nexmo = new NexmoClient({ debug: false });
                nexmoClientRef.current = nexmo;

                clientApp = await nexmo.createSession(response.data.token);
                voiceAppRef.current = clientApp;   

                if (!isMountedRef.current) return;

                const handleIncomingCall = (member, call) => {
                    if (callDirectionRef.current === 'outbound') {
                        return;
                    }

                    callDirectionRef.current = 'inbound';
                    const callObj = call || member;
                    activeCallRef.current = callObj;

                    const rawFrom = callObj?.from || callObj?.user?.name;
                    const parsedNumber = safeString(rawFrom, 'Incoming Call');

                    setCallState({
                        status: 'incoming',
                        phoneNumber: parsedNumber,
                        clientName: parsedNumber,
                        isMuted: false
                    });
                    setShowCallWidget(true);
                    bindDirectCallEvents(callObj);
                };

                clientApp.on("member:call", handleIncomingCall);
                clientApp.on("call:incoming", handleIncomingCall);

            } catch (error) {
                console.error("Vonage Voice Client Initialization Failed:", error);
            }
        };

        initVonageClient();
    }, []);

    // Outbound Call Handler
    const makeCall = async (phoneNumber, clientName) => {
        if (!voiceAppRef.current || !phoneNumber) return;

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            alert("Microphone permission is required!");
            return;
        }

        callDirectionRef.current = 'outbound';
        const formattedNumber = safeString(phoneNumber).replace(/\D/g, '');
        const targetDisplay = safeString(phoneNumber, 'Customer');
        
        setCallState({ 
            status: 'calling', 
            phoneNumber: formattedNumber, 
            clientName: targetDisplay, 
            isMuted: false 
        });
        setShowCallWidget(true);

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
        cleanUpCallState("User clicked end call"); 

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