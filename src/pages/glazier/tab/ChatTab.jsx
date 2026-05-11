import React, { useState, useEffect, useRef } from 'react';
import api from '../../../api/axios';
import { Modal, Spinner } from 'react-bootstrap';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { toast } from 'react-hot-toast';

const ChatTab = ({ job }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);
    
    const [showSketchModal, setShowSketchModal] = useState(false);
    const [strokeColor, setStrokeColor] = useState("#2b3a67");
    
    const canvasRef = useRef(null);
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const STORAGE_BASE_URL = import.meta.env.VITE_STORAGE_URL;


    // Initial Fetch & Polling
    useEffect(() => {
        if (job?.id) {
            fetchChat();
            const interval = setInterval(fetchChat, 5000); // 5 sec auto refresh
            return () => clearInterval(interval);
        }
    }, [job?.id]);

    const prevMsgLength = useRef(0);
    
    const fetchChat = async () => {
        try {
            const res = await api.get(`/jobs/${job.id}/chat`);
            if (res.data.success) {
                setMessages(res.data.chats);
                setCurrentUserId(res.data.current_user_id);
            }
        } catch (error) {
            console.error("Chat fetch error", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e, customData = null) => {
        if (e) e.preventDefault();
        if (!customData && !newMessage.trim()) return;

        try {
            // Agar customData (FormData) hai toh headers change honge
            const config = customData 
                ? { headers: { 'Content-Type': 'multipart/form-data' } }
                : {};

            const payload = customData || { message: newMessage };

            const res = await api.post(`/jobs/${job.id}/chat`, payload, config);
            
            if (res.data.chat) {
                setNewMessage("");
                fetchChat(); // Refresh messages
            }
        } catch (error) {
            console.error("Upload error:", error.response?.data); // Isse exact validation error dikhega
            toast.error(error.response?.data?.message || "Send failed");
        }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const formData = new FormData();
        formData.append('message', 'Sent an attachment');
        formData.append('attachment', file);
        
        handleSendMessage(null, formData);
        toast.success("Uploading image...");
        e.target.value = null; 
    };

   const sendSketch = async () => {
        try {
            // Export image as Base64
            const dataUrl = await canvasRef.current.exportImage("png");
            
            // Convert Base64 to Blob (Laravel isse file ki tarah treat karega)
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            
            const formData = new FormData();
            formData.append('message', 'Sent a site sketch');
            formData.append('attachment', blob, 'sketch.png'); // File name zaroori hai

            handleSendMessage(null, formData);
            setShowSketchModal(false);
        } catch (err) {
            toast.error("Sketch failed");
        }
    };

    useEffect(() => { 
        // Sirf tab scroll karein agar messages ki ginti pehle se zyada ho
        if (messages.length > prevMsgLength.current) {
            setTimeout(() => {
                chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 100);
        }
        // Current length ko save kar lein agli baar ke liye
        prevMsgLength.current = messages.length;
    }, [messages]);

    return (
        <div className="d-flex flex-column bg-white shadow-sm rounded-4 overflow-hidden" 
             style={{ height: '600px', border: '1px solid #eef0f2' }}>
            
            {/* Header */}
            <div className="p-3 border-bottom bg-white d-flex align-items-center justify-content-between">
                <h6 className="mb-0 fw-bold">Chat with {job?.lead?.creator?.name}</h6>
                <div className="d-flex gap-2">
                    <button className="btn btn-light btn-sm rounded-circle" onClick={() => fileInputRef.current.click()}>
                        <i className="bi bi-paperclip text-primary"></i>
                    </button>
                    <button className="btn btn-light btn-sm rounded-circle" onClick={() => setShowSketchModal(true)}>
                        <i className="bi bi-palette text-success"></i>
                    </button>
                </div>
            </div>

            {/* Chat Viewport */}
            <div className="flex-grow-1 overflow-auto p-3 bg-light chat-viewport" style={{ background: '#f8f9fa' }}>
                <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*" />
                
                {messages.length > 0 ? (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === currentUserId;
                        return (
                            <div key={msg.id} className={`d-flex mb-3 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                                <div className={`p-3 rounded-4 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark border'}`} 
                                     style={{ maxWidth: '75%' }}>
                                    
                                    <div style={{ fontSize: '0.9rem' }}>{msg.message}</div>
                                    
                                    {msg.attachment && (
                                        <div className="mt-2">
                                            <img 
                                                src={`${STORAGE_BASE_URL}/${msg.attachment}`} 
                                                className="rounded-3 img-fluid border bg-white" 
                                                alt="attachment" 
                                                style={{ maxHeight: '200px' }} 
                                            />
                                        </div>
                                    )}
                                    
                                    <div className={`text-end mt-1 ${isMe ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.65rem' }}>
                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted opacity-50">
                        <i className="bi bi-chat-dots display-4"></i>
                        <p className="mt-2">No messages yet.</p>
                    </div>
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-top bg-white">
                <form onSubmit={handleSendMessage} className="d-flex align-items-center gap-2">
                    <input 
                        type="text" 
                        className="form-control rounded-pill border-light bg-light px-4" 
                        placeholder="Type message..." 
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        style={{ height: '45px' }}
                    />
                    <button 
                        type="submit" 
                        disabled={!newMessage.trim()}
                        className={`btn rounded-circle p-0 d-flex align-items-center justify-content-center ${newMessage.trim() ? 'btn-primary shadow' : 'btn-light'}`}
                        style={{ width: '45px', height: '45px', minWidth: '45px' }}
                    >
                        <i className="bi bi-send-fill fs-5"></i>
                    </button>
                </form>
            </div>

            {/* Sketch Modal (Same as before but with better colors) */}
            <Modal show={showSketchModal} onHide={() => setShowSketchModal(false)} size="lg" centered>
                <Modal.Header closeButton>
                    <Modal.Title className="h6">Draw Sketch</Modal.Title>
                </Modal.Header>
                <Modal.Body className="bg-light">
                    <div className="bg-white rounded-3 overflow-hidden border" style={{ height: '400px' }}>
                        <ReactSketchCanvas ref={canvasRef} strokeWidth={4} strokeColor={strokeColor} />
                    </div>
                    <div className="d-flex gap-2 mt-3 justify-content-center">
                        {['#000000', '#dc3545', '#198754', '#0d6efd'].map(c => (
                            <div key={c} onClick={() => setStrokeColor(c)} 
                                 style={{ width: '30px', height: '30px', backgroundColor: c, borderRadius: '50%', cursor: 'pointer', border: strokeColor === c ? '3px solid orange' : 'none' }} />
                        ))}
                        <button className="btn btn-sm btn-outline-secondary ms-auto" onClick={() => canvasRef.current.clearCanvas()}>Clear</button>
                    </div>
                </Modal.Body>
                <Modal.Footer>
                    <button className="btn btn-primary w-100 rounded-pill" onClick={sendSketch}>Send Sketch</button>
                </Modal.Footer>
            </Modal>

            <style>{`
                .chat-viewport::-webkit-scrollbar { width: 4px; }
                .chat-viewport::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default ChatTab;