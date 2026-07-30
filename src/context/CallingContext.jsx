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
    const activeConversationUuidRef = useRef(null);
    const echoInstanceRef = useRef(null);
    const remoteAudioRef = useRef(null);
    const isMountedRef = useRef(true);
    const isOutboundCallActiveRef = useRef(false);

    const safeString = (val, fallback = '') => {
        if (!val) return fallback;
        if (typeof val === 'string') return val;
        if (typeof val === 'number') return String(val);
        if (typeof val === 'object') {
            return val.number || val.display_name || val.name || val.id || fallback;
        }
        return fallback;
    };

    // 🔥 Forceful Instant State Reset
    const cleanUpCallState = (reason = "Unknown") => {
        console.log(`[Call Cleanup Triggered] -> Reason: ${reason}`);

        isOutboundCallActiveRef.current = false;
        activeConversationUuidRef.current = null;

        if (activeCallRef.current) {
            try {
                if (typeof activeCallRef.current.hangUp === 'function') activeCallRef.current.hangUp().catch(() => {});
                else if (typeof activeCallRef.current.hangup === 'function') activeCallRef.current.hangup();
                else if (typeof activeCallRef.current.reject === 'function') activeCallRef.current.reject();
            } catch (e) {
                console.warn("Call object disconnect exception:", e);
            }
            activeCallRef.current = null;
        }

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

    // 🔥 Normalizes status strings coming from backend/Pusher/SDK into 3 buckets
    const classifyStatus = (rawStatus) => {
        const s = (rawStatus || '').toLowerCase().trim();

        const ringingSet = ['ringing', 'ring'];
        const activeSet = ['answered', 'connected', 'active', 'joined'];
        const terminalSet = [
            'busy', 'remote_busy', 'completed', 'cancelled', 'canceled',
            'failed', 'rejected', 'timeout', 'no-answer', 'no_answer',
            'unanswered', 'hangup', 'hung-up', 'hung_up', 'declined',
            'left', 'expired'
        ];

        if (terminalSet.includes(s)) return 'terminal';
        if (activeSet.includes(s)) return 'active';
        if (ringingSet.includes(s)) return 'ringing';
        return 'unknown';
    };

    // PUSHER REALTIME LISTENERS
    useEffect(() => {
        isMountedRef.current = true;

        const audioEl = document.createElement('audio');
        audioEl.autoplay = true;
        remoteAudioRef.current = audioEl;
        document.body.appendChild(audioEl);

        try {
            const pusherKey = '355c9972a93b7b6dc813';
            const pusherCluster = 'ap2';

            if (!pusherKey || !pusherCluster) {
                console.error(
                    "[Pusher Config Missing] VITE_PUSHER_APP_KEY / VITE_PUSHER_APP_CLUSTER .env mein set nahi hain, " +
                    "ya build purana hai (Vite env vars build-time par bake hote hain — .env change ke baad rebuild karein)."
                );
            }

            if (!echoInstanceRef.current) {
                echoInstanceRef.current = new Echo({
                    broadcaster: 'pusher',
                    key: pusherKey,
                    cluster: pusherCluster,
                    forceTLS: true,
                    disableStats: true
                });

                try {
                    const pusherConn = echoInstanceRef.current.connector.pusher.connection;
                    pusherConn.bind('state_change', (states) => {
                        console.log(`[Pusher connection] ${states.previous} -> ${states.current} (key: ${pusherKey}, cluster: ${pusherCluster})`);
                    });
                } catch (e) {
                    console.warn("Could not attach Pusher connection debug listener:", e);
                }
            }

            const channel = echoInstanceRef.current.channel('vonage-calls');

            const handleCallStatusUpdate = (payload) => {
                if (!isMountedRef.current) return;

                const rawStatus = (payload?.status || '').toLowerCase().trim();
                const direction = (payload?.direction || '').toLowerCase().trim();
                console.log(`[Pusher Broadcast Captured] Status: "${rawStatus}" | Direction: "${direction}"`, payload);

                const bucket = classifyStatus(rawStatus);

                // 🔥 CRITICAL FIX:
                // "inbound" direction webhook events yahan asal mein AGENT KE APNE browser
                // leg ko represent karte hain (jab callServer() call hoti hai to Vonage
                // agent ko bhi ek member ki tarah conversation mein "inbound" leg se auto-join
                // karwa deta hai). Yeh CUSTOMER nahi hai — isliye is par "Ringing"/"Connected"
                // dikhana galat hai. Sirf "outbound" leg hi asal customer ki call hai.
                if (bucket === 'terminal') {
                    // Terminal status kisi bhi direction se aaye, cleanup zaroor karo
                    cleanUpCallState(`Pusher status: ${rawStatus} (${direction || 'unknown'})`);
                    return;
                }

                if (direction && direction !== 'outbound') {
                    console.log(`[Pusher] Ignored non-outbound leg status ("${direction}") - not the customer's call`);
                    return;
                }

                if (bucket === 'ringing') {
                    setCallState(prev => (prev.status === 'idle' ? prev : { ...prev, status: 'ringing' }));
                } else if (bucket === 'active') {
                    setCallState(prev => (prev.status === 'idle' ? prev : { ...prev, status: 'active' }));
                }
            };

            channel.listen('.CallStatusUpdated', handleCallStatusUpdate);
            channel.listen('CallStatusUpdated', handleCallStatusUpdate);

        } catch (error) {
            console.error("Echo Setup Error:", error);
        }

        return () => {
            isMountedRef.current = false;
            if (audioEl) audioEl.remove();
            if (echoInstanceRef.current) {
                echoInstanceRef.current.leaveChannel('vonage-calls');
            }
        };
    }, []);

    const bindDirectCallEvents = (call) => {
        if (!call || typeof call.on !== 'function') return;

        try {
            call.on('member:media', () => attachAudioStream(call));

            call.on('member:updated', (member) => {
                const state = (member?.state || member?.status || '').toLowerCase();
                console.log(`[SDK member:updated] state: ${state}`);
                const bucket = classifyStatus(state);
                if (bucket === 'active') {
                    attachAudioStream(call);
                    setCallState(prev => ({ ...prev, status: 'active' }));
                } else if (bucket === 'ringing') {
                    setCallState(prev => ({ ...prev, status: 'ringing' }));
                } else if (bucket === 'terminal') {
                    cleanUpCallState(`SDK member state: ${state}`);
                }
            });

            call.on('leg:status:update', (leg) => {
                const status = (leg?.status || leg?.state || '').toLowerCase();
                console.log(`[SDK leg:status] status: ${status}`);
                const bucket = classifyStatus(status);
                if (bucket === 'ringing') {
                    setCallState(prev => ({ ...prev, status: 'ringing' }));
                } else if (bucket === 'active') {
                    attachAudioStream(call);
                    setCallState(prev => ({ ...prev, status: 'active' }));
                } else if (bucket === 'terminal') {
                    cleanUpCallState(`SDK leg status: ${status}`);
                }
            });

            call.on('rtc:hangup', () => cleanUpCallState('rtc:hangup'));
            call.on('member:left', () => cleanUpCallState('member:left'));
            call.on('call:ended', () => cleanUpCallState('call:ended'));

        } catch (e) {
            console.error("Failed to bind call events:", e);
        }
    };

    // VONAGE CLIENT INITIALIZATION
    useEffect(() => {
        const initVonageClient = async () => {
            try {
                const response = await api.get('/communications/voice-token');
                if (!response.data?.token || !isMountedRef.current) return;

                const nexmo = new NexmoClient({ debug: false });
                nexmoClientRef.current = nexmo;

                const clientApp = await nexmo.createSession(response.data.token);
                voiceAppRef.current = clientApp;

                const handleIncomingCall = (member, call) => {
                    if (isOutboundCallActiveRef.current) {
                        console.log("[Vonage SDK] Ignored inbound leg (Outbound is active)");
                        return;
                    }

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
                console.error("Vonage WebRTC Init Failed:", error);
            }
        };

        initVonageClient();
    }, []);

    // Outbound Call Execution
    const makeCall = async (phoneNumber, clientName) => {
        if (!voiceAppRef.current || !phoneNumber) return;

        try {
            await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (err) {
            alert("Microphone permission required!");
            return;
        }

        const formattedNumber = safeString(phoneNumber).replace(/\D/g, '');
        const targetDisplay = safeString(clientName || phoneNumber, 'Customer');

        isOutboundCallActiveRef.current = true;

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
            if (call?.conversation?.id) {
                activeConversationUuidRef.current = call.conversation.id;
            }
            bindDirectCallEvents(call);

        } catch (error) {
            console.error("Call Server error:", error);
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
                    console.error("Answer Call error:", err);
                    cleanUpCallState("Answer exception");
                });
        }
    };

    // 🔥 Hard End Call (Instant UI Dismiss + Backend Sync)
    const endCall = () => {
        console.log("[User Clicked End Call]");
        cleanUpCallState("User clicked end call button");
    };

    const toggleMute = () => {
        if (activeCallRef.current && callState.status === 'active') {
            try {
                if (callState.isMuted) activeCallRef.current.unmute();
                else activeCallRef.current.mute();
                setCallState(prev => ({ ...prev, isMuted: !prev.isMuted }));
            } catch (e) {
                console.error('Mute error:', e);
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