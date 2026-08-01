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

    useEffect(() => {
        const handleMessage = (event) => {
            if (event.data && event.data.frameHeight && iframeRef.current) {
                iframeRef.current.style.height = `${event.data.frameHeight + 20}px`;
            }
        };

        window.addEventListener('message', handleMessage);

        return () => {
            window.removeEventListener('message', handleMessage);
        };
    }, [selectedEmail]);
    
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
        if (iframeRef.current && iframeRef.current.contentDocument) {
            const doc = iframeRef.current.contentDocument;
            const height = Math.max(
                doc.body ? doc.body.scrollHeight : 0,
                doc.documentElement ? doc.documentElement.scrollHeight : 0
            );
            if (height > 0) {
                iframeRef.current.style.height = `${height + 20}px`;
            }
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
        <div className="w-100 overflow-hidden d-flex flex-column bg-white rounded shadow-sm" style={{ minHeight: '350px', maxHeight: '85vh', fontFamily: '"Google Sans", Roboto, Arial, sans-serif' }}>
            
            {/* Responsive Header */}
            <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-white sticky-top flex-wrap gap-2">
                <div className="d-flex align-items-center overflow-hidden">
                    {view !== 'list' && (
                        <button className="btn btn-link text-dark p-1 rounded-circle me-2" onClick={() => setView('list')}>
                            <i className="bi bi-arrow-left fs-5"></i>
                        </button>
                    )}
                    <span className="fw-medium text-secondary text-truncate" style={{ fontSize: '0.9rem' }}>
                        {loading ? 'Refreshing...' : view === 'compose' ? 'New Message' : view === 'read' ? 'Conversation' : 'Recent Messages'}
                    </span>
                    {view === 'list' && (
                        <button className="btn btn-link text-muted p-0 ms-2" onClick={fetchEmails} disabled={loading}>
                            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
                        </button>
                    )}
                </div>
                {view === 'list' && (
                    <button className="btn btn-primary rounded-pill px-3 py-1 shadow-sm d-flex align-items-center ms-auto" 
                            onClick={() => setView('compose')} 
                            style={{ fontSize: '0.85rem', fontWeight: '500', background: 'rgb(52, 73, 126)', border: 'none' }}>
                        <i className="bi bi-pencil me-1 me-sm-2"></i> <span className="d-xs-inline">Compose</span>
                    </button>
                )}
            </div>

            {/* Scrollable Content Container */}
            <div className={`flex-grow-1 overflow-auto ${view === 'read' ? 'overflow-y-auto' : ''}`} style={{ minHeight: '250px', maxHeight: 'calc(85vh - 55px)' }}>
                {loading && emails.length === 0 ? (
                    <div className="d-flex justify-content-center align-items-center h-100 py-5">
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
                                        if (!msg.is_read && msg.sender !== ADMIN_EMAIL) {
                                            markAsRead(msg.id);
                                        }
                                    }}
                                    className={`d-flex align-items-center px-3 py-2 border-bottom cursor-pointer mail-item ${!msg.is_read && msg.sender !== ADMIN_EMAIL ? 'bg-white fw-bold shadow-sm' : 'bg-light-subtle'}`}
                                    style={{ borderLeft: !msg.is_read && msg.sender !== ADMIN_EMAIL ? '4px solid #34497e' : '4px solid transparent' }}
                                >
                                    <div className="rounded-circle text-white d-flex align-items-center justify-content-center me-2 me-sm-3 flex-shrink-0" 
                                         style={{ width: '32px', height: '32px', fontSize: '12px', background: isFromAdmin ? '#34497e' : '#17a2b8' }}>
                                        {isFromAdmin ? 'Me' : (msg.sender?.charAt(0).toUpperCase() || 'C')}
                                    </div>
                                    <div className="flex-grow-1 text-truncate pe-2 pe-sm-3">
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="text-truncate" style={{ fontSize: '0.85rem' }}>{isFromAdmin ? `${msg.sender}` : msg.sender}</span>
                                            <span className="text-muted small fw-normal ms-2 flex-shrink-0" style={{ fontSize: '0.75rem' }}>{new Date(msg.created_at).toLocaleDateString()}</span>
                                        </div>
                                        <div className="text-truncate" style={{ fontSize: '0.8rem', color: '#5f6368' }}>
                                            {msg.subject}
                                        </div>
                                    </div>
                                    {msg.attachments_count > 0 && <i className="bi bi-paperclip text-muted ms-auto flex-shrink-0"></i>}
                                </div>
                            );
                        }) : (
                            <div className="text-center p-5 text-muted small">No email history with this customer.</div>
                        )}
                    </div>
                ) : view === 'read' ? (
                    <div className="p-3 p-md-4 animate-in">
                        <h5 className="mb-3 text-dark fw-bold text-break fs-6 fs-md-5">{selectedEmail.subject}</h5>
                        <div className="d-flex align-items-start align-items-sm-center mb-3 flex-wrap gap-2">
                            <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2 flex-shrink-0" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                                {selectedEmail.sender === ADMIN_EMAIL ? 'M' : 'C'}
                            </div>
                            <div className="flex-grow-1 min-w-0">
                                <div className="small text-truncate">
                                    <strong>{selectedEmail.sender === ADMIN_EMAIL ? 'Admin' : 'Customer'}</strong> 
                                    <span className="text-muted ms-1 text-break">&lt;{selectedEmail.sender}&gt;</span>
                                </div>
                                <div className="text-muted small">to {selectedEmail.receiver === ADMIN_EMAIL ? 'me' : lead.client_name}</div>
                            </div>
                            <div className="text-muted small ms-auto" style={{ fontSize: '0.75rem' }}>{new Date(selectedEmail.created_at).toLocaleString()}</div>
                        </div>
                        
                        <div className="pt-3 border-top w-100 overflow-hidden">
                            <iframe
                                ref={iframeRef}
                                key={selectedEmail?.id}
                                title="email-content"
                                srcDoc={`
                                    <!DOCTYPE html>
                                    <html>
                                        <head>
                                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                            <base target="_blank">
                                            <style>
                                                html, body { margin: 0; padding: 0; font-family: sans-serif; word-wrap: break-word; overflow-x: hidden; }
                                                img { max-width: 100% !important; height: auto !important; }
                                                table { max-width: 100% !important; }
                                            </style>
                                        </head>
                                        <body>
                                            <div id="email-body-content">
                                                ${selectedEmail?.html_body || selectedEmail?.body || ''}
                                            </div>
                                            <script>
                                                function sendHeight() {
                                                    var height = document.body.scrollHeight || document.documentElement.scrollHeight;
                                                    window.parent.postMessage({ frameHeight: height }, '*');
                                                }
                                                window.onload = sendHeight;
                                                if (window.ResizeObserver) {
                                                    new ResizeObserver(sendHeight).observe(document.body);
                                                }
                                            </script>
                                        </body>
                                    </html>
                                `}
                                onLoad={handleIframeLoad}
                                scrolling="no"
                                style={{
                                    width: '100%',
                                    border: 'none',
                                    overflow: 'hidden',
                                    display: 'block',
                                    minHeight: '100px'
                                }}
                            />
                        </div>
                        
                        {selectedEmail.attachments?.length > 0 && (
                            <div className="mt-4 pt-3 border-top">
                                <p className="small fw-bold mb-2">Attachments:</p>
                                <div className="d-flex flex-wrap gap-2">
                                    {selectedEmail.attachments.map(file => (
                                        <a 
                                            key={file.id} 
                                            href={`${import.meta.env.VITE_STORAGE_URL}/${file.file_path}`} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="btn btn-sm btn-outline-secondary d-flex align-items-center text-truncate max-w-100"
                                            style={{ maxWidth: '100%' }}
                                        >
                                            <i className="bi bi-file-earmark-arrow-down me-1 flex-shrink-0"></i> 
                                            <span className="text-truncate" style={{ maxWidth: '180px' }}>
                                                {file.file_name}
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-2 p-sm-3 animate-in">
                        <div className="border rounded shadow-sm bg-white">
                            <div className="bg-dark text-white p-2 d-flex justify-content-between align-items-center rounded-top">
                                <span className="small ps-2 text-truncate">New Message to {lead.client_name}</span>
                                <button className="btn btn-sm btn-link text-white py-0 flex-shrink-0" onClick={() => setView('list')}><i className="bi bi-x-lg"></i></button>
                            </div>
                            
                            <input 
                                type="text" 
                                className="form-control border-0 border-bottom rounded-0 py-2 small shadow-none" 
                                placeholder="Subject" 
                                value={composeData.subject}
                                onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                            />
                            
                            <textarea 
                                rows="6" 
                                className="form-control border-0 py-2 small shadow-none" 
                                placeholder="Write your email..." 
                                style={{ resize: 'none' }}
                                value={composeData.body}
                                onChange={(e) => setComposeData({...composeData, body: e.target.value})}
                            ></textarea>

                            {/* File Previews Grid */}
                            {selectedFiles.length > 0 && (
                                <div className="px-3 py-2 bg-light border-top d-flex flex-wrap gap-2">
                                    {selectedFiles.map((file, idx) => (
                                        <div key={idx} className="badge bg-secondary d-flex align-items-center gap-1 p-2 fw-normal text-truncate" style={{ fontSize: '0.75rem', maxWidth: '100%' }}>
                                            <i className="bi bi-paperclip flex-shrink-0"></i> 
                                            <span className="text-truncate" style={{ maxWidth: '140px' }}>{file.name}</span>
                                            <i 
                                                className="bi bi-x-circle cursor-pointer ms-1 text-white-50 hover-white flex-shrink-0" 
                                                onClick={() => removeFile(idx)}
                                                style={{ fontSize: '0.85rem' }}
                                            ></i>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="p-2 border-top bg-light d-flex gap-2 align-items-center flex-wrap">
                                <button className="btn btn-primary btn-sm px-3 px-sm-4 rounded shadow-sm" onClick={handleSendEmail} disabled={sending}>
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
                .hover-white:hover { color: #fff !important; }
                /* Custom Scrollbar */
                .overflow-y-auto::-webkit-scrollbar, .overflow-auto::-webkit-scrollbar { width: 6px; height: 6px; }
                .overflow-y-auto::-webkit-scrollbar-track, .overflow-auto::-webkit-scrollbar-track { background: #f1f1f1; }
                .overflow-y-auto::-webkit-scrollbar-thumb, .overflow-auto::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
            `}</style>
        </div>
    );
};

export default EmailCustomer;