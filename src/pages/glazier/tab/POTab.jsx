import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import POPreviewModal from '../../admin/modal/POPreviewModal';
import { toast } from 'react-hot-toast';

const POTab = ({ leadId }) => {
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedPO, setSelectedPO] = useState(null);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchPOs = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/purchase-orders-glazier?lead_id=${leadId}`);
            setPurchaseOrders(response.data);
        } catch (error) {
            toast.error("Failed to load Purchase Orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (leadId) fetchPOs();
    }, [leadId]);

    const handlePreview = (po) => {
        setSelectedPO(po);
        setShowPreviewModal(true);
    };

    const getStatusColor = (status) => {
        const map = {
            draft: 'bg-secondary',
            pending: 'bg-warning text-dark',
            approved: 'bg-success',
            delivered: 'bg-primary',
            cancelled: 'bg-danger'
        };
        return map[status] || 'bg-light text-dark';
    };

    return (
        <div className="animate__animated animate__fadeIn px-2">
            {/* Header - Simple for Glazier */}
            <div className="mb-3">
                <h6 className="fw-bold mb-1">Purchase Orders</h6>
                <p className="text-muted small mb-0">View procurement details and status</p>
            </div>

            {/* Content Section */}
            {loading ? (
                <div className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                    <p className="text-muted small mt-2">Loading orders...</p>
                </div>
            ) : purchaseOrders.length === 0 ? (
                <div className="card border-0 shadow-sm p-5 text-center" style={{ borderRadius: '15px' }}>
                    <i className="bi bi-box-seam text-muted opacity-25 fs-1"></i>
                    <p className="text-muted small mt-2">No purchase orders found.</p>
                </div>
            ) : (
                <div className="row g-3">
                    {purchaseOrders.map((po) => (
                        <div key={po.id} className="col-12">
                            <div 
                                className="card border-0 shadow-sm p-3 h-100 position-relative" 
                                style={{ borderRadius: '12px', borderLeft: '5px solid #2b3a67' }}
                                onClick={() => handlePreview(po)} // Card click par hi preview open ho jaye
                            >
                                <div className="d-flex justify-content-between align-items-start mb-2">
                                    <div>
                                        <span className="fw-bold text-primary mb-1 d-block">{po.po_number}</span>
                                        <div className="fw-bold text-dark small">{po.supplier?.name}</div>
                                    </div>
                                    <span className={`badge ${getStatusColor(po.status)} border-0 fw-bold text-uppercase`} 
                                          style={{ fontSize: '0.6rem', padding: '0.5em 0.8em' }}>
                                        {po.status}
                                    </span>
                                </div>

                                <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                                    <div className="text-muted small">
                                        <i className="bi bi-calendar me-1"></i>
                                        {new Date(po.created_at).toLocaleDateString()}
                                    </div>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="text-end">
                                            <small className="text-muted d-block" style={{fontSize: '0.65rem'}}>COST</small>
                                            <span className="fw-bold text-dark">${parseFloat(po.total).toLocaleString()}</span>
                                        </div>
                                        <i className="bi bi-chevron-right text-muted"></i>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Preview Modal */}
            {selectedPO && (
                <POPreviewModal 
                    show={showPreviewModal} 
                    onClose={() => setShowPreviewModal(false)} 
                    poData={selectedPO}
                />
            )}
        </div>
    );
};

export default POTab;