import React, { useState, useEffect, useRef } from 'react';
import { useCall } from '../context/CallingContext'; 

const GlobalCallWidget = () => {
    const { callState, showCallWidget, setShowCallWidget, answerCall, endCall, toggleMute } = useCall();
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef(null);

    const themeColor = '#1e293b';

    const renderText = (val, fallback = '') => {
        if (!val) return fallback;
        if (typeof val === 'string' || typeof val === 'number') return String(val);
        if (typeof val === 'object') {
            return val.display_name || val.name || val.number || fallback;
        }
        return fallback;
    };

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

    // Don't render anything if call is idle
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

    const getStatusBadge = () => {
        if (isIncoming) return '🔔 Incoming Call';
        if (isRinging) return '🔔 Phone Ringing...';
        if (isActive) return `🟢 Connected (${formatDuration(elapsedSeconds)})`;
        if (isCalling) return '📞 Initiating Call...';
        return 'Connecting...';
    };

    const displayName = renderText(callState.clientName, 'Customer');
    const displayPhone = renderText(callState.phoneNumber, 'Private Number');

    // Minimized Mode
    if (!showCallWidget) {
        return (
            <div
                onClick={() => setShowCallWidget(true)}
                className="position-fixed d-flex align-items-center gap-3 shadow-lg text-white"
                style={{
                    bottom: '30px',
                    right: '30px',
                    zIndex: 9999,
                    backgroundColor: isActive ? '#10b981' : isRinging ? '#06b6d4' : isIncoming ? '#f59e0b' : '#3b82f6',
                    borderRadius: '50px',
                    padding: '12px 24px',
                    cursor: 'pointer',
                    boxShadow: '0px 10px 25px rgba(0,0,0,0.3)',
                    transition: 'all 0.3s ease'
                }}
            >
                <i className={`bi ${isActive ? 'bi-telephone-fill' : 'bi-telephone-outbound-fill'} fs-5`}></i>
                <div className="d-flex flex-column align-items-start">
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', lineHeight: '1.1' }}>
                        {displayName}
                    </span>
                    <small style={{ fontSize: '0.75rem', opacity: 0.9 }}>
                        {getStatusBadge()}
                    </small>
                </div>
            </div>
        );
    }

    // Expanded Overlay Mode
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
            {/* Header Status */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <span className={`badge rounded-pill px-3 py-2 d-flex align-items-center gap-2 ${
                    isActive ? 'bg-success text-white' : isRinging ? 'bg-info text-dark' : isIncoming ? 'bg-warning text-dark' : 'bg-primary text-white'
                }`} style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                    {!isActive && <span className="spinner-grow spinner-grow-sm" role="status"></span>}
                    {getStatusBadge()}
                </span>

                <button
                    className="btn btn-sm text-white-50 p-0 border-0 shadow-none"
                    onClick={() => setShowCallWidget(false)}
                    title="Minimize"
                >
                    <i className="bi bi-dash-lg fs-4"></i>
                </button>
            </div>

            {/* Caller Profile */}
            <div className="text-center my-3">
                <div
                    className="rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 shadow position-relative"
                    style={{
                        width: '80px',
                        height: '80px',
                        backgroundColor: isActive ? '#059669' : isRinging ? '#0891b2' : '#334155',
                        transition: 'background-color 0.4s ease'
                    }}
                >
                    <i className="bi bi-person-fill fs-1 text-white"></i>
                </div>

                <h5 className="fw-bold mb-1 text-white text-truncate">{displayName}</h5>
                <p className="text-white-50 small mb-0 font-monospace">{displayPhone}</p>
            </div>

            {/* Subtitle Message */}
            <div className="text-center mb-4" style={{ height: '20px' }}>
                {isActive && <p className="text-success small fw-semibold mb-0">Call in progress</p>}
                {isRinging && <p className="text-info small fw-semibold mb-0">Ringing client device...</p>}
                {isCalling && <p className="text-white-50 small mb-0">Connecting to server...</p>}
                {isIncoming && <p className="text-warning small mb-0 fw-bold">Incoming Voice Call</p>}
            </div>

            {/* Controls */}
            <div className="d-flex justify-content-center gap-3 align-items-center">
                {isIncoming && (
                    <button
                        className="btn btn-success rounded-circle p-0 d-flex align-items-center justify-content-center shadow-lg"
                        style={{ width: '60px', height: '60px' }}
                        onClick={answerCall}
                    >
                        <i className="bi bi-telephone-fill fs-4 text-white"></i>
                    </button>
                )}

                {isActive && (
                    <button
                        className={`btn rounded-circle p-0 d-flex align-items-center justify-content-center ${
                            callState.isMuted ? 'btn-warning text-dark' : 'btn-outline-light text-white'
                        }`}
                        style={{ width: '52px', height: '52px' }}
                        onClick={toggleMute}
                    >
                        <i className={`bi bi-mic-${callState.isMuted ? 'mute-' : ''}fill fs-5`}></i>
                    </button>
                )}

                <button
                    className="btn btn-danger rounded-circle p-0 d-flex align-items-center justify-content-center shadow-lg"
                    style={{ width: '60px', height: '60px' }}
                    onClick={endCall}
                >
                    <i className="bi bi-telephone-x-fill fs-4 text-white"></i>
                </button>
            </div>
        </div>
    );
};

export default GlobalCallWidget;