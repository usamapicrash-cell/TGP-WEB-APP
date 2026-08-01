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
        <div className="row g-3 g-lg-4">
            <style>
                {`
                    .quote-input-bg {
                        background-color: #f8fafc !important;
                        border: 1px solid #e2e8f0 !important;
                    }
                    .quote-input-bg:focus {
                        border-color: #34497e !important;
                        background-color: #ffffff !important;
                    }
                `}
            </style>

            {/* Editor Side */}
            <div className="col-12 col-lg-8">
                <div className="card border-0 shadow-sm p-3 p-sm-4 rounded-4 bg-white">
                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-2">
                        <div>
                            <h6 className="text-primary mb-0 fw-bold text-uppercase" style={{ letterSpacing: '0.5px' }}>Quote Editor</h6>
                            <small className="text-muted">Create or modify pricing structure</small>
                        </div>
                        <button 
                            onClick={() => setItems([...items, { description: '', qty: 1, unit_price: 0 }])} 
                            className="btn btn-sm btn-primary rounded-pill px-3 py-2 fw-medium d-inline-flex align-items-center"
                        >
                            <i className="bi bi-plus-lg me-1"></i> ADD ITEM
                        </button>
                    </div>

                    {/* Desktop & Tablet Table View */}
                    <div className="d-none d-md-block table-responsive">
                        <table className="table table-borderless align-middle">
                            <thead className="text-muted small">
                                <tr className="border-bottom">
                                    <th style={{ width: '50%' }}>DESCRIPTION</th>
                                    <th className="text-center" style={{ width: '18%' }}>QTY</th>
                                    <th className="text-end" style={{ width: '22%' }}>PRICE ($)</th>
                                    <th className="text-end" style={{ width: '10%' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx} className="border-bottom-dashed">
                                        <td className="py-2">
                                            <input 
                                                type="text" 
                                                className="form-control form-control-sm quote-input-bg py-2" 
                                                placeholder="Item details..."
                                                value={item.description} 
                                                onChange={(e) => updateItem(idx, 'description', e.target.value)} 
                                            />
                                        </td>
                                        <td className="py-2">
                                            <input 
                                                type="number" 
                                                className="form-control form-control-sm quote-input-bg text-center py-2" 
                                                value={item.qty} 
                                                onChange={(e) => updateItem(idx, 'qty', e.target.value)} 
                                            />
                                        </td>
                                        <td className="py-2">
                                            <input 
                                                type="number" 
                                                className="form-control form-control-sm quote-input-bg text-end py-2" 
                                                value={item.unit_price} 
                                                onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} 
                                            />
                                        </td>
                                        <td className="text-end py-2">
                                            <button 
                                                onClick={() => setItems(items.filter((_, i) => i !== idx))} 
                                                className="btn btn-link text-danger p-1 shadow-none"
                                                title="Remove Item"
                                            >
                                                <i className="bi bi-trash fs-6"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Cards View (App-like UX) */}
                    <div className="d-block d-md-none mb-3">
                        {items.map((item, idx) => (
                            <div key={idx} className="p-3 border rounded-3 mb-3 bg-light-subtle position-relative">
                                <button 
                                    onClick={() => setItems(items.filter((_, i) => i !== idx))} 
                                    className="btn btn-sm btn-link text-danger p-0 position-absolute top-0 end-0 mt-2 me-2"
                                >
                                    <i className="bi bi-trash fs-5"></i>
                                </button>
                                
                                <div className="mb-2 pe-4">
                                    <label className="form-label small text-muted mb-1 fw-bold">Item Description</label>
                                    <input 
                                        type="text" 
                                        className="form-control form-control-sm bg-white" 
                                        placeholder="Description"
                                        value={item.description} 
                                        onChange={(e) => updateItem(idx, 'description', e.target.value)} 
                                    />
                                </div>

                                <div className="row g-2">
                                    <div className="col-6">
                                        <label className="form-label small text-muted mb-1 fw-bold">Quantity</label>
                                        <input 
                                            type="number" 
                                            className="form-control form-control-sm bg-white text-center" 
                                            value={item.qty} 
                                            onChange={(e) => updateItem(idx, 'qty', e.target.value)} 
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small text-muted mb-1 fw-bold">Price ($)</label>
                                        <input 
                                            type="number" 
                                            className="form-control form-control-sm bg-white text-end" 
                                            value={item.unit_price} 
                                            onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} 
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {items.length === 0 && (
                        <div className="text-center py-5 border rounded-3 bg-light my-2">
                            <i className="bi bi-receipt text-muted fs-1 mb-2 d-block"></i>
                            <span className="text-muted small">No items added to this quote yet.</span>
                        </div>
                    )}

                    {/* Footer / Summary Action Block */}
                    <div className="row mt-4 pt-3 border-top">
                        <div className="col-12 col-md-7 col-lg-6 ms-auto">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className="fw-bold text-secondary">TOTAL</span>
                                <span className="fw-bold text-primary fs-3">${total.toLocaleString()}</span>
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-outline-secondary flex-grow-1 rounded-3 py-2 fw-medium" onClick={resetForm}>
                                    CLEAR
                                </button>
                                <button 
                                    className="btn btn-primary flex-grow-1 rounded-3 py-2 fw-medium shadow-sm" 
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
            <div className="col-12 col-lg-4">
                <StatusHandler loading={loading} error={error} data={history} loadingText="Loading Quote History...">
                    <div className="card border-0 rounded-4 p-3 p-sm-4 bg-white shadow-sm h-100">
                        <h6 className="text-muted mb-3 small fw-bold text-uppercase" style={{ letterSpacing: '0.5px' }}>Quote History</h6>
                        
                        <div className="overflow-auto" style={{ maxHeight: '600px', paddingRight: '2px' }}>
                            {history.length > 0 ? history.map((q, index) => (
                                <div key={q.id} className={`p-3 border rounded-3 mb-3 bg-white ${q.status === 'rejected' ? 'opacity-75 bg-light' : 'border-light-subtle shadow-sm'}`}>
                                    <div className="d-flex justify-content-between mb-2 align-items-center">
                                        <span className="fw-bold small text-truncate" style={{ maxWidth: '120px' }}>
                                            {q.quote_number || `Quote #${q.id}`}
                                        </span>
                                        
                                        <div className="dropdown">
                                            <button 
                                                className={`btn btn-sm ${index === 0 ? 'dropdown-toggle' : ''} rounded-pill px-2 py-1 border-0 ${
                                                    q.status === 'approved' ? 'bg-success text-white' : 
                                                    q.status === 'sent' ? 'bg-info text-white' : 
                                                    q.status === 'rejected' ? 'bg-danger text-white' : 'bg-warning text-dark'
                                                }`}
                                                type="button"
                                                data-bs-toggle={index === 0 ? "dropdown" : ""}
                                                disabled={updatingStatus === q.id || index !== 0}
                                                style={{ fontSize: '11px', fontWeight: '600', cursor: index === 0 ? 'pointer' : 'default' }}
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

                                    <div className="d-flex justify-content-between align-items-center my-2">
                                        <span className="fw-bold text-primary fs-5">${parseFloat(q.total_amount).toLocaleString()}</span>
                                        <div className="btn-group shadow-sm bg-light rounded-2 border">
                                            <button onClick={() => handleViewPdf(q.id)} className="btn btn-sm btn-link text-danger p-1 px-2 border-0" title="View PDF">
                                                <i className="bi bi-file-pdf fs-6"></i>
                                            </button>
                                            {index === 0 && q.status !== 'rejected' && (
                                                <button onClick={() => loadQuoteIntoEditor(q)} className="btn btn-sm btn-link text-primary p-1 px-2 border-0" title="Edit Quote">
                                                    <i className="bi bi-pencil-square fs-6"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-2" style={{ fontSize: '11px' }}>
                                        <span className="text-muted">{new Date(q.created_at).toLocaleDateString()}</span>
                                        <div className="d-flex gap-2 align-items-center">
                                            {q.status === 'approved' && <i className="bi bi-patch-check-fill text-success fs-6"></i>}
                                            {index === 0 && <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2" style={{ fontSize: '9px' }}>LATEST</span>}
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