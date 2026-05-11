import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../api/axios';
import { notify } from '../../../../utils/notifier';
import { toast } from 'react-hot-toast';
import StatusHandler from '../../../../components/StatusHandler';

const QuoteTab = ({ leadId }) => {
    // --- State Management ---
    const [quoteId, setQuoteId] = useState(null);
    const [items, setItems] = useState([]);
    const [labour, setLabour] = useState(0);
    const [status, setStatus] = useState('draft');
    const [saving, setSaving] = useState(false);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(null);

    // --- Calculations ---
    const subtotal = useMemo(() => {
        return items.reduce((sum, i) => sum + (parseFloat(i.qty || 0) * parseFloat(i.unit_price || 0)), 0);
    }, [items]);

    const total = useMemo(() => {
        return subtotal + parseFloat(labour || 0);
    }, [subtotal, labour]);

    // --- API Interactions ---
    const fetchQuoteData = async () => {
        if (!leadId) return;
        setLoading(true);
        try {
            // Fetch history and active lead data in parallel
            const [historyRes, leadRes] = await Promise.all([
                api.get(`/leads/${leadId}/quotes`),
                api.get(`/leads/${leadId}`)
            ]);

            setHistory(historyRes.data);

            const activeQuote = leadRes.data.active_quote;
            if (activeQuote) {
                setQuoteId(activeQuote.id);
                setItems(activeQuote.items || []);
                setLabour(activeQuote.labour_total || 0);
                setStatus(activeQuote.status || 'draft');
            } else {
                resetForm();
            }
            setError(null);
        } catch (err) {
            console.error("Error fetching quotes", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuoteData();
    }, [leadId]);

    const handleStatusChange = async (id, newStatus) => {
        setUpdatingStatus(id);
        const toastId = toast.loading(`Updating to ${newStatus}...`);
        try {
            await api.patch(`/quotes/${id}/status`, { status: newStatus });
            toast.success(`Quote ${newStatus}`, { id: toastId });
            fetchQuoteData();
        } catch (err) {
            toast.error("Failed to update status", { id: toastId });
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleSave = async () => {
        if (items.length === 0) return notify.error("Please add at least one item");
        setSaving(true);
        try {
            const payload = { 
                items, 
                labour_total: labour, 
                subtotal, 
                total_amount: total, 
                status: 'draft' 
            };
            await api.post(`/leads/${leadId}/quote`, payload);
            notify.success("New Quote Version Created");
            resetForm();
            fetchQuoteData();
        } catch (err) {
            notify.error("Error saving quote");
        } finally {
            setSaving(false);
        }
    };

    const handleViewPdf = async (id) => {
        const toastId = toast.loading("Generating PDF...");
        try {
            const response = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
            const file = new Blob([response.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            window.open(fileURL);
            toast.success("PDF Opened", { id: toastId });
            setTimeout(() => URL.revokeObjectURL(fileURL), 10000);
        } catch (err) {
            toast.error("Could not generate PDF", { id: toastId });
        }
    };

    // --- Helper Functions ---
    const updateItem = (idx, field, val) => {
        const updated = [...items];
        updated[idx][field] = val;
        setItems(updated);
    };

    const resetForm = () => {
        setItems([]);
        setLabour(0);
        setStatus('draft');
        setQuoteId(null);
    };

    const loadQuoteIntoEditor = (q) => {
        setQuoteId(q.id);
        setItems(q.items || []);
        setLabour(q.labour_total || 0);
        setStatus(q.status);
        notify.info(`Loaded ${q.quote_number || 'Quote'} for editing`);
    };

    return (
        <div className="row g-4">
            {/* Editor Side */}
            <div className="col-lg-8">
                <div className="card border-0 shadow-sm p-4" style={{ borderRadius: '15px' }}>
                    <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom">
                        <div>
                            <h6 className="text-primary mb-0 fw-bold text-uppercase">Quote Editor</h6>
                            <small className="text-muted">Create a new version</small>
                        </div>
                        <button 
                            onClick={() => setItems([...items, { description: '', qty: 1, unit_price: 0 }])} 
                            className="btn btn-sm btn-primary rounded-pill px-3"
                        >
                            <i className="bi bi-plus-lg me-1"></i> ADD ITEM
                        </button>
                    </div>

                    <div className="table-responsive">
                        <table className="table table-borderless align-middle">
                            <thead className="text-muted small">
                                <tr className="border-bottom">
                                    <th style={{ width: '55%' }}>DESCRIPTION</th>
                                    <th className="text-center">QTY</th>
                                    <th className="text-end">PRICE</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx} className="border-bottom-dashed">
                                        <td>
                                            <input 
                                                type="text" 
                                                className="form-control form-control-sm border-0 bg-light" 
                                                value={item.description} 
                                                onChange={(e) => updateItem(idx, 'description', e.target.value)} 
                                            />
                                        </td>
                                        <td>
                                            <input 
                                                type="number" 
                                                className="form-control form-control-sm border-0 bg-light text-center" 
                                                value={item.qty} 
                                                onChange={(e) => updateItem(idx, 'qty', e.target.value)} 
                                            />
                                        </td>
                                        <td>
                                            <input 
                                                type="number" 
                                                className="form-control form-control-sm border-0 bg-light text-end" 
                                                value={item.unit_price} 
                                                onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} 
                                            />
                                        </td>
                                        <td className="text-end">
                                            <button 
                                                onClick={() => setItems(items.filter((_, i) => i !== idx))} 
                                                className="btn btn-link text-danger p-0 shadow-none"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {items.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="text-center py-4 text-muted small">No items added.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="row mt-4">
                        <div className="col-md-5 ms-auto text-end">
                            {/*<div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-muted small">Labour</span>
                                <input 
                                    type="number" 
                                    className="form-control form-control-sm border-0 bg-light text-end w-50" 
                                    value={labour} 
                                    onChange={(e) => setLabour(e.target.value)} 
                                />
                            </div>*/}
                            <div className="d-flex justify-content-between align-items-center border-top pt-2">
                                <span className="fw-bold">TOTAL</span>
                                <span className="fw-bold text-primary fs-4">${total.toLocaleString()}</span>
                            </div>
                            <div className="d-flex gap-2 mt-3">
                                <button className="btn btn-light flex-grow-1" onClick={resetForm}>CLEAR</button>
                                <button 
                                    className="btn btn-primary flex-grow-1 shadow-sm" 
                                    onClick={handleSave} 
                                    disabled={saving}
                                >
                                    {saving ? 'SAVING...' : 'SAVE QUOTE'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Sidebar */}
            <div className="col-lg-4">
                <StatusHandler loading={loading} error={error} data={history} loadingText="Loading Quote Details...">
                    <div className="card border-0 h-100 p-3" style={{ borderRadius: '15px', backgroundColor: '#f8f9fa' }}>
                        <h6 className="text-muted mb-4 small fw-bold text-uppercase">Quote History</h6>
                        <div className="overflow-auto" style={{ maxHeight: '600px' }}>
                            {history.length > 0 ? history.map((q, index) => (
                                <div key={q.id} className={`p-3 border rounded-3 mb-3 bg-white shadow-sm ${q.status === 'rejected' ? 'opacity-75 bg-light' : 'border-primary-subtle'}`}>
                                    <div className="d-flex justify-content-between mb-2 align-items-center">
                                        <span className="fw-bold small text-truncate" style={{ maxWidth: '110px' }}>
                                            {q.quote_number || `Quote #${q.id}`}
                                        </span>
                                        
                                        <div className="dropdown">
                                            <button 
                                                className={`btn btn-sm ${index === 0 ? 'dropdown-toggle' : ''} rounded-pill px-2 py-0 border-0 ${
                                                    q.status === 'approved' ? 'bg-success text-white' : 
                                                    q.status === 'sent' ? 'bg-info text-white' : 
                                                    q.status === 'rejected' ? 'bg-danger text-white' : 'bg-warning text-dark'
                                                }`}
                                                type="button"
                                                data-bs-toggle={index === 0 ? "dropdown" : ""}
                                                disabled={updatingStatus === q.id || index !== 0}
                                                style={{ fontSize: '10px', cursor: index === 0 ? 'pointer' : 'default' }}
                                            >
                                                {updatingStatus === q.id ? '...' : q.status.toUpperCase()}
                                            </button>
                                            
                                            {index === 0 && (
                                                <ul className="dropdown-menu dropdown-menu-end shadow border-0 small">
                                                    <li><button className="dropdown-item small" onClick={() => handleStatusChange(q.id, 'draft')}>Mark as Draft</button></li>
                                                    <li><button className="dropdown-item small" onClick={() => handleStatusChange(q.id, 'sent')}>Mark as Sent</button></li>
                                                    <li><button className="dropdown-item small text-success fw-bold" onClick={() => handleStatusChange(q.id, 'approved')}>Mark as Approved</button></li>
                                                    <li><hr className="dropdown-divider" /></li>
                                                    <li><button className="dropdown-item small text-danger" onClick={() => handleStatusChange(q.id, 'rejected')}>Reject Quote</button></li>
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center">
                                        <span className="fw-bold text-primary">${parseFloat(q.total_amount).toLocaleString()}</span>
                                        <div className="btn-group shadow-sm bg-white rounded">
                                            <button onClick={() => handleViewPdf(q.id)} className="btn btn-sm btn-outline-danger border-0">
                                                <i className="bi bi-file-pdf"></i>
                                            </button>
                                            {index === 0 && q.status !== 'rejected' && (
                                                <button onClick={() => loadQuoteIntoEditor(q)} className="btn btn-sm btn-outline-primary border-0">
                                                    <i className="bi bi-pencil-square"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="d-flex justify-content-between mt-2 align-items-center" style={{ fontSize: '10px' }}>
                                        <span className="text-muted">{new Date(q.created_at).toLocaleDateString()}</span>
                                        <div className="d-flex gap-2">
                                            {q.status === 'approved' && <i className="bi bi-patch-check-fill text-success"></i>}
                                            {index === 0 && <span className="text-primary fw-bold" style={{fontSize: '9px'}}>LATEST</span>}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-5 text-muted small">No history found</div>
                            )}
                        </div>
                    </div>
                </StatusHandler>
            </div>
        </div>
    );
};

export default QuoteTab;