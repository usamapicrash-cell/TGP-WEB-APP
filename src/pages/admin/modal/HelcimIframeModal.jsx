import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import api from '../../../api/axios';

const HelcimIframeModal = ({ isOpen, onClose, leadId, remainingBalance, onSuccess }) => {
    const [amount, setAmount] = useState(remainingBalance || 0);
    const [loading, setLoading] = useState(false);
    const [checkoutToken, setCheckoutToken] = useState(null);

    useEffect(() => {
        // 1. Sahi Script Load karein
        const existingScript = document.getElementById('helcim-start-js');
        if (!existingScript) {
            const script = document.createElement('script');
            script.id = 'helcim-start-js';
            script.src = 'https://secure.helcim.app/helcim-pay/services/start.js';
            script.type = 'text/javascript';
            script.async = true;
            document.head.appendChild(script);
        }

        // 2. Payment Events ko Listen karein
        const handleMessage = (event) => {
            const identifier = 'helcim-pay-js-' + checkoutToken;
            
            if (event.data.eventName === identifier) {
                if (event.data.eventStatus === 'SUCCESS') {
                    toast.success("Payment Successful!");
                    onSuccess(JSON.parse(event.data.eventMessage)); // Success response parse karein
                    onClose();
                } else if (event.data.eventStatus === 'ABORTED') {
                    toast.error("Transaction Failed: " + event.data.eventMessage);
                }
            }
        };

        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [checkoutToken]);

    const handleProcessPayment = async (e) => {
        e.preventDefault();
        
        if (typeof window.appendHelcimPayIframe !== 'function') {
            toast.error("Helcim Library loading... please try again in a second.");
            return;
        }

        setLoading(true);
        try {
            const { data } = await api.post(`/leads/${leadId}/helcim-link`, {
                amount: parseFloat(amount)
            });

            // Token nikaalein
            const token = data.checkout_token || (data.data && data.data.checkout_token);

            if (token) {
                setCheckoutToken(token);
                // 3. Sahi Function Call karein
                window.appendHelcimPayIframe(token); 
            } else {
                toast.error("Invalid Token received from server");
            }
        } catch (error) {
            toast.error("Server Error while initializing payment");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow">
                    <div className="modal-header border-0">
                        <h5 className="modal-title fw-bold">Secure Payment</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <form onSubmit={handleProcessPayment}>
                        <div className="modal-body">
                            <div className="mb-3">
                                <label className="small fw-bold">Amount ($)</label>
                                <input 
                                    type="number" 
                                    className="form-control shadow-none" 
                                    value={amount} 
                                    onChange={(e) => setAmount(e.target.value)} 
                                    required
                                />
                            </div>
                            <button type="submit" disabled={loading} className="btn btn-success w-100 fw-bold">
                                {loading ? "PREPARING..." : "PAY NOW"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default HelcimIframeModal;