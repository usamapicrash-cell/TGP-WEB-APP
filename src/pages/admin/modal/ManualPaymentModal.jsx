import React, { useState, useEffect } from 'react'; // useEffect add kiya
import api from '../../../api/axios';
import { notify } from '../../../utils/notifier';
import { toast } from 'react-hot-toast';

const ManualPaymentModal = ({ isOpen, onClose, leadId, onPaymentSuccess }) => {
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        lead_id: '', 
        amount: '',
        payment_method: 'Bank Transfer',
        payment_date: new Date().toISOString().split('T')[0],
        transaction_id: '',
        receipt: null,
        internal_notes: ''
    });

    // Jab modal khule ya leadId change ho, tab state update karein
    useEffect(() => {
        if (isOpen && leadId) {
            setFormData(prev => ({ ...prev, lead_id: leadId }));
        }
    }, [isOpen, leadId]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // Final check for Lead ID
        if (!formData.lead_id) {
            return notify.error("Lead ID is missing. Please refresh.");
        }

        if (!formData.amount || formData.amount <= 0) {
            return notify.error("Please enter a valid amount");
        }

        const toastId = toast.loading("Processing Manual Payment & Invoice...");
        setSaving(true);

        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key] !== null && formData[key] !== '') {
                data.append(key, formData[key]);
            }
        });

        try {
            await api.post('/payments/manual', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Invoice Created & Payment Recorded!", { id: toastId });
            onPaymentSuccess();
            onClose();
        } catch (err) {
            // Agar validation error aaye toh details check karein
            console.error("Payment Error:", err.response?.data);
            toast.error(err.response?.data?.message || "Failed to process payment", { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
                    <div className="modal-header border-0 pb-0">
                        <h6 className="fw-bold text-primary mb-0 text-uppercase">Record Manual Payment</h6>
                        <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                    </div>
                    
                    <form onSubmit={handleSubmit} className="modal-body p-4">
                        {/* Debugging (Optional): <small>Lead ID: {formData.lead_id}</small> */}
                        
                        <div className="row g-3 mb-3">
                            <div className="col-md-6">
                                <label className="text-muted small fw-bold mb-1">AMOUNT ($) *</label>
                                <input 
                                    type="number" 
                                    step="0.01" 
                                    className="form-control form-control-sm border-0 bg-light" 
                                    required
                                    placeholder="0.00" 
                                    value={formData.amount}
                                    onChange={e => setFormData({...formData, amount: e.target.value})} 
                                />
                            </div>
                            <div className="col-md-6">
                                <label className="text-muted small fw-bold mb-1">PAYMENT DATE</label>
                                <input 
                                    type="date" 
                                    className="form-control form-control-sm border-0 bg-light" 
                                    value={formData.payment_date}
                                    onChange={e => setFormData({...formData, payment_date: e.target.value})} 
                                />
                            </div>
                        </div>

                        <div className="mb-3">
                            <label className="text-muted small fw-bold mb-1">PAYMENT METHOD</label>
                            <select 
                                className="form-control border-0 bg-light" 
                                value={formData.payment_method}
                                onChange={e => setFormData({...formData, payment_method: e.target.value})}
                            >
                                <option value="Bank Transfer">Bank Transfer</option>
                                <option value="Cash">Cash</option>
                                <option value="Cheque">Cheque</option>
                            </select>
                        </div>

                        <div className="mb-3">
                            <label className="text-muted small fw-bold mb-1">REF / TRANSACTION ID</label>
                            <input 
                                type="text" 
                                className="form-control form-control-sm border-0 bg-light" 
                                placeholder="e.g. Bank Ref #"
                                value={formData.transaction_id}
                                onChange={e => setFormData({...formData, transaction_id: e.target.value})} 
                            />
                        </div>

                        <div className="mb-3">
                            <label className="text-muted small fw-bold mb-1">ATTACH SLIP (OPTIONAL)</label>
                            <input 
                                type="file" 
                                className="form-control form-control-sm border-0 bg-light" 
                                accept="image/*"
                                onChange={e => setFormData({...formData, receipt: e.target.files[0]})} 
                            />
                        </div>

                        <div className="mt-4">
                            <button type="submit" disabled={saving} className="btn btn-primary w-100 py-2 fw-bold shadow-sm" style={{ borderRadius: '8px' }}>
                                {saving ? 'PROCESSING...' : 'RECORD & GENERATE INVOICE'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default ManualPaymentModal;