import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { notify } from '../../../utils/notifier';

const HelcimLinkModal = ({ isOpen, onClose, leadId, remainingBalance, onSuccess }) => {
    // Initial amount ko balance ke barabar rakha hai
    const [amount, setAmount] = useState(remainingBalance);
    const [description, setDescription] = useState('Payment for project services');
    const [loading, setLoading] = useState(false);

    // Jab bhi modal khule, latest remaining balance set ho jaye
    useEffect(() => {
        if (isOpen) {
            setAmount(remainingBalance);
        }
    }, [isOpen, remainingBalance]);

    if (!isOpen) return null;

    const handleAmountChange = (e) => {
        const val = e.target.value;
        
        // Agar user balance se zyada type kare
        if (parseFloat(val) > parseFloat(remainingBalance)) {
            notify.error(`Amount cannot exceed the remaining balance of $${remainingBalance}`);
            setAmount(remainingBalance); // Auto-reset to max
            return;
        }
        
        setAmount(val);
    };

    const handleGenerateLink = async (e) => {
        e.preventDefault();

        // Final validation before submission
        if (amount <= 0) {
            return notify.error("Amount must be greater than 0");
        }

        if (parseFloat(amount) > parseFloat(remainingBalance) + 0.01) {
            return notify.error("Invalid amount: exceeds remaining balance");
        }

        setLoading(true);
        try {
            const { data } = await api.post(`/leads/${leadId}/helcim-link`, {
                amount: amount,
                description: description
            });

            notify.success("Payment link generated and sent!");
            if (data.checkout_url) {
                window.open(data.checkout_url, '_blank');
            }
            onSuccess();
            onClose();
        } catch (err) {
            notify.error(err.response?.data?.message || "Failed to generate link");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow" style={{ borderRadius: '15px' }}>
                    <div className="modal-header border-0 pb-0">
                        <h5 className="fw-bold">Helcim Payment Link</h5>
                        <button type="button" className="btn-close" onClick={onClose} disabled={loading}></button>
                    </div>
                    <form onSubmit={handleGenerateLink}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="small fw-bold text-muted mb-1">AMOUNT TO CHARGE ($)</label>
                                <input 
                                    type="number" 
                                    step="0.01"
                                    className="form-control shadow-none" 
                                    value={amount}
                                    onChange={handleAmountChange}
                                    max={remainingBalance}
                                    required 
                                />
                                <div className="d-flex justify-content-between align-items-center mt-1">
                                    <small className="text-muted">Balance remaining: <strong>${remainingBalance}</strong></small>
                                    <small 
                                        className="text-primary fw-bold" 
                                        style={{ cursor: 'pointer', fontSize: '11px' }}
                                        onClick={() => setAmount(remainingBalance)}
                                    >
                                        SET MAX
                                    </small>
                                </div>
                            </div>
                            <div className="mb-3">
                                <label className="small fw-bold text-muted mb-1">DESCRIPTION</label>
                                <textarea 
                                    className="form-control shadow-none" 
                                    rows="3"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="e.g. Deposit for Glass Installation"
                                    required
                                ></textarea>
                            </div>
                        </div>
                        <div className="modal-footer border-0 pt-0">
                            <button type="button" className="btn btn-light" onClick={onClose} disabled={loading}>Cancel</button>
                            <button type="submit" className="btn btn-primary px-4" style={{ backgroundColor: '#005cc8' }} disabled={loading}>
                                {loading ? (
                                    <span className="spinner-border spinner-border-sm"></span>
                                ) : 'Create & Send Link'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default HelcimLinkModal;