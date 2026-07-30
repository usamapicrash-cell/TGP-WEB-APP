import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios';
import { Modal } from 'react-bootstrap';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { toast } from 'react-hot-toast';

const Messages = () => {
    const [conversations, setConversations] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedJob, setSelectedJob] = useState(null);
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [currentUserId, setCurrentUserId] = useState(null);
    
    // Sketch States
    const [showSketchModal, setShowSketchModal] = useState(false);
    const [strokeColor, setStrokeColor] = useState("#2b3a67");
    const [strokeWidth, setStrokeWidth] = useState(4);
    
    const canvasRef = useRef(null);
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const prevMsgLength = useRef(0);

    const STORAGE_BASE_URL = import.meta.env.VITE_STORAGE_URL;

    useEffect(() => { fetchConversations(); }, []);

    const fetchConversations = async () => {
        try {
            const res = await api.get('/chat/conversations');
            const data = res.data.success ? res.data.data : (Array.isArray(res.data) ? res.data : []);
            setConversations(data);
        } catch (error) { console.error("Error", error); } 
        finally { setLoading(false); }
    };

    const selectConversation = async (job) => {
        setSelectedJob(job);
        fetchChat(job.id);
    };

    const fetchChat = async (jobId) => {
        try {
            const res = await api.get(`/jobs/${jobId}/chat`);
            if (res.data.success) {
                setMessages(res.data.chats);
                setCurrentUserId(res.data.current_user_id);
                fetchConversations();
            }
        } catch (error) { setMessages([]); }
    };

    // Auto Refresh Logic
    useEffect(() => {
        let interval;
        if (selectedJob?.id) {
            interval = setInterval(() => fetchChat(selectedJob.id), 5000);
        }
        return () => clearInterval(interval);
    }, [selectedJob?.id]);

    const handleSendMessage = async (e, customData = null) => {
        if (e) e.preventDefault();
        if (!customData && !newMessage.trim()) return;

        try {
            const config = customData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {};
            const payload = customData || { message: newMessage };
            
            const res = await api.post(`/jobs/${selectedJob.id}/chat`, payload, config);
            if (res.data.chat) {
                setNewMessage("");
                fetchChat(selectedJob.id);
            }
        } catch (error) { toast.error("Send failed"); }
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const formData = new FormData();
        formData.append('message', 'Sent an attachment');
        formData.append('attachment', file);
        handleSendMessage(null, formData);
        e.target.value = null; 
    };

    const sendSketch = async () => {
        const image = await canvasRef.current.exportImage("png");
        const res = await fetch(image);
        const blob = await res.blob();
        const formData = new FormData();
        formData.append('message', 'Sent a site sketch');
        formData.append('attachment', blob, 'sketch.png');
        handleSendMessage(null, formData);
        setShowSketchModal(false);
    };

    useEffect(() => {
        if (messages.length > prevMsgLength.current) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
        prevMsgLength.current = messages.length;
    }, [messages]);

    const filteredConversations = conversations.filter(job => 
        job.lead?.customer_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.lead?.lead_number?.includes(searchTerm)
    );

    if (loading) return <div className="text-center p-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid py-2 py-md-3" style={{ height: 'calc(100vh - 80px)', minHeight: '500px' }}>
            <div className="row g-0 shadow-lg rounded-3 border bg-white h-100 overflow-hidden">
                
                {/* --- LEFT SIDEBAR --- */}
                <div className={`col-12 col-md-5 col-lg-4 border-end d-flex flex-column h-100 bg-light ${selectedJob ? 'd-none d-md-flex' : 'd-flex'}`}>
                    <div className="p-3 border-bottom bg-white">
                        <h5 className="mb-2 fw-bold text-primary">Chat Messages</h5>
                        <input 
                            type="text" 
                            className="form-control bg-light border shadow-none rounded-pill px-3 fs-6" 
                            placeholder="Search customer..." 
                            value={searchTerm} 
                            onChange={(e) => setSearchTerm(e.target.value)} 
                        />
                    </div>
                    <div className="flex-grow-1 overflow-auto">
                        {filteredConversations.length === 0 ? (
                            <div className="text-center p-4 text-muted">No conversations found.</div>
                        ) : (
                            filteredConversations.map((job) => (
                                <div key={job.id} onClick={() => selectConversation(job)}
                                    className={`p-3 border-bottom cursor-pointer ${selectedJob?.id === job.id ? 'bg-white' : ''}`}
                                    style={{ borderLeft: selectedJob?.id === job.id ? '4px solid #34497e' : '4px solid transparent', cursor: 'pointer' }}>
                                    <div className="d-flex align-items-center">
                                        <div className="avatar-main me-3 flex-shrink-0">
                                            {job.lead?.customer_name ? job.lead.customer_name.charAt(0).toUpperCase() : 'C'}
                                        </div>
                                        <div className="w-100 overflow-hidden">
                                            <div className="d-flex justify-content-between align-items-center mb-1">
                                                <h6 className="mb-0 fw-bold text-truncate me-2" style={{ fontSize: '0.95rem' }}>
                                                    {job.lead?.customer_name || 'Customer'}
                                                </h6>
                                                <small className="text-muted flex-shrink-0" style={{ fontSize: '11px' }}>
                                                    {job.lead?.lead_number}
                                                </small>
                                            </div>
                                            <small className="text-muted text-truncate d-block" style={{ fontSize: '0.8rem' }}>
                                                {job.last_msg || "No messages yet"}
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* --- RIGHT CHAT AREA --- */}
                <div className={`col-12 col-md-7 col-lg-8 d-flex flex-column h-100 bg-white ${!selectedJob ? 'd-none d-md-flex' : 'd-flex'}`}>
                    {selectedJob ? (
                        <>
                            {/* Chat Header */}
                            <div className="p-2 p-sm-3 border-bottom d-flex align-items-center justify-content-between bg-white shadow-sm">
                                <div className="d-flex align-items-center me-2 overflow-hidden">
                                    {/* Mobile Back Button */}
                                    <button 
                                        className="btn btn-sm btn-light border-0 me-2 d-md-none rounded-circle" 
                                        onClick={() => setSelectedJob(null)}
                                    >
                                        <i className="bi bi-arrow-left fs-5"></i>
                                    </button>
                                    
                                    <div className="avatar-sm bg-primary text-white me-2 me-sm-3 shadow-sm flex-shrink-0">
                                        {selectedJob.lead?.customer_name?.charAt(0).toUpperCase() || 'C'}
                                    </div>
                                    <div className="text-truncate">
                                        <h6 className="mb-0 fw-bold text-truncate">{selectedJob.lead?.customer_name}</h6>
                                        <small className="text-muted d-block text-truncate" style={{ fontSize: '11px' }}>
                                            Lead: {selectedJob.lead?.lead_number}
                                        </small>
                                    </div>
                                </div>
                                
                                <div className="d-flex align-items-center gap-1 gap-sm-2 flex-shrink-0">
                                    <div className="d-none d-sm-block text-end me-1">
                                        <small className="text-muted d-block" style={{ fontSize: '10px', lineHeight: '1' }}>Chatting with</small>
                                        <span className="fw-bold text-primary" style={{ fontSize: '0.85rem' }}>
                                            {selectedJob.display_name || 'Admin'} 
                                        </span>
                                    </div>
                                    <button className="btn btn-light btn-sm rounded-circle p-2" onClick={() => fileInputRef.current.click()} title="Attach File">
                                        <i className="bi bi-paperclip text-primary fs-6"></i>
                                    </button>
                                    <button className="btn btn-light btn-sm rounded-circle p-2" onClick={() => setShowSketchModal(true)} title="Draw Sketch">
                                        <i className="bi bi-palette text-success fs-6"></i>
                                    </button>
                                </div>
                            </div>

                            {/* Chat Viewport */}
                            <div className="flex-grow-1 p-3 p-sm-4 overflow-auto bg-light chat-viewport" style={{ background: '#f8f9fa' }}>
                                <input type="file" ref={fileInputRef} hidden onChange={handleFileUpload} accept="image/*" />
                                {messages.length > 0 ? messages.map((msg) => {
                                    const isMe = msg.sender_id === currentUserId;
                                    return (
                                        <div key={msg.id} className={`d-flex mb-3 ${isMe ? 'justify-content-end' : 'justify-content-start'}`}>
                                            <div className={`p-3 rounded-4 shadow-sm ${isMe ? 'bg-primary text-white' : 'bg-white text-dark border'}`} style={{ maxWidth: '85%' }}>
                                                <div style={{ fontSize: '0.9rem', wordBreak: 'break-word' }}>{msg.message}</div>
                                                {msg.attachment && (
                                                    <div className="mt-2">
                                                        <img 
                                                            src={msg.attachment.startsWith('http') ? msg.attachment : `${STORAGE_BASE_URL}/${msg.attachment}`} 
                                                            className="rounded-3 img-fluid border bg-white" 
                                                            alt="attachment" 
                                                            style={{ maxHeight: '200px', objectFit: 'cover' }} 
                                                        />
                                                    </div>
                                                )}
                                                <div className={`text-end mt-1 ${isMe ? 'text-white-50' : 'text-muted'}`} style={{ fontSize: '0.65rem' }}>
                                                    {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                }) : (
                                    <div className="h-100 d-flex flex-column align-items-center justify-content-center text-muted opacity-50">
                                        <i className="bi bi-chat-dots display-4"></i>
                                        <p className="mt-2">No messages yet.</p>
                                    </div>
                                )}
                                <div ref={chatEndRef} />
                            </div>

                            {/* Chat Input Area */}
                            <div className="p-2 p-sm-3 bg-white border-top">
                                <form onSubmit={handleSendMessage} className="d-flex align-items-center gap-2">
                                    <input 
                                        type="text" 
                                        className="form-control rounded-pill border bg-light px-3 px-sm-4" 
                                        placeholder="Type message..." 
                                        value={newMessage} 
                                        onChange={(e) => setNewMessage(e.target.value)} 
                                        style={{ height: '42px' }} 
                                    />
                                    <button 
                                        type="submit" 
                                        disabled={!newMessage.trim()} 
                                        className={`btn rounded-circle p-0 d-flex align-items-center justify-content-center flex-shrink-0 ${newMessage.trim() ? 'btn-primary shadow-sm' : 'btn-light'}`} 
                                        style={{ width: '42px', height: '42px' }}
                                    >
                                        <i className="bi bi-send-fill fs-6"></i>
                                    </button>
                                </form>
                            </div>
                        </>
                    ) : (
                        <div className="h-100 d-flex align-items-center justify-content-center flex-column text-muted bg-light p-3 text-center">
                            <i className="bi bi-chat-left-dots display-4 opacity-25 mb-3"></i>
                            <h5 className="fw-bold text-dark">Welcome to Messenger</h5>
                            <p className="small">Please select a conversation from the sidebar to start chatting.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- SKETCH MODAL --- */}
            <Modal show={showSketchModal} onHide={() => setShowSketchModal(false)} size="lg" centered>
                <Modal.Header closeButton><Modal.Title className="h6 mb-0">Draw Sketch</Modal.Title></Modal.Header>
                <Modal.Body className="bg-light p-2 p-sm-3">
                    <div className="bg-white rounded-3 overflow-hidden border" style={{ height: '350px' }}>
                        <ReactSketchCanvas ref={canvasRef} strokeWidth={strokeWidth} strokeColor={strokeColor} />
                    </div>
                    <div className="d-flex flex-wrap gap-2 mt-3 justify-content-center align-items-center">
                        <div className="d-flex gap-2">
                            {['#000000', '#dc3545', '#198754', '#0d6efd'].map(c => (
                                <div key={c} onClick={() => setStrokeColor(c)} style={{ width: '28px', height: '28px', backgroundColor: c, borderRadius: '50%', cursor: 'pointer', border: strokeColor === c ? '3px solid orange' : 'none' }} />
                            ))}
                        </div>
                        <input type="range" className="form-range mx-2" style={{ width: '90px' }} min="1" max="20" value={strokeWidth} onChange={(e) => setStrokeWidth(parseInt(e.target.value))} />
                        <button className="btn btn-sm btn-outline-secondary px-3" onClick={() => canvasRef.current.clearCanvas()}>Clear</button>
                    </div>
                </Modal.Body>
                <Modal.Footer className="p-2 p-sm-3">
                    <button className="btn btn-primary w-100 rounded-pill" onClick={sendSketch}>Send Sketch</button>
                </Modal.Footer>
            </Modal>

            <style>{`
                .avatar-main { width: 40px; height: 40px; background: #34497e; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-weight: bold; color: white; }
                .avatar-sm { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
                .chat-viewport::-webkit-scrollbar { width: 5px; }
                .chat-viewport::-webkit-scrollbar-thumb { background: #cbd5e0; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default Messages;