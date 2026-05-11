import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../../api/axios';
import { toast } from 'react-hot-toast';

const EmailSupplier = ({ lead }) => {
    const [view, setView] = useState('list');
    const [emails, setEmails] = useState([]);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    
    // Naye states suppliers dropdown ke liye (Modal se liye gaye)
    const [suppliers, setSuppliers] = useState([]);
    const [suppliersLoading, setSuppliersLoading] = useState(false);

    const [selectedFiles, setSelectedFiles] = useState([]);
    const fileInputRef = useRef(null);
    const iframeRef = useRef(null);

    const [composeData, setComposeData] = useState({
        to: "", // Supplier ka email save karne ke liye
        subject: `Pricing Inquiry: Order/Lead #${lead?.order_no || lead?.lead_number || ''}`,
        body: `Hi,\n\nPlease provide pricing for the following items regarding Job #${lead?.order_no}.\n\nRegards,`
    });

    const ADMIN_EMAIL = "sales@theglasspeople.com";

    // 1. API se Suppliers fetch karne ka function (Modal logic)
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

    // 2. Email history fetch karne ka function
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

    // Initial useEffect history ke liye
    useEffect(() => {
        fetchEmails();
    }, [fetchEmails]);

    // useEffect jab compose view open ho tab suppliers fetch karein
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
        // Validation dropdown check
        if (!composeData.to) return toast.error("Please select a supplier");
        if (!composeData.body.trim()) return toast.error("Message body is empty");
        
        setSending(true);
        const formData = new FormData();
        formData.append('lead_id', lead.id);
        formData.append('to', composeData.to); // Selected supplier email
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
            // Reset form
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
        <div className="overflow-hidden d-flex flex-column" style={{ minHeight: '300px', fontFamily: '"Google Sans", Roboto, Arial, sans-serif' }}>
            
            <div className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom bg-white sticky-top">
                <div className="d-flex align-items-center">
                    {view !== 'list' && (
                        <button className="btn btn-link text-dark p-2 rounded-circle me-2" onClick={() => setView('list')}>
                            <i className="bi bi-arrow-left fs-5"></i>
                        </button>
                    )}
                    <span className="fw-medium text-secondary" style={{ fontSize: '0.9rem' }}>
                        {loading ? 'Refreshing...' : view === 'compose' ? 'New Message' : view === 'read' ? 'Supplier Conversation' : 'Supplier Messages'}
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
                            style={{ fontSize: '0.85rem', fontWeight: '500', background: '#2b3a67', border: 'none' }}>
                        <i className="bi bi-pencil me-2"></i> Compose
                    </button>
                )}
            </div>

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
                                        if (!msg.is_read && msg.sender !== ADMIN_EMAIL) {
                                            markAsRead(msg.id);
                                        }
                                    }}
                                    className={`d-flex align-items-center px-3 py-2 border-bottom cursor-pointer mail-item ${!msg.is_read && msg.sender !== ADMIN_EMAIL ? 'bg-white fw-bold shadow-sm' : 'bg-light-subtle'}`}
                                    style={{ borderLeft: !msg.is_read && msg.sender !== ADMIN_EMAIL ? '4px solid #2b3a67' : 'none' }}
                                >
                                    <div className={`rounded-circle text-white d-flex align-items-center justify-content-center me-3`} 
                                         style={{ width: '32px', height: '32px', minWidth: '32px', fontSize: '12px', background: isFromAdmin ? '#34497e' : '#6c757d' }}>
                                        {isFromAdmin ? 'Me' : 'S'}
                                    </div>
                                    <div className="flex-grow-1 text-truncate pe-3">
                                        <div className="d-flex justify-content-between">
                                            <span style={{ fontSize: '0.9rem' }}>{msg.sender}</span>
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
                            <div className="text-center p-5 text-muted small">No email history found. Click 'Compose' to send a new inquiry.</div>
                        )}
                    </div>
                ) : view === 'read' ? (
                    <div className="p-4 animate-in">
                        <h5 className="mb-4 text-dark fw-bold">{selectedEmail.subject}</h5>
                        <div className="d-flex align-items-center mb-4">
                            <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-3" style={{ width: '40px', height: '40px' }}>
                                {selectedEmail.sender === ADMIN_EMAIL ? 'M' : 'S'}
                            </div>
                            <div className="flex-grow-1">
                                <div className="small">
                                    <strong>{selectedEmail.sender === ADMIN_EMAIL ? 'Admin' : 'Supplier'}</strong> 
                                    <span className="text-muted ms-2">&lt;{selectedEmail.sender}&gt;</span>
                                </div>
                                <div className="text-muted small">to {selectedEmail.receiver === ADMIN_EMAIL ? 'me' : selectedEmail.receiver}</div>
                            </div>
                            <div className="text-muted small">{new Date(selectedEmail.created_at).toLocaleString()}</div>
                        </div>
                        
                        <div className="pt-3 border-top">
                            <iframe
                                ref={iframeRef}
                                title="email-content"
                                srcDoc={`
                                    <html>
                                        <head>
                                            <base target="_blank">
                                            <style>
                                                body { margin: 0; font-family: sans-serif; padding: 10px; }
                                                img { max-width: 100%; height: auto; }
                                                pre { white-space: pre-wrap; font-family: sans-serif; }
                                            </style>
                                        </head>
                                        <body>
                                            ${selectedEmail.html_body || `<pre>${selectedEmail.text_body}</pre>`}
                                        </body>
                                    </html>
                                `}
                                onLoad={handleIframeLoad}
                                scrolling="no"
                                style={{ width: '100%', border: 'none', overflow: 'hidden', display: 'block' }}
                            />
                        </div>
                        
                        {selectedEmail.attachments?.length > 0 && (
                            <div className="mt-4 pt-3 border-top">
                                <p className="small fw-bold">Attachments:</p>
                                <div className="d-flex flex-wrap gap-2">
                                    {selectedEmail.attachments.map(file => (
                                        <a 
                                            key={file.id} 
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
                        <div className="border rounded shadow-sm bg-white overflow-hidden">
                            <div className="text-white p-2 d-flex justify-content-between align-items-center rounded-top" style={{backgroundColor: '#2b3a67'}}>
                                <span className="small ps-2">New Message to supplier</span>
                                <button className="btn btn-sm btn-link text-white py-0" onClick={() => setView('list')}><i className="bi bi-x-lg"></i></button>
                            </div>

                            <div className="p-3">
                                {/* Supplier Dropdown loaded from API */}
                                <div className="mb-2 position-relative">
                                    <select 
                                        className="form-select border-0 border-bottom rounded-0 px-1 small shadow-none"
                                        value={composeData.to}
                                        onChange={(e) => setComposeData({...composeData, to: e.target.value})}
                                        style={{paddingLeft: '30px'}}
                                        disabled={suppliersLoading}
                                    >
                                        <option value="">{suppliersLoading ? 'Loading suppliers...' : 'Select Supplier...'}</option>
                                        {suppliers.map(sup => (
                                            <option key={sup.id} value={sup.email}>{sup.name} ({sup.email})</option>
                                        ))}
                                    </select>
                                </div>
                                
                                <div className="mb-2 position-relative">
                                    <input 
                                        type="text" 
                                        className="form-control border-0 border-bottom rounded-0 px-1 small shadow-none" 
                                        placeholder="Subject" 
                                        value={composeData.subject}
                                        style={{paddingLeft: '30px'}}
                                        onChange={(e) => setComposeData({...composeData, subject: e.target.value})}
                                    />
                                </div>
                                
                                <textarea 
                                    rows="10" 
                                    className="form-control border rounded-3 p-3 small shadow-none mt-3" 
                                    placeholder="Write your message or paste item details..." 
                                    style={{ resize: 'none', backgroundColor: '#f8f9fa' }}
                                    value={composeData.body}
                                    onChange={(e) => setComposeData({...composeData, body: e.target.value})}
                                ></textarea>

                                {selectedFiles.length > 0 && (
                                    <div className="mt-3 p-2 bg-light border rounded-3 d-flex flex-wrap gap-2">
                                        {selectedFiles.map((file, idx) => (
                                            <div key={idx} className="badge bg-secondary d-flex align-items-center gap-2 p-2 fw-normal" style={{ fontSize: '0.75rem' }}>
                                                <i className="bi bi-paperclip"></i> 
                                                <span className="text-truncate" style={{ maxWidth: '120px' }}>{file.name}</span>
                                                <i className="bi bi-x-circle cursor-pointer ms-1 text-white-50" onClick={() => removeFile(idx)}></i>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="mt-3 pt-2 border-top d-flex gap-2 align-items-center">
                                    <button 
                                        className="btn text-white btn-sm px-4 rounded-pill shadow-sm d-flex align-items-center gap-2" 
                                        style={{backgroundColor: '#2b3a67'}}
                                        onClick={handleSendEmail} 
                                        disabled={sending}
                                    >
                                        {sending ? (
                                            <>
                                                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                                Sending...
                                            </>
                                        ) : (
                                            <>
                                                <i className="bi bi-send"></i>
                                                Send Inquiry
                                            </>
                                        )}
                                    </button>
                                    <input type="file" multiple className="d-none" ref={fileInputRef} onChange={handleFileChange} accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
                                    <button className="btn btn-outline-secondary btn-sm rounded-circle" onClick={() => fileInputRef.current.click()} title="Attach Files">
                                        <i className="bi bi-paperclip"></i>
                                    </button>
                                    <button className="btn btn-light btn-sm rounded-pill ms-auto text-danger" onClick={() => {setView('list'); setSelectedFiles([]);}} title="Discard">
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
                .overflow-y-auto::-webkit-scrollbar { width: 6px; }
                .overflow-y-auto::-webkit-scrollbar-thumb { background: #ccc; border-radius: 10px; }
                
                /* Bootstrap icon alignment fix */
                .bi { vertical-align: -.125em; }
                
                /* Form select styling */
                .form-select {
                    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='m2 5 6 6 6-6'/%3e%3c/svg%3e");
                    background-size: 10px 10px;
                }
            `}</style>
        </div>
    );
};

export default EmailSupplier;