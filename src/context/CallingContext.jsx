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

    // Remote Voice Audio Stream Setup
    useEffect(() => {
        isMountedRef.current = true;

        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        remoteAudioRef.current = audioEl;
        document.body.appendChild(audioEl);

        return () => {
            isMountedRef.current = false;
            cleanUpCallState("Component Unmounted");
            if (audioEl) audioEl.remove();
        };
    }, []);

    const cleanUpCallState = (reason = "Unknown Reason") => {
        console.log(`[Call Cleanup] Reason: ${reason}`);
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

    // Attach WebRTC Remote Audio Stream
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

    // Laravel Echo / Pusher Webhook Listener
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
                
                if (status === 'ringing') {
                    setCallState(prev => ({ ...prev, status: 'ringing' }));
                } else if (['answered', 'connected'].includes(status)) {
                    setCallState(prev => ({ ...prev, status: 'active' }));
                }

                // Call Termination States
                const endStates = ['completed', 'busy', 'cancelled', 'timeout', 'rejected', 'failed', 'no-answer', 'unanswered', 'disconnected', 'remote_busy'];
                if (endStates.includes(status)) {
                    console.log(`[Pusher] Cleaning up call for status: ${status}`);
                    cleanUpCallState(`Pusher Event: ${status}`);
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

    // Direct Event Binding on Call Instance
    const bindDirectCallEvents = (call) => {
        if (!call) return;
        console.log("Binding direct event listeners on call instance...", call);

        const handleCallAnswered = () => {
            console.log("[Call State] Call Answered.");
            attachAudioStream(call);
            setCallState(prev => ({ ...prev, status: 'active' }));
        };

        const handleCallEnded = (reason) => {
            console.log(`[Call State] Call Terminated: ${reason}`);
            cleanUpCallState(`Direct Event: ${reason}`);
        };

        call.on('member:media', () => attachAudioStream(call));
        call.on('member:joined', handleCallAnswered);

        call.on('member:updated', (member) => {
            const state = (member?.state || '').toLowerCase();
            if (['answered', 'joined', 'ready'].includes(state)) {
                handleCallAnswered();
            } else if (['ringing'].includes(state)) {
                setCallState(prev => ({ ...prev, status: 'ringing' }));
            } else if (['left', 'hungup', 'rejected', 'failed', 'busy'].includes(state)) {
                handleCallEnded(`member:updated -> ${state}`);
            }
        });

        call.on('rtc:hangup', () => handleCallEnded('rtc:hangup'));
        call.on('member:left', () => handleCallEnded('member:left'));
        call.on('call:ended', () => handleCallEnded('call:ended'));
        call.on('sip:hangup', () => handleCallEnded('sip:hangup'));

        call.on('leg:status:update', (leg) => {
            console.log("Leg Status Update:", leg);
            const status = (leg?.status || leg?.detail || '').toLowerCase();
            
            if (status === 'ringing') {
                setCallState(prev => ({ ...prev, status: 'ringing' }));
            } else if (['answered'].includes(status)) {
                handleCallAnswered();
            } else if (['completed', 'busy', 'rejected', 'cancelled', 'failed', 'remote_busy', 'hangup'].includes(status)) {
                handleCallEnded(`leg status -> ${status}`);
            }
        });
    };

    // Initialize Vonage SDK Client
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

                // INBOUND CALL HANDLING
                const handleIncomingCall = (member, call) => {
                    const callObj = call || member;
                    console.log("[Inbound Call Received]:", callObj);

                    activeCallRef.current = callObj;
                    setCallState({
                        status: 'incoming',
                        phoneNumber: callObj?.from || callObj?.conversation?.display_name || 'Customer',
                        clientName: "Incoming Call",
                        isMuted: false
                    });
                    setShowCallWidget(true);
                    bindDirectCallEvents(callObj);
                };

                clientApp.on("member:call", handleIncomingCall);
                clientApp.on("call:incoming", handleIncomingCall);

                // OUTBOUND CALL HANDLING
                clientApp.on("call:created", (call) => {
                    activeCallRef.current = call;
                    bindDirectCallEvents(call);
                });

            } catch (error) {
                console.error("Vonage Voice Client Initialization Failed:", error);
            }
        };

        initVonageClient();
    }, []);

    // PlACEMENT OF OUTBOUND CALL
    const makeCall = async (phoneNumber, clientName) => {
        if (!voiceAppRef.current || !phoneNumber || callState.status !== 'idle') return;

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            alert("Microphone permission is required!");
            return;
        }

        const formattedNumber = phoneNumber.replace(/\D/g, '');
        
        // Initial state: Calling
        setCallState({ 
            status: 'calling', 
            phoneNumber: formattedNumber, 
            clientName: clientName || 'Customer', 
            isMuted: false 
        });
        setShowCallWidget(true);

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