import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios'; // Apka axios instance
import { useCall } from '../../context/CallingContext';

const OrderCommunication = ({ phoneNumber, clientName }) => {
    const { makeCall } = useCall();
    const [viewType, setViewType] = useState(null); // 'sms' or null
    const [typedMessage, setTypedMessage] = useState('');
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const chatBodyRef = useRef(null);
    const themeColor = '#34497e';

    // --- SMS Fetch History ---
    const fetchSmsHistory = async () => {
        if (!phoneNumber) return;
        try {
            setLoading(true);
            const response = await api.get(`/communications/sms-history?phone=${phoneNumber}`);
            setMessages(response.data.messages || []);
            setUnreadCount(0);
        } catch (error) {
            console.error("Error fetching SMS history:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (viewType === 'sms') {
            fetchSmsHistory();
        }
    }, [viewType, phoneNumber]);

    useEffect(() => {
        if (chatBodyRef.current) {
            chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
        }
    }, [messages]);

    // Pusher real-time listener logic
    useEffect(() => {
        if (!phoneNumber) return;
        if (window.Echo) {
            window.Echo.private(`customer-sms.${phoneNumber}`)
                .listen('.SmsReceived', (e) => {
                    if (viewType === 'sms') {
                        setMessages((prev) => [...prev, e.message]);
                    } else {
                        setUnreadCount((prev) => prev + 1);
                    }
            });
        }
        return () => {
            if (window.Echo) {
                window.Echo.leave(`customer-sms.${phoneNumber}`);
            }
        };
    }, [phoneNumber, viewType]);

    // Handle Send SMS
    const handleSendMessage = async (e) => {
        e.preventDefault();
        if (!typedMessage.trim() || !phoneNumber) return;

        const tempText = typedMessage;
        setTypedMessage('');

        const placeholderMsg = {
            id: Date.now(),
            type: 'outgoing',
            text: tempText,
            status: 'sending',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setMessages((prev) => [...prev, placeholderMsg]);

        try {
            const response = await api.post('/communications/send-sms', {
                to: phoneNumber,
                message: tempText
            });

            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === placeholderMsg.id
                        ? { ...msg, status: response.data.status || 'sent', id: response.data.id }
                        : msg
                )
            );
        } catch (error) {
            const backendError = error.response?.data?.error || "Unknown server error";
            alert(`SMS Error: ${backendError}`);
            setMessages((prev) =>
                prev.map((msg) =>
                    msg.id === placeholderMsg.id ? { ...msg, status: 'failed' } : msg
                )
            );
        }
    };

    return (
        <div className="d-flex align-items-center gap-2 position-relative">
            {/* --- Call Button Trigger (Global Call Context) --- */}
            <button
                className="btn rounded-circle d-flex align-items-center justify-content-center bg-white shadow-sm"
                style={{
                    width: '40px', height: '40px', border: `1px solid #e2e8f0`,
                    color: themeColor
                }}
                onClick={() => makeCall(phoneNumber, clientName)}
                title="Call Customer"
            >
                <i className="bi bi-telephone fs-5"></i>
            </button>

            {/* --- SMS Button Trigger --- */}
            <button
                className="btn rounded-circle d-flex align-items-center justify-content-center bg-white shadow-sm position-relative"
                style={{
                    width: '40px', height: '40px', border: `1px solid #e2e8f0`,
                    color: viewType === 'sms' ? '#ffffff' : themeColor,
                    backgroundColor: viewType === 'sms' ? themeColor : '#ffffff'
                }}
                onClick={() => setViewType(viewType === 'sms' ? null : 'sms')}
                title="Smart Message"
            >
                <i className={`bi bi-chat-left-text${viewType === 'sms' ? '-fill' : ''} fs-5`}></i>
                {unreadCount > 0 && (
                    <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger">
                        {unreadCount}
                    </span>
                )}
            </button>

            {/* ================= SMART SMS PANEL INTERFACE ================= */}
            {viewType === 'sms' && (
                <div
                    className="card border-0 shadow-lg"
                    style={{
                        position: 'fixed', bottom: '24px', right: '24px',
                        width: '380px', height: '480px', zIndex: 2000,
                        borderRadius: '16px', overflow: 'hidden',
                        display: 'flex', flexDirection: 'column',
                        backgroundColor: '#ffffff', border: '1px solid #e2e8f0'
                    }}
                >
                    {/* Header */}
                    <div className="card-header py-3 d-flex justify-content-between align-items-center text-white border-0" style={{ backgroundColor: themeColor }}>
                        <div>
                            <h6 className="fw-bold mb-0 text-white">{clientName}</h6>
                            <small className="opacity-75">{phoneNumber || 'No Number'}</small>
                        </div>
                        <button className="btn-close btn-close-white shadow-none" onClick={() => setViewType(null)}></button>
                    </div>

                    {/* Conversations Logs */}
                    <div ref={chatBodyRef} className="card-body p-3 d-flex flex-column gap-2 flex-grow-1" style={{ overflowY: 'auto', backgroundColor: '#f4f6f9' }}>
                        {loading ? (
                            <div className="text-center my-auto"><div className="spinner-border spinner-border-sm text-secondary"></div></div>
                        ) : messages.length === 0 ? (
                            <div className="text-center my-auto text-muted small">No message history found.</div>
                        ) : (
                            messages.map((msg) => (
                                <div
                                    key={msg.id}
                                    className={`p-2 px-3 shadow-sm d-flex flex-column ${
                                        msg.type === 'outgoing' ? 'text-white align-self-end' : 'bg-white text-dark align-self-start'
                                    }`}
                                    style={{
                                        maxWidth: '80%', fontSize: '0.9rem',
                                        backgroundColor: msg.type === 'outgoing' ? themeColor : '#ffffff',
                                        borderRadius: msg.type === 'outgoing' ? '14px 14px 0px 14px' : '14px 14px 14px 0px'
                                    }}
                                >
                                    <div className="mb-0">{msg.text}</div>
                                    <div className="d-flex align-items-center justify-content-end gap-1 mt-1 opacity-75" style={{ fontSize: '0.65rem' }}>
                                        <span>{msg.time}</span>
                                        {msg.type === 'outgoing' && (
                                            <i className={`bi ${
                                                msg.status === 'sending' ? 'bi-clock' :
                                                msg.status === 'failed' ? 'bi-exclamation-circle text-danger' : 'bi-check2-all'
                                            }`}></i>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Form Input */}
                    <div className="card-footer bg-white border-0 p-3">
                        <form onSubmit={handleSendMessage} className="d-flex gap-2 align-items-center">
                            <input
                                type="text"
                                className="form-control border-0 py-2"
                                placeholder="Type a message..."
                                value={typedMessage}
                                onChange={(e) => setTypedMessage(e.target.value)}
                                style={{ borderRadius: '20px', backgroundColor: '#edf2f7', paddingLeft: '15px' }}
                            />
                            <button type="submit" className="btn border-0 text-white d-flex align-items-center justify-content-center" style={{ backgroundColor: themeColor, width: '38px', height: '38px', borderRadius: '50%' }}>
                                <i className="bi bi-send-fill"></i>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default OrderCommunication;