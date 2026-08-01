import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../../api/axios';
import { toast } from 'react-hot-toast';

const EmailSupplier = ({ lead }) => {
    const [view, setView] = useState('list');
    const [emails, setEmails] = useState([]);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    
    const [suppliers, setSuppliers] = useState([]);
    const [suppliersLoading, setSuppliersLoading] = useState(false);

    const [selectedFiles, setSelectedFiles] = useState([]);
    const fileInputRef = useRef(null);
    const iframeRef = useRef(null);

    const [composeData, setComposeData] = useState({
        to: "",
        subject: `Pricing Inquiry: Order/Lead #${lead?.order_no || lead?.lead_number || ''}`,
        body: `Hi,\n\nPlease provide pricing for the following items regarding Job #${lead?.order_no}.\n\nRegards,`
    });

    const ADMIN_EMAIL = "sales@theglasspeople.com";

    const fetchSuppliers = useCallback(async () => {
        setSuppliersLoading(true);
        try {
            const res = await api.get('/suppliers');
            setSuppliers(res.data);
        } catch (e) {
            console.error("Suppliers fetch error:", e);
            toast.error("Could not fetch suppliers list");
        } finally {
            setSuppliersLoading(false);
        }
    }, []);

    const fetchEmails = useCallback(async () => {
        if (!lead?.order_no) return;
        setLoading(true);
        try {
            const res = await api.get(`/emails_supplier?lead_orderno=${lead.order_no}`);
            setEmails(Array.isArray(res.data) ? res.data : (res.data.emails || []));
        } catch (error) {
            console.error("Supplier Email fetch error:", error);
            toast.error("Failed to load supplier emails");
        } finally {
            setLoading(false);
        }
    }, [lead?.order_no]);

    useEffect(() => {
        fetchEmails();
    }, [fetchEmails]);

    useEffect(() => {
        if (view === 'compose') {
            fetchSuppliers();
        }
    }, [view, fetchSuppliers]);

    const handleIframeLoad = () => {
        if (iframeRef.current && iframeRef.current.contentWindow) {
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
        if (!composeData.to) return toast.error("Please select a supplier");
        if (!composeData.body.trim()) return toast.error("Message body is empty");
        
        setSending(true);
        const formData = new FormData();
        formData.append('lead_id', lead.id);
        formData.append('to', composeData.to);
        formData.append('type', 'supplier'); 
        formData.append('subject', composeData.subject);
        formData.append('body', composeData.body);
        
        selectedFiles.forEach(file => {
            formData.append('files[]', file);
        });

        try {
            await api.post('/emails/send', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Pricing request sent successfully");
            setView('list');
            setComposeData({ 
                to: "",
                subject: `Pricing Inquiry: Order/Lead #${lead?.order_no || lead?.lead_number || ''}`,
                body: `Hi,\n\nPlease provide pricing for the following items regarding Job #${lead?.order_no}.\n\nRegards,`
            });
            setSelectedFiles([]);
            fetchEmails(); 
        } catch (error) {
            console.error("Send error:", error);
            if (error.response && error.response.status === 422) {
                toast.error("Validation error. Please check all fields.");
            } else {
                toast.error("Failed to send email");
            }
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
        <div className="w-100 overflow-hidden d-flex flex-column rounded shadow-sm bg-white" style={{ minHeight: '350px', fontFamily: '"Google Sans", Roboto, Arial, sans-serif' }}>
            
            {/* Header */}
            <div className="d-flex align-items-center justify-content-between px-2 px-sm-3 py-2 border-bottom bg-white sticky-top flex-wrap gap-2">
                <div className="d-flex align-items-center flex-grow-1 min-w-0">
                    {view !== 'list' && (
                        <button className="btn btn-link text-dark p-1 me-1 me-sm-2 rounded-circle flex-shrink-0" onClick={() => setView('list')}>
                            <i className="bi bi-arrow-left fs-5"></i>
                        </button>
                    )}
                    <span className="fw-medium text-secondary text-truncate" style={{ fontSize: '0.85rem' }}>
                        {loading ? 'Refreshing...' : view === 'compose' ? 'New Message' : view === 'read' ? 'Supplier Conversation' : 'Supplier Messages'}
                    </span>
                    {view === 'list' && (
                        <button className="btn btn-link text-muted p-0 ms-2 ms-sm-3 flex-shrink-0" onClick={fetchEmails} disabled={loading}>
                            <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
                        </button>
                    )}
                </div>
                {view === 'list' && (
                    <button className="btn btn-primary rounded-pill px-3 py-1 shadow-sm d-flex align-items-center ms-auto" 
                            onClick={() => setView('compose')} 
                            style={{ fontSize: '0.8rem', fontWeight: '500', background: '#2b3a67', border: 'none' }}>
                        <i className="bi bi-pencil me-1 me-sm-2"></i> <span>Compose</span>
                    </button>
                )}
            </div>

            {/* Main Body */}
            <div className="flex-grow-1 overflow-auto supplier-email-body" style={{ maxHeight: '65vh', minHeight: '300px' }}>
                {loading && emails.length === 0 ? (
                    <div className="d-flex justify-content-center align-items-center h-100 p-5">
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
                                    className={`d-flex align-items-center px-2 px-sm-3 py-2 py-sm-3 border-bottom cursor-pointer mail-item ${!msg.is_read && msg.sender !== ADMIN_EMAIL ? 'bg-white fw-bold shadow-sm' : 'bg-light-subtle'}`}
                                    style={{ borderLeft: !msg.is_read && msg.sender !== ADMIN_EMAIL ? '4px solid #2b3a67' : 'none' }}
                                >
                                    <div className="rounded-circle text-white d-flex align-items-center justify-content-center me-2 me-sm-3 flex-shrink-0" 
                                         style={{ width: '32px', height: '32px', fontSize: '12px', background: isFromAdmin ? '#34497e' : '#6c757d' }}>
                                        {isFromAdmin ? 'Me' : 'S'}
                                    </div>
                                    <div className="flex-grow-1 text-truncate pe-1 pe-sm-2 min-w-0">
                                        <div className="d-flex justify-content-between align-items-center gap-1">
                                            <span className="text-truncate" style={{ fontSize: '0.85rem' }}>{msg.sender}</span>
                                            <span className="text-muted small fw-normal flex-shrink-0" style={{ fontSize: '0.75rem' }}>
                                                {new Date(msg.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                            </span>
                                        </div>
                                        <div className="text-truncate" style={{ fontSize: '0.8rem', color: '#5f6368' }}>
                                            {msg.subject}
                                        </div>
                                    </div>
                                    {msg.attachments_count > 0 && <i className="bi bi-paperclip text-muted ms-1 flex-shrink-0"></i>}
                                </div>
                            );
                        }) : (
                            <div className="text-center p-4 p-sm-5 text-muted small">No email history found. Click 'Compose' to send a new inquiry.</div>
                        )}
                    </div>
                ) : view === 'read' ? (
                    <div className="p-2 p-sm-4 animate-in">
                        <h6 className="mb-3 text-dark fw-bold text-break fs-6 fs-sm-5">{selectedEmail.subject}</h6>
                        <div className="d-flex align-items-start mb-3 gap-2">
                            <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center flex-shrink-0" style={{ width: '36px', height: '36px', fontSize: '14px' }}>
                                {selectedEmail.sender === ADMIN_EMAIL ? 'M' : 'S'}
                            </div>
                            <div className="flex-grow-1 min-w-0">
                                <div className="small text-truncate">
                                    <strong>{selectedEmail.sender === ADMIN_EMAIL ? 'Admin' : 'Supplier'}</strong> 
                                    <span className="text-muted ms-1 text-break">&lt;{selectedEmail.sender}&gt;</span>
                                </div>
                                <div className="text-muted small text-truncate">to {selectedEmail.receiver === ADMIN_EMAIL ? 'me' : selectedEmail.receiver}</div>
                                <div className="text-muted small" style={{ fontSize: '0.75rem' }}>{new Date(selectedEmail.created_at).toLocaleString()}</div>
                            </div>
                        </div>
                        
                        <div className="pt-2 border-top w-100">
                            <iframe
                                ref={iframeRef}
                                title="email-content"
                                srcDoc={`
                                    <html>
                                        <head>
                                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                            <base target="_blank">
                                            <style>
                                                body { margin: 0; font-family: sans-serif; padding: 5px; word-wrap: break-word; font-size: 14px; }
                                                img { max-width: 100%; height: auto; }
                                                pre { white-space: pre-wrap; font-family: sans-serif; word-break: break-all; }
                                            </style>
                                        </head>
                                        <body>
                                            ${selectedEmail.html_body || `<pre>${selectedEmail.text_body}</pre>`}
                                        </body>
                                    </html>
                                `}
                                onLoad={handleIframeLoad}
                                scrolling="no"
                                style={{ width: '100%', border: 'none', overflow: 'hidden', display: 'block', minHeight: '150px' }}
                            />
                        </div>
                        
                        {selectedEmail.attachments?.length > 0 && (
                            <div className="mt-3 pt-3 border-top">
                                <p className="small fw-bold mb-2">Attachments:</p>
                                <div className="d-flex flex-wrap gap-2">
                                    {selectedEmail.attachments.map(file => (
                                        <a 
                                            key={file.id} 
                                            href={`${import.meta.env.VITE_STORAGE_URL}/${file.file_path}`} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="btn btn-sm btn-outline-secondary d-flex align-items-center max-w-100"
                                        >
                                            <i className="bi bi-file-earmark-arrow-down me-1 flex-shrink-0"></i> 
                                            <span className="text-truncate" style={{ maxWidth: '140px' }}>
                                                {file.file_name}
                                            </span>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Compose View */
                    <div className="p-2 p-sm-3 animate-in">
                        <div className="border rounded shadow-sm bg-white overflow-hidden">
                            <div className="text-white p-2 d-flex justify-content-between align-items-center rounded-top" style={{backgroundColor: '#2b3a67'}}>
                                <span className="small ps-1 ps-sm-2 text-truncate">New Message to supplier</span>
                                <button className="btn btn-sm btn-link text-white py-0 px-1" onClick={() => setView('list')}><i className="bi bi-x-lg"></i></button>
                            </div>

                            <div className="p-2 p-sm-3">
                                {/* Supplier Dropdown */}
                                <div className="mb-2">
                                    <select 
                                        className="form-select border-0 border-bottom rounded-0 px-1 small shadow-none"
                                        value={composeData.to}
                                        onChange={(e) => setComposeData({...composeData, to: e.target.value})}
                                        disabled={suppliersLoading}
                                    >
                                        <option value="">{suppliersLoading ? 'Loading suppliers...' : 'Select Supplier...'}</option>
                                        {suppliers.map(sup => (
                                            <option key={sup.id} value={sup.email}>{sup.name} ({sup.email})</option>
                                        ))}
                                    </select>
                                </div>
                                
                                {/* Subject Input */}
                                <div className="mb-2">
                                    <input 
                                        type="text" 
                                        className="form-control border-0 border-bottom rounded-0 px-1 small shadow-none" 
                                        placeholder="Subject" 
                                        value={composeData.subject}
                                        onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                                    />
                                </div>
                                
                                {/* Body Input */}
                                <textarea 
                                    rows="8" 
                                    className="form-control border rounded-3 p-2 p-sm-3 small shadow-none mt-2" 
                                    placeholder="Write your message or paste item details..." 
                                    style={{ resize: 'vertical', minHeight: '120px', backgroundColor: '#f8f9fa' }}
                                    value={composeData.body}
                                    onChange={(e) => setComposeData({...composeData, body: e.target.value})}
                                ></textarea>

                                {/* Attachments List */}
                                {selectedFiles.length > 0 && (
                                    <div className="mt-2 p-2 bg-light border rounded-3 d-flex flex-wrap gap-2">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="badge bg-secondary d-flex align-items-center gap-1 p-2 fw-normal max-w-100" style={{ fontSize: '0.75rem' }}>
                                                <i className="bi bi-paperclip flex-shrink-0"></i> 
                                                <span className="text-truncate" style={{ maxWidth: '100px' }}>{file.name}</span>
                                                <i className="bi bi-x-circle cursor-pointer ms-1 text-white-50 flex-shrink-0" onClick={() => removeFile(idx)}></i>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Action Buttons */}
                                <div className="mt-3 pt-2 border-top d-flex flex-wrap gap-2 align-items-center justify-content-between">
                                    <div className="d-flex align-items-center gap-2">
                                        <button 
                                            className="btn text-white btn-sm px-3 px-sm-4 rounded-pill shadow-sm d-flex align-items-center gap-1 gap-sm-2" 
                                            style={{backgroundColor: '#2b3a67'}}
                                            onClick={handleSendEmail} 
                                            disabled={sending}
                                        >
                                            {sending ? (
                                                <>
                                                    <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                    <span>Sending...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <i className="bi bi-send"></i>
                                                    <span>Send Inquiry</span>
                                                </>
                                            )}
                                        </button>

                                        <input type="file" multiple className="d-none" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
                                        <button className="btn btn-outline-secondary btn-sm rounded-circle d-flex align-items-center justify-content-center" style={{ width: '32px', height: '32px' }} onClick={() => fileInputRef.current.click()} title="Attach Files">
                                            <i className="bi bi-paperclip"></i>
                                        </button>
                                    </div>

                                    <button className="btn btn-light btn-sm rounded-pill text-danger px-2 px-sm-3 ms-auto" onClick={() => {setView('list'); setSelectedFiles([]);}} title="Discard">
                                        <i className="bi bi-trash me-1"></i> Discard
                                    </button>
                                </div>
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
                .supplier-email-body::-webkit-scrollbar { width: 5px; }
                .supplier-email-body::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
                
                .bi { vertical-align: -.125em; }
                .min-w-0 { min-width: 0 !important; }
                .max-w-100 { max-width: 100% !important; }
                .cursor-pointer { cursor: pointer; }

                .form-select {
                    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
                    background-size: 10px 10px;
                }
            `}</style>
        </div>
    );
};

export default EmailSupplier;