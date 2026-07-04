import React, { useState, useEffect, useRef } from 'react';
import { useCall } from '../context/CallingContext';

const GlobalCallWidget = () => {
    const { callState, showCallWidget, setShowCallWidget, answerCall, endCall, toggleMute } = useCall();
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const timerRef = useRef(null);

    const themeColor = '#34497e';

    // --- Call Duration Timer (sirf 'active' status ke dauran chalta hai) ---
    useEffect(() => {
        if (callState.status === 'active') {
            timerRef.current = setInterval(() => {
                setElapsedSeconds(prev => prev + 1);
            }, 1000);
        } else {
            setElapsedSeconds(0);
            if (timerRef.current) clearInterval(timerRef.current);
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [callState.status]);

    const formatDuration = (totalSeconds) => {
        const mins = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const secs = (totalSeconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    // --- Agar call idle hai to kuch bhi render na karein ---
    if (callState.status === 'idle') return null;

    // --- Minimized State: Chhota floating bubble dikhayein taake restore ho sake ---
    if (!showCallWidget) {
        return (
            <div
                onClick={() => setShowCallWidget(true)}
                className="position-fixed d-flex align-items-center gap-2 shadow-lg text-white"
                style={{
                    bottom: '30px',
                    right: '30px',
                    zIndex: 9999,
                    backgroundColor: themeColor,
                    borderRadius: '30px',
                    padding: '10px 18px',
                    cursor: 'pointer',
                    boxShadow: '0px 8px 20px rgba(0,0,0,0.25)'
                }}
                title="Call par wapis jayein"
            >
                <i className="bi bi-telephone-fill fs-6"></i>
                <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>
                    {callState.status === 'active' ? formatDuration(elapsedSeconds) : 'Call Active'}
                </span>
            </div>
        );
    }

    return (
        <div
            className="card border-0 shadow-lg position-fixed text-white text-center p-4"
            style={{
                bottom: '30px',
                right: '30px',
                width: '340px',
                zIndex: 9999, // Hamesha top layouts par render ho
                borderRadius: '20px',
                backgroundColor: themeColor,
                boxShadow: '0px 10px 30px rgba(0, 0, 0, 0.25)'
            }}
        >
            {/* Top Bar Indicator */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <span className="badge rounded-pill bg-light text-dark px-3 py-1" style={{ fontSize: '0.75rem', fontWeight: '600' }}>
                    {callState.status === 'incoming' && '🔔 Incoming Call'}
                    {callState.status === 'ringing' && '⏳ Ringing...'}
                    {callState.status === 'active' && `🟢 ${formatDuration(elapsedSeconds)}`}
                </span>

                {/* Minimize Layout Trigger — ab ringing aur active dono me available */}
                {(callState.status === 'active' || callState.status === 'ringing') && (
                    <button
                        className="btn btn-sm text-white opacity-75 p-0 border-0 shadow-none"
                        onClick={() => setShowCallWidget(false)}
                        title="Minimize Widget"
                    >
                        <i className="bi bi-dash-lg fs-4"></i>
                    </button>
                )}
            </div>

            {/* Client Visual Avatar Profiler */}
            <div className="my-3">
                <div
                    className="rounded-circle bg-white text-dark d-flex align-items-center justify-content-center mx-auto mb-3 shadow-sm"
                    style={{ width: '70px', height: '70px', backgroundColor: 'rgba(255,255,255,0.15)' }}
                >
                    <i className="bi bi-person-fill fs-2" style={{ color: themeColor }}></i>
                </div>
                <h5 className="fw-bold mb-1 text-white">{callState.clientName || 'Unknown Customer'}</h5>
                <p className="small opacity-75 mb-0">{callState.phoneNumber}</p>
            </div>

            {/* Live Timer or Network Details */}
            {callState.status === 'active' && (
                <div className="small opacity-50 mb-3">
                    Call in progress
                </div>
            )}

            {/* Core Action Call Handlers */}
            <div className="d-flex justify-content-center gap-3 align-items-center mt-3">

                {/* 1. Answer Incoming Call Structure */}
                {callState.status === 'incoming' && (
                    <button
                        className="btn btn-success rounded-circle p-0 d-flex align-items-center justify-content-center shadow"
                        style={{ width: '55px', height: '55px' }}
                        onClick={answerCall}
                        title="Answer Call"
                    >
                        <i className="bi bi-telephone-fill fs-5 text-white"></i>
                    </button>
                )}

                {/* 2. Audio Mic Mute Control Toggles */}
                {callState.status === 'active' && (
                    <button
                        className={`btn rounded-circle p-0 d-flex align-items-center justify-content-center shadow-none ${callState.isMuted ? 'btn-warning text-dark' : 'btn-outline-light text-white'}`}
                        style={{ width: '50px', height: '50px', border: callState.isMuted ? 'none' : '2px solid rgba(255,255,255,0.4)' }}
                        onClick={toggleMute}
                        title={callState.isMuted ? "Unmute Mic" : "Mute Mic"}
                    >
                        <i className={`bi bi-mic-${callState.isMuted ? 'mute-' : ''}fill fs-5`}></i>
                    </button>
                )}

                {/* 3. Reject / Cancel / Disconnect Call Button — ab teeno states me kaam karta hai */}
                <button
                    className="btn btn-danger rounded-circle p-0 d-flex align-items-center justify-content-center shadow"
                    style={{ width: '55px', height: '55px' }}
                    onClick={endCall}
                    title={
                        callState.status === 'ringing' ? "Cancel Call" :
                        callState.status === 'incoming' ? "Reject Call" :
                        "End Call"
                    }
                >
                    <i className="bi bi-telephone-x-fill fs-5 text-white"></i>
                </button>
            </div>
        </div>
    );
};

export default GlobalCallWidget;