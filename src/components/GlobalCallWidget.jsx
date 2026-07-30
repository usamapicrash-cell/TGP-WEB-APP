import React, { useState, useEffect, useRef } from 'react';
import { useCall } from '../context/CallingContext'; // Path verify kar lein

const GlobalCallWidget = () => {
    const { callState, showCallWidget, setShowCallWidget, answerCall, endCall, toggleMute } = useCall();
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef(null);

    const themeColor = '#1e293b';

    // Timer for active connected call
    useEffect(() => {
        if (callState.status === 'active') {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            setElapsedSeconds(0);
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        }

        return () => {
            if (timerRef.current) {
                clearInterval(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [callState.status]);

    if (!callState || callState.status === 'idle') {
        return null;
    }

    const formatDuration = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const secs = (totalSeconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    const isActive = callState.status === 'active';
    const isCalling = callState.status === 'calling';
    const isRinging = callState.status === 'ringing';
    const isIncoming = callState.status === 'incoming';

    // Status Label Helper
    const getStatusBadge = () => {
        if (isIncoming) return '🔔 Incoming Call';
        if (isCalling) return '📞 Calling Customer...';
        if (isRinging) return '🔔 Ringing...';
        if (isActive) return `🟢 Connected (${formatDuration(elapsedSeconds)})`;
        return 'Connecting...';
    };

    // --- STAGE 1: Minimized Floating Pill ---
    if (!showCallWidget) {
        return (
            <div
                onClick={() => setShowCallWidget(true)}
                className="position-fixed d-flex align-items-center gap-3 shadow-lg text-white"
                style={{
                    bottom: '30px',
                    right: '30px',
                    zIndex: 9999,
                    backgroundColor: isActive ? '#10b981' : isIncoming ? '#f59e0b' : '#3b82f6',
                    borderRadius: '50px',
                    padding: '12px 24px',
                    cursor: 'pointer',
                    boxShadow: '0px 10px 25px rgba(0,0,0,0.3)',
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
            >
                <i className={`bi ${isActive ? 'bi-telephone-fill' : 'bi-telephone-outbound-fill'} fs-5`}></i>
                <div className="d-flex flex-column align-items-start">
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', lineHeight: '1.1' }}>
                        {callState.clientName || 'Customer'}
                    </span>
                    <small style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                        {getStatusBadge()}
                    </small>
                </div>
            </div>
        );
    }

    // --- STAGE 2: Expanded Call Interface ---
    return (
        <div
            className="card border-0 shadow-lg position-fixed text-white p-4"
            style={{
                bottom: '30px',
                right: '30px',
                width: '350px',
                zIndex: 9999,
                borderRadius: '24px',
                backgroundColor: themeColor,
                boxShadow: '0px 20px 40px rgba(0, 0, 0, 0.4)',
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease-in-out'
            }}
        >
            {/* Header */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <span className={`badge rounded-pill px-3 py-2 d-flex align-items-center gap-2 ${
                    isActive ? 'bg-success text-white' : isIncoming ? 'bg-warning text-dark' : 'bg-primary text-white'
                }`} style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                    {!isActive && <span className="spinner-grow spinner-grow-sm" role="status"></span>}
                    {getStatusBadge()}
                </span>

                <button
                    className="btn btn-sm text-white-50 p-0 border-0 shadow-none hover-white"
                    onClick={() => setShowCallWidget(false)}
                    title="Minimize"
                >
                    <i className="bi bi-dash-lg fs-4"></i>
                </button>
            </div>

            {/* Caller Details & Avatar */}
            <div className="text-center my-3">
                <div
                    className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 shadow position-relative"
                    style={{
                        width: '80px',
                        height: '80px',
                        backgroundColor: isActive ? '#059669' : '#334155',
                        transition: 'background-color 0.4s ease'
                    }}
                >
                    <i className="bi bi-person-fill fs-1 text-white"></i>
                </div>

                <h5 className="fw-bold mb-1 text-white text-truncate">{callState.clientName || 'Customer'}</h5>
                <p className="text-white-50 small mb-0 font-monospace">{callState.phoneNumber || 'Private Number'}</p>
            </div>

            {/* Subtitle Message */}
            <div className="text-center mb-4" style={{ height: '20px' }}>
                {isActive && <p className="text-success small fw-semibold mb-0">Call in progress</p>}
                {isCalling && <p className="text-white-50 small mb-0">Initiating connection...</p>}
                {isRinging && <p className="text-info small mb-0">Ringing on customer's phone...</p>}
                {isIncoming && <p className="text-warning small mb-0 font-weight-bold">Incoming Voice Call</p>}
            </div>

            {/* Call Action Controls */}
            <div className="d-flex justify-content-center gap-3 align-items-center">

                {/* Answer Button (Only for Inbound Calls) */}
                {isIncoming && (
                    <button
                        className="btn btn-success rounded-circle p-0 d-flex align-items-center justify-content-center shadow-lg"
                        style={{ width: '60px', height: '60px' }}
                        onClick={answerCall}
                        title="Answer Call"
                    >
                        <i className="bi bi-telephone-fill fs-4 text-white"></i>
                    </button>
                )}

                {/* Mute Button (Only for Active Calls) */}
                {isActive && (
                    <button
                        className={`btn rounded-circle p-0 d-flex align-items-center justify-content-center transition-all ${
                            callState.isMuted ? 'btn-warning text-dark' : 'btn-outline-light text-white'
                        }`}
                        style={{ width: '52px', height: '52px' }}
                        onClick={toggleMute}
                        title={callState.isMuted ? "Unmute Microphone" : "Mute Microphone"}
                    >
                        <i className={`bi bi-mic-${callState.isMuted ? 'mute-' : ''}fill fs-5`}></i>
                    </button>
                )}

                {/* Reject / Hangup / Cancel Button */}
                <button
                    className="btn btn-danger rounded-circle p-0 d-flex align-items-center justify-content-center shadow-lg"
                    style={{ width: '60px', height: '60px' }}
                    onClick={endCall}
                    title={isIncoming ? "Reject Call" : "End Call"}
                >
                    <i className="bi bi-telephone-x-fill fs-4 text-white"></i>
                </button>
            </div>
        </div>
    );
};

export default GlobalCallWidget;