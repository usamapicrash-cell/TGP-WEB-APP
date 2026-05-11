import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../api/axios';
import StatusHandler from '../../../../components/StatusHandler';
import { toast } from 'react-hot-toast'; // Optional: for user feedback

const DetailsTab = ({ leadId }) => {
    const [lead, setLead] = useState(null);
    const [items, setItems] = useState([]);
    const [labour, setLabour] = useState(0);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchLeadDetails = async () => {
            setLoading(true);
            try {
                const { data } = await api.get(`/leads/${leadId}`);
                setLead(data);
                // Load existing quote if it exists
                if (data.active_quote) {
                    setItems(data.active_quote.items || []);
                    setLabour(data.active_quote.labour_total || 0);
                }
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        if (leadId) fetchLeadDetails();
    }, [leadId]);

    // Calculation Logic
    const subtotal = useMemo(() => items.reduce((sum, i) => sum + (i.qty * i.unit_price), 0), [items]);
    const total = subtotal + parseFloat(labour || 0);

    // Handlers
    const addItem = () => setItems([...items, { description: '', qty: 1, unit_price: 0 }]);
    
    const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

    const updateItem = (idx, field, val) => {
        const updated = [...items];
        updated[idx][field] = val;
        setItems(updated);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload = { items, labour_total: labour, subtotal, total_amount: total };
            const { data } = await api.post(`/leads/${leadId}/quote`, payload);
            setLead(prev => ({ ...prev, active_quote: data }));
            toast.success("Quote updated!");
        } catch (err) {
            toast.error("Failed to save quote");
        } finally {
            setSaving(false);
        }
    };

    const formatCurrency = (val) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);

    return (
        <StatusHandler loading={loading} error={error} data={lead}>
         <div className="row g-4">
            <div className="col-md-12">
                {/* Client Info Card */}
                <div className="card border-0 shadow-sm p-4 mb-4 h-100" style={{ borderRadius: '12px' }}>
                    <h6 className="text-primary mb-3 small fw-bold text-uppercase">Client Information</h6>
                    <div className="row g-3">
                        <div className="col-md-6 d-flex align-items-start">
                            <i className="bi bi-person text-muted me-3"></i>
                            <div>
                                <label className="text-muted small d-block">Client Name</label>
                                <span className="fw-semibold">{lead?.client_name}</span>
                            </div>
                        </div>

                        <div className="col-md-6 d-flex align-items-start">
                            <i className="bi bi-building text-muted me-3 mt-1"></i>
                            <div>
                                <label className="text-muted small d-block">Company</label>
                                <span className="fw-bold text-dark">{lead?.company || 'Private Client'}</span>
                            </div>
                        </div>

                        <div className="col-md-6 d-flex align-items-start">
                            <i className="bi bi-telephone text-muted me-3"></i>
                            <div>
                                <label className="text-muted small d-block">Phone Number</label>
                                <span className="">{lead?.phone}</span>
                            </div>
                        </div>
                        
                        <div className="col-md-6 d-flex align-items-start">
                            <i className="bi bi-envelope text-muted me-3"></i>
                            <div>
                                <label className="text-muted small d-block">Email Address</label>
                                {/* Note: Ensure your backend returns email or adjust field name */}
                                <span className="text-primary text-decoration-underline">{lead?.email || 'N/A'}</span>
                            </div>
                        </div>
                    </div>

                    <h6 className="text-primary mt-4 mb-3 small fw-bold text-uppercase">Address Information</h6>
                    <div className="row g-4 mb-2">
                        <div className="col-md-12 d-flex align-items-start">
                            <i className="bi bi-geo-alt text-muted me-3 mt-1"></i>
                            <div>
                                <label className="text-muted small d-block">Primary Address</label>
                                <span className="fw-semi-bold text-dark">{lead?.address || 'No address provided'}</span>
                            </div>
                        </div>
                        <div className="col-md-12 d-flex align-items-start">
                            <i className="bi bi-pin-map text-muted me-3 mt-1"></i>
                            <div>
                                <label className="text-muted small d-block">Job Site Address</label>
                                <span className="fw-semi-bold text-dark">{lead?.job_address || lead?.address}</span>
                                {(!lead?.job_address || lead?.job_address === lead?.address) && (
                                    <span className="badge bg-light text-muted fw-normal ms-2 border" style={{ fontSize: '10px' }}>Same as Primary</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

                {/* Right Side: Dynamic Quote */}
                {/*<div className="col-lg-6">
                    <div className="card border-0 shadow-sm p-4" style={{ borderRadius: '15px' }}>
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <h6 className="text-primary mb-0 small fw-bold text-uppercase">Quote Breakdown</h6>
                            <button onClick={addItem} className="btn btn-sm btn-outline-primary rounded-pill px-3">
                                <i className="bi bi-plus-lg me-1"></i> Add Item
                            </button>
                        </div>

                        <div className="table-responsive" style={{ maxHeight: '300px' }}>
                            <table className="table table-sm table-borderless align-middle">
                                <thead className="text-muted small border-bottom" style={{ fontSize: '10px' }}>
                                    <tr>
                                        <th style={{ width: '50%' }}>DESCRIPTION</th>
                                        <th className="text-center">QTY</th>
                                        <th className="text-end">PRICE</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => (
                                        <tr key={idx} className="border-bottom-dashed">
                                            <td className="py-2">
                                                <input type="text" className="form-control form-control-sm border-0 bg-light-subtle" 
                                                    value={item.description} onChange={(e) => updateItem(idx, 'description', e.target.value)} placeholder="Item..." />
                                            </td>
                                            <td>
                                                <input type="number" className="form-control form-control-sm border-0 bg-light-subtle text-center" 
                                                    value={item.qty} onChange={(e) => updateItem(idx, 'qty', e.target.value)} />
                                            </td>
                                            <td>
                                                <input type="number" className="form-control form-control-sm border-0 bg-light-subtle text-end" 
                                                    value={item.unit_price} onChange={(e) => updateItem(idx, 'unit_price', e.target.value)} />
                                            </td>
                                            <td>
                                                <button onClick={() => removeItem(idx)} className="btn btn-link btn-sm text-danger p-0"><i className="bi bi-x"></i></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="mt-4 p-3 bg-light rounded-3">
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted small">Labour/Install</span>
                                <input type="number" className="form-control form-control-sm border-0 bg-white text-end w-25 shadow-sm" 
                                    value={labour} onChange={(e) => setLabour(e.target.value)} />
                            </div>
                            <div className="d-flex justify-content-between pt-2 border-top">
                                <span className="fw-bold small text-dark">ESTIMATED TOTAL</span>
                                <span className="fw-bold text-primary fs-5">{formatCurrency(total)}</span>
                            </div>
                        </div>

                        <div className="d-grid gap-2 mt-4">
                            <button className="btn btn-primary fw-bold py-2" onClick={handleSave} disabled={saving}>
                                {saving ? <span className="spinner-border spinner-border-sm me-2"></span> : <i className="bi bi-cloud-check me-2"></i>}
                                SAVE QUOTE
                            </button>
                        </div>
                    </div>
                </div>*/}

                </div>
            </StatusHandler>
    );
};

export default DetailsTab;