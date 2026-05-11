import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../../api/axios';
import { toast } from 'react-hot-toast';

const EmailCustomer = ({ lead }) => {
    const [view, setView] = useState('list');
    const [emails, setEmails] = useState([]);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    
    const [selectedFiles, setSelectedFiles] = useState([]);
    const fileInputRef = useRef(null);
    const iframeRef = useRef(null);

    const [composeData, setComposeData] = useState({
        subject: `Update regarding Lead #${lead?.lead_number || ''}`,
        body: ""
    });

    const ADMIN_EMAIL = "sales@theglasspeople.com";

    const fetchEmails = useCallback(async () => {
        if (!lead?.email) return;
        setLoading(true);
        try {
            const res = await api.get(`/emails?customer_email=${lead.email}`);
            setEmails(Array.isArray(res.data) ? res.data : (res.data.emails || []));
        } catch (error) {
            console.error("Email fetch error:", error);
            toast.error("Failed to load emails");
        } finally {
            setLoading(false);
        }
    }, [lead?.email]);

    useEffect(() => {
        fetchEmails();
    }, [fetchEmails]);

    const handleIframeLoad = () => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
            // Iframe ki height content ke mutabiq set hogi taaki iframe ka apna scroll khatam ho jaye
            iframeRef.current.style.height = iframeRef.current.contentWindow.document.body.scrollHeight + 'px';
        }
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setSelectedFiles(prev => [...prev, ...files]);
    };

    const removeFile = (index) => {
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSendEmail = async () => {
        if (!composeData.body.trim()) return toast.error("Message body is empty");
        
        setSending(true);
        const formData = new FormData();
        formData.append('lead_id', lead.id);
        formData.append('to', lead.email);
        formData.append('subject', composeData.subject);
        formData.append('body', composeData.body);
        
        selectedFiles.forEach(file => {
            formData.append('files[]', file);
        });

        try {
            await api.post('/emails/send', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Email sent successfully");
            setView('list');
            setComposeData({ ...composeData, body: "" });
            setSelectedFiles([]);
            fetchEmails(); 
        } catch (error) {
            toast.error("Failed to send email");
        } finally {
            setSending(false);
        }
    };

    const markAsRead = async (emailId) => {
        try {
            await api.patch(`/emails/${emailId}/read`);
            // Local state update karein taaki list mein foran unbold ho jaye
            setEmails(prevEmails => 
                prevEmails.map(email => 
                    email.id === emailId ? { ...email, is_read: true } : email
                )
            );
        } catch (error) {
            console.error("Error marking email as read:", error);
        }
    };

    return (
        <div className="overflow-hidden d-flex flex-column" style={{ minHeight: '300px', fontFamily: '"Google Sans", Roboto, Arial, sans-serif' }}>
            
            <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-white sticky-top">
                <div className="d-flex align-items-center">
                    {view !== 'list' && (
                        <button className="btn btn-link text-dark p-2 rounded-circle me-2" onClick={() => setView('list')}>
                            <i className="bi bi-arrow-left fs-5"></i>
                        </button>
                    )}
                    <span className="fw-medium text-secondary" style={{ fontSize: '0.9rem' }}>
                        {loading ? 'Refreshing...' : view === 'compose' ? 'New Message' : view === 'read' ? 'Conversation' : 'Recent Messages'}
                    </span>
                    {view === 'list' && (
                        <button className="btn btn-link text-muted p-0 ms-3" onClick={fetchEmails} disabled={loading}>
                            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
                        </button>
                    )}
                </div>
                {view === 'list' && (
                    <button className="btn btn-primary rounded-pill px-3 py-1 shadow-sm d-flex align-items-center" 
                            onClick={() => setView('compose')} 
                            style={{ fontSize: '0.85rem', fontWeight: '500', background: 'rgb(52, 73, 126)', border: 'none' }}>
                        <i className="bi bi-pencil me-2"></i> Compose
                    </button>
                )}
            </div>

            {/* Scrolling sirf yahan control hogi */}
            <div className={`flex-grow-1 ${view === 'read' ? 'overflow-y-auto' : 'overflow-auto'}`} style={{ height: '450px' }}>
                {loading && emails.length === 0 ? (
                    <div className="d-flex justify-content-center align-items-center h-100">
                        <div className="spinner-border spinner-border-sm text-primary"></div>
                    </div>
                ) : view === 'list' ? (
                    <div className="mail-list">
                        {emails.length > 0 ? emails.map((msg) => {
                            const isFromAdmin = msg.sender === ADMIN_EMAIL;
                            return (
                                <div 
                                    key={msg.id} 
                                    onClick={() => { 
                                        setSelectedEmail(msg); 
                                        setView('read');
                                        // Sirf tab call karein agar email pehle se unread ho aur customer ki taraf se ho
                                        if (!msg.is_read && msg.sender !== ADMIN_EMAIL) {
                                            markAsRead(msg.id);
                                        }
                                    }}
                                    className={`d-flex align-items-center px-3 py-2 border-bottom cursor-pointer mail-item ${!msg.is_read && msg.sender !== ADMIN_EMAIL ? 'bg-white fw-bold shadow-sm' : 'bg-light-subtle'}`}
                                    style={{ borderLeft: !msg.is_read && msg.sender !== ADMIN_EMAIL ? '4px solid #34497e' : 'none' }}
                                >
                                    <div className={`rounded-circle text-white d-flex align-items-center justify-content-center me-3`} 
                                         style={{ width: '32px', height: '32px', minWidth: '32px', fontSize: '12px', background: isFromAdmin ? '#34497e' : '#17a2b8' }}>
                                        {isFromAdmin ? 'Me' : (msg.sender?.charAt(0).toUpperCase() || 'C')}
                                    </div>
                                    <div className="flex-grow-1 text-truncate pe-3">
                                        <div className="d-flex justify-content-between">
                                            <span style={{ fontSize: '0.9rem' }}>{isFromAdmin ? `${msg.sender}` : msg.sender}</span>
                                            <span className="text-muted small fw-normal">{new Date(msg.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-truncate" style={{ fontSize: '0.85rem', color: '#5f6368' }}>
                                            {msg.subject}
                                        </div>
                                    </div>
                                    {msg.attachments_count > 0 && <i className="bi bi-paperclip text-muted me-2"></i>}
                                </div>
                            );
                        }) : (
                            <div className="text-center p-5 text-muted small">No email history with this customer.</div>
                        )}
                    </div>
                ) : view === 'read' ? (
                    <div className="p-4 animate-in">
                        <h5 className="mb-4 text-dark fw-bold">{selectedEmail.subject}</h5>
                        <div className="d-flex align-items-center mb-4">
                            <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                                {selectedEmail.sender === ADMIN_EMAIL ? 'M' : 'C'}
                            </div>
                            <div className="flex-grow-1">
                                <div className="small">
                                    <strong>{selectedEmail.sender === ADMIN_EMAIL ? 'Admin' : 'Customer'}</strong> 
                                    <span className="text-muted ms-2">&lt;{selectedEmail.sender}&gt;</span>
                                </div>
                                <div className="text-muted small">to {selectedEmail.receiver === ADMIN_EMAIL ? 'me' : lead.client_name}</div>
                            </div>
                            <div className="text-muted small">{new Date(selectedEmail.created_at).toLocaleString()}</div>
                        </div>
                        
                        <div className="pt-3 border-top">
                            {/* iframe scrolling disabled, height content ke mutabiq manage ho rahi hai */}
                            <iframe
                                ref={iframeRef}
                                title="email-content"
                                // srcDoc ke andar head aur base tag lazmi hai
                                srcDoc={`
                                    <html>
                                        <head>
                                            <base target="_blank">
                                            <style>
                                                body { margin: 0; font-family: sans-serif; }
                                                img { max-width: 100%; height: auto; }
                                            </style>
                                        </head>
                                        <body>
                                            ${selectedEmail.html_body}
                                        </body>
                                    </html>
                                `}
                                onLoad={handleIframeLoad}
                                scrolling="no"
                                style={{
                                    width: '100%',
                                    border: 'none',
                                    overflow: 'hidden',
                                    display: 'block'
                                }}
                            />
                        </div>
                        
                        {selectedEmail.attachments?.length > 0 && (
                            <div className="mt-4 pt-3 border-top">
                                <p className="small fw-bold">Attachments:</p>
                                <div className="d-flex flex-wrap gap-2">
                                    {selectedEmail.attachments.map(file => (
                                        <a 
                                            key={file.id} 
                                            // Env variable use karein aur slash check karlein
                                            href={`${import.meta.env.VITE_STORAGE_URL}/${file.file_path}`} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="btn btn-sm btn-outline-secondary d-flex align-items-center"
                                        >
                                            <i className="bi bi-file-earmark-arrow-down me-1"></i> 
                                            <span className="text-truncate" style={{ maxWidth: '150px' }}>
                                                {file.file_name}
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-3 animate-in">
                        <div className="border rounded shadow-sm bg-white">
                            <div className="bg-dark text-white p-2 d-flex justify-content-between align-items-center rounded-top">
                                <span className="small ps-2">New Message to {lead.client_name}</span>
                                <button className="btn btn-sm btn-link text-white py-0" onClick={() => setView('list')}><i className="bi bi-x-lg"></i></button>
                            </div>
                            
                            <input 
                                type="text" 
                                className="form-control border-0 border-bottom rounded-0 py-2 small shadow-none" 
                                placeholder="Subject" 
                                value={composeData.subject}
                                onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                            />
                            
                            <textarea 
                                rows="8" 
                                className="form-control border-0 py-3 small shadow-none" 
                                placeholder="Write your email..." 
                                style={{ resize: 'none' }}
                                value={composeData.body}
                                onChange={(e) => setComposeData({...composeData, body: e.target.value})}
                            ></textarea>

                            {/* --- YEH SECTION ADD KAREIN: File Previews --- */}
                            {selectedFiles.length > 0 && (
                                <div className="px-3 py-2 bg-light border-top d-flex flex-wrap gap-2">
                                    {selectedFiles.map((file, idx) => (
                                        <div key={idx} className="badge bg-secondary d-flex align-items-center gap-2 p-2 fw-normal" style={{ fontSize: '0.75rem' }}>
                                            <i className="bi bi-paperclip"></i> 
                                            <span className="text-truncate" style={{ maxWidth: '120px' }}>{file.name}</span>
                                            <i 
                                                className="bi bi-x-circle cursor-pointer ms-1 text-white-50 hover-white" 
                                                onClick={() => removeFile(idx)}
                                                style={{ fontSize: '0.9rem' }}
                                            ></i>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {/* ------------------------------------------- */}

                            <div className="p-2 border-top bg-light d-flex gap-3 align-items-center">
                                <button className="btn btn-primary btn-sm px-4 rounded shadow-sm" onClick={handleSendEmail} disabled={sending}>
                                    {sending ? 'Sending...' : 'Send Email'}
                                </button>
                                <input type="file" multiple className="d-none" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf" />
                                <button className="btn btn-outline-secondary btn-sm rounded-circle" onClick={() => fileInputRef.current.click()} title="Attach Files">
                                    <i className="bi bi-paperclip"></i>
                                </button>
                                <button className="btn btn-light btn-sm rounded-circle ms-auto text-danger" onClick={() => {setView('list'); setSelectedFiles([]);}}><i className="bi bi-trash"></i></button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                .mail-item:hover { background-color: #f2f5f7 !important; cursor: pointer; }
                .animate-in { animation: fadeIn 0.15s ease-in-out; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                .spin { animation: spin 1s linear infinite; display: inline-block; }
                @keyframes spin { 100% { transform: rotate(360deg); } }
                /* Custom Scrollbar for cleaner look */
                .overflow-y-auto::-webkit-scrollbar { width: 6px; }
                .overflow-y-auto::-webkit-scrollbar-track { background: #f1f1f1; }
                .overflow-y-auto::-webkit-scrollbar-thumb { background: #ccc; borderRadius: 10px; }
            `}</style>
        </div>
    );
};

export default EmailCustomer;