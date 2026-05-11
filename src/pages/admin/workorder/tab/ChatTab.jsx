import React, { useState, useEffect, useRef } from 'react';
import api from '../../../../api/axios';
import EmailCustomer from './EmailCustomer';
import EmailSupplier from './EmailSupplier';
import { Modal, Spinner } from 'react-bootstrap';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { toast } from 'react-hot-toast';

const ChatTab = ({ lead }) => {
    const isGlazierAssigned = !!(lead.gjob && lead.gjob.glazier_id);
    
    const [activeSubTab, setActiveSubTab] = useState(isGlazierAssigned ? 'glazier' : 'customer'); 
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    
    const prevMsgLength = useRef(0);
    const [showSketchModal, setShowSketchModal] = useState(false);
    const [strokeColor, setStrokeColor] = useState("#2b3a67");
    const [strokeWidth, setStrokeWidth] = useState(4);
    
    const canvasRef = useRef(null);
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const STORAGE_BASE_URL = import.meta.env.VITE_STORAGE_URL;

    // Polling Logic
    useEffect(() => {
        let interval;
        if (activeSubTab === 'glazier' && isGlazierAssigned && lead.gjob?.id) {
            fetchGlazierChat();
            interval = setInterval(fetchGlazierChat, 5000);
        }
        return () => clearInterval(interval);
    }, [activeSubTab, lead.id, isGlazierAssigned]);

    const fetchGlazierChat = async () => {
        try {
            const jobId = lead.gjob?.id;
            if (!jobId) return;
            const res = await api.get(`/jobs/${jobId}/chat`);
            
            if (res.data.success) {
                setMessages(res.data.chats || []);
                setCurrentUserId(res.data.current_user_id);
            }
        } catch (error) {
            console.error("Chat fetch error", error);
        }
    };

    const handleSendGlazierMessage = async (e, customData = null) => {
        if (e) e.preventDefault();
        if (!newMessage.trim() && !customData) return;

        try {
            const jobId = lead.gjob?.id;
            const config = customData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
            const payload = customData || { message: newMessage };

            const res = await api.post(`/jobs/${jobId}/chat`, payload, config);
            if (res.data.chat) {
                setNewMessage("");
                fetchGlazierChat();
            }
        } catch (error) {
            toast.error("Send failed");
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('message', 'Sent an attachment');
        formData.append('attachment', file);

        handleSendGlazierMessage(null, formData);
        toast.success("File uploading...");
        e.target.value = null; 
    };

    const sendSketch = async () => {
        try {
            const image = await canvasRef.current.exportImage("png");
            const res = await fetch(image);
            const blob = await res.blob();
            const formData = new FormData();
            formData.append('message', 'Sent a site sketch');
            formData.append('attachment', blob, 'sketch.png');
            handleSendGlazierMessage(null, formData);
            setShowSketchModal(false);
        } catch (err) {
            toast.error("Sketch failed");
        }
    };

    // Auto Scroll Logic
    useEffect(() => { 
        if (messages.length > prevMsgLength.current) {
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }
        prevMsgLength.current = messages.length;
    }, [messages]);
    
    return (
        <div className="chat-tab-container bg-white rounded-4 shadow-sm border overflow-hidden" style={{ height: '700px', display: 'flex', flexDirection: 'column' }}>
            
            {/* Header Tabs */}
            <div className="p-3 border-bottom bg-white">
                <div className="custom-tab-wrapper d-flex p-1 bg-light rounded-pill" style={{  }}>
                    {isGlazierAssigned && (
                        <button 
                            className={`flex-grow-1 btn btn-sm rounded-pill transition-all py-2 ${activeSubTab === 'glazier' ? 'bg-white shadow-sm fw-bold text-primary' : 'text-muted border-0'}`}
                            onClick={() => setActiveSubTab('glazier')}
                        >
                            <i className="bi bi-chat-left-text me-2"></i>Glazier Chat
                        </button>
                    )}
                    <button 
                        className={`flex-grow-1 btn btn-sm rounded-pill transition-all py-2 ${activeSubTab === 'customer' ? 'bg-white shadow-sm fw-bold text-primary' : 'text-muted border-0'}`}
                        onClick={() => setActiveSubTab('customer')}
                    >
                        <i className="bi bi-envelope-paper me-2"></i>Email Customer
                    </button>

                    <button 
                        className={`flex-grow-1 btn btn-sm rounded-pill transition-all py-2 ${activeSubTab === 'supplier' ? 'bg-white shadow-sm fw-bold text-primary' : 'text-muted border-0'}`}
                        onClick={() => setActiveSubTab('supplier')}
                    >
                        <i className="bi bi-truck me-2"></i>Email Supplier
                    </button>
                </div>
            </div>

            <div className="flex-grow-1 overflow-hidden d-flex flex-column position-relative">
                {activeSubTab === 'glazier' && (
                    <>
                        <div className="flex-grow-1 p-4 overflow-auto chat-viewport" style={{ backgroundColor: '#f8f9fa' }}>
                            {messages.length > 0 ? (
                                messages.map((msg) => {
                                    const isMe = msg.sender_id === currentUserId;
                                    return (
                                        <div key={msg.id} className={`d-flex mb-4 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                                            <div className={`message-bubble shadow-sm ${isMe ? 'sent' : 'received'}`}>
                                                <div className="message-content">{msg.message}</div>
                                                {msg.attachment && (
                                                    <div className="attachment-wrapper mt-2">
                                                        <img 
                                                            src={msg.attachment.startsWith('http') ? msg.attachment : `${STORAGE_BASE_URL}/${msg.attachment}`} 
                                                            className="rounded-3 img-fluid border shadow-sm bg-white" 
                                                            alt="attachment" 
                                                            style={{ maxHeight: '200px' }} 
                                                        />
                                                    </div>
                                                )}
                                                <div className={`message-time ${isMe ? 'text-white-50' : 'text-muted'}`}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="h-100 d-flex flex-column align-items-center justify-content-center text-center opacity-50">
                                    <i className="bi bi-chat-dots text-primary display-4 mb-2"></i>
                                    <h6 className="fw-bold">No Messages Yet</h6>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input Area */}
                        <div className="p-3 bg-white border-top">
                            <form onSubmit={handleSendGlazierMessage} className="d-flex align-items-center gap-2">
                                <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*" />
                                <button type="button" className="btn btn-light rounded-circle p-2" onClick={() => fileInputRef.current.click()}>
                                    <i className="bi bi-paperclip fs-5 text-primary"></i>
                                </button>
                                <button type="button" className="btn btn-light rounded-circle p-2" onClick={() => setShowSketchModal(true)}>
                                    <i className="bi bi-palette fs-5 text-success"></i>
                                </button>

                                <input 
                                    type="text" 
                                    className="form-control rounded-pill border-light bg-light px-4 py-2" 
                                    placeholder="Type message..." 
                                    value={newMessage}
                                    onChange={(e) => setNewMessage(e.target.value)}
                                />
                                
                                <button 
                                    type="submit" 
                                    disabled={!newMessage.trim()}
                                    className={`btn rounded-circle d-flex align-items-center justify-content-center ${newMessage.trim() ? 'btn-primary shadow pulse' : 'btn-light'}`}
                                    style={{ width: '45px', height: '45px' }}
                                >
                                    <i className="bi bi-send-fill"></i>
                                </button>
                            </form>
                        </div>
                    </>
                )}
                {activeSubTab === 'customer' && (
                    <div className="p-2 bg-light h-100 overflow-auto">
                        <EmailCustomer lead={lead} />
                    </div>
                )}

                {activeSubTab === 'supplier' && (
                    <div className="p-2 bg-light h-100 overflow-auto">
                        <EmailSupplier lead={lead} />
                    </div>
                )}
            </div>

            <style>{`
                .message-bubble { max-width: 75%; padding: 12px 16px; font-size: 14px; position: relative; }
                .message-bubble.sent { background: linear-gradient(135deg, #007bff, #0056b3); color: white; border-radius: 20px 20px 4px 20px; }
                .message-bubble.received { background: white; color: #333; border-radius: 20px 20px 20px 4px; border: 1px solid #eee; }
                .message-time { font-size: 10px; margin-top: 5px; text-align: right; }
                .pulse { animation: pulse-blue 2s infinite; }
                @keyframes pulse-blue {
                    0% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(0, 123, 255, 0); }
                    100% { box-shadow: 0 0 0 0 rgba(0, 123, 255, 0); }
                }
                .chat-viewport::-webkit-scrollbar { width: 4px; }
                .chat-viewport::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 10px; }
            `}</style>

            {/* Sketch Modal */}
            <Modal show={showSketchModal} onHide={() => setShowSketchModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title className="h6 fw-bold">CREATE SITE SKETCH</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-light p-3">
                    <div className="bg-white border rounded-3 overflow-hidden shadow-sm">
                        <div className="d-flex align-items-center justify-content-between p-2 bg-light border-bottom">
                            <div className="d-flex gap-2">
                                {['#2b3a67', '#198754', '#dc3545', '#000000'].map(c => (
                                    <div key={c} onClick={() => setStrokeColor(c)} 
                                        style={{ width: '22px', height: '22px', backgroundColor: c, borderRadius: '50%', cursor: 'pointer', border: strokeColor === c ? '2px solid white' : 'none', outline: strokeColor === c ? '1px solid #2b3a67' : 'none' }} />
                                ))}
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-sm btn-outline-secondary border-0" onClick={() => canvasRef.current.undo()}><i className="bi bi-arrow-counterclockwise"></i></button>
                                <button className="btn btn-sm btn-outline-danger border-0" onClick={() => canvasRef.current.clearCanvas()}><i className="bi bi-trash"></i></button>
                            </div>
                        </div>
                        <div style={{ height: '400px' }}>
                            <ReactSketchCanvas ref={canvasRef} strokeWidth={strokeWidth} strokeColor={strokeColor} />
                        </div>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button className="btn btn-primary w-100 rounded-pill" onClick={sendSketch}>Send Sketch to Glazier</button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default ChatTab;