import React, { useState, useEffect } from 'react';
import api from '../../../../api/axios';
import CreatePOModal from '../../modal/CreatePOModal';
import POPreviewModal from '../../modal/POPreviewModal';
import SupplierEmailModal from '../../modal/SupplierEmailModal';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';

const POTab = ({ lead, leadId }) => {
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [suppliers, setSuppliers] = useState([]); // Suppliers list fetch karne ke liye
    const [showModal, setShowModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [selectedPO, setSelectedPO] = useState(null);
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingPO, setEditingPO] = useState(null); // Add this state
    const [updatingStatus, setUpdatingStatus] = useState(null); // Current PO being updated

    const fetchPOs = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/purchase-orders?lead_id=${leadId}`);
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

    const handleEdit = (po) => {
        setEditingPO(po); // PO ka data state mein dalein
        setShowModal(true); // CreatePOModal hi open karein
    };

    // Jab modal close ho to editingPO ko clear kar dein
    const handleCloseModal = () => {
        setShowModal(false);
        setEditingPO(null);
    };

    const handleStatusUpdate = async (po) => {
    const { value: newStatus } = await Swal.fire({
        title: 'Update PO Status',
        input: 'select',
        inputOptions: {
            draft: 'Draft',
            pending: 'Pending',
            approved: 'Approved',
            delivered: 'Delivered',
            cancelled: 'Cancelled'
        },
        inputValue: po.status,
        showCancelButton: true,
        reverseButtons: true, // FIX 1: Cancel button ko pehle lane ke liye
        confirmButtonText: 'Update Status',
        cancelButtonText: 'Cancel',
        
        // FIX 2: Aapke Theme (#2b3a67) se matching styles
        customClass: {
            container: 'my-swal-container',
            popup: 'border-0 shadow-lg',
            title: 'fw-bold fs-5 pt-4',
            input: 'form-select small shadow-none mx-auto w-75', // Bootstrap select style
            confirmButton: 'btn px-5 fw-bold text-white order-2',
            cancelButton: 'btn btn-outline-secondary px-4 fw-bold order-1',
            actions: 'pb-4 pt-2 d-flex justify-content-center gap-3'
        },
        didOpen: () => {
            // Apply theme color directly to confirm button
            const confirmBtn = Swal.getConfirmButton();
            confirmBtn.style.backgroundColor = '#2b3a67';
            confirmBtn.style.borderRadius = '8px';
            
            // Cancel button style match
            const cancelBtn = Swal.getCancelButton();
            cancelBtn.style.borderRadius = '8px';
        },
        buttonsStyling: false, 
    });

    if (newStatus && newStatus !== po.status) {
        try {
            // Loading state start
            const response = await api.patch(`/purchase-orders/${po.id}/status`, { 
                status: newStatus 
            });

            // Update UI locally
            setPurchaseOrders(prev => 
                prev.map(item => item.id === po.id ? { ...item, status: response.data.status } : item)
            );
            
            toast.success(`PO status updated to ${newStatus}`);
        } catch (error) {
            console.error(error);
            toast.error(error.response?.data?.message || "Failed to update status");
        }
    }
};

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Yes, delete it!',
            customClass: {
                confirmButton: 'btn btn-danger px-4 py-2 shadow-none',
                cancelButton: 'btn btn-light px-4 py-2 ms-2 shadow-none'
            },
            buttonsStyling: false
        });

        if (result.isConfirmed) {
            try {
                await api.delete(`/purchase-orders/${id}`);
                
                // State update karein taaki row foran remove ho jaye
                setPurchaseOrders(prev => prev.filter(po => po.id !== id));
                toast.success("Purchase Order deleted");
            } catch (error) {
                // FIX: Agar backend se 422 error message aaya hai toh wo dikhao, warna default message
                const errorMsg = error.response?.data?.message || "Failed to delete PO";
                toast.error(errorMsg);
            }
        }
    };


    const handleAddPayment = async (po) => {
        const remainingBalance = po.total - (po.paid_amount || 0);

        const { value: formValues } = await Swal.fire({
            title: 'Add Payment',
            html: `
                <div class="text-start px-3">
                    <label class="small fw-bold text-muted mb-1">REMAINING BALANCE: $${remainingBalance.toLocaleString()}</label>
                    <input id="swal-amount" type="number" class="form-control mb-3 shadow-none" placeholder="Enter amount" value="${remainingBalance}">
                    
                    <label class="small fw-bold text-muted mb-1">PAYMENT METHOD</label>
                    <select id="swal-method" class="form-select shadow-none">
                        <option value="Cash">Cash</option>
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cheque">Cheque</option>
                        <option value="Online">Online</option>
                    </select>
                </div>
            `,
            showCancelButton: true,
            reverseButtons: true,
            confirmButtonText: 'Record Payment',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'border-0 shadow-lg rounded-4',
                title: 'fw-bold fs-5 pt-4',
                confirmButton: 'btn px-4 fw-bold text-white',
                cancelButton: 'btn btn-light px-4 fw-bold',
                actions: 'pb-4 pt-2 d-flex justify-content-center gap-3'
            },
            didOpen: () => {
                const confirmBtn = Swal.getConfirmButton();
                confirmBtn.style.backgroundColor = '#2b3a67'; // Your theme color
                confirmBtn.style.borderRadius = '8px';
                Swal.getCancelButton().style.borderRadius = '8px';
            },
            buttonsStyling: false,
            preConfirm: () => {
                const amount = document.getElementById('swal-amount').value;
                const method = document.getElementById('swal-method').value;
                if (!amount || amount <= 0) {
                    Swal.showValidationMessage('Please enter a valid amount');
                    return false;
                }
                if (amount > remainingBalance) {
                    Swal.showValidationMessage(`Amount exceeds balance ($${remainingBalance})`);
                    return false;
                }
                return { amount, payment_method: method };
            }
        });

        if (formValues) {
            try {
                setLoading(true);
                const response = await api.post(`/purchase-orders/${po.id}/payment`, formValues);
                
                // Update local state locally
                setPurchaseOrders(prev => prev.map(item => 
                    item.id === po.id ? { 
                        ...item, 
                        paid_amount: response.data.paid_amount, 
                        payment_status: response.data.payment_status 
                    } : item
                ));

                toast.success(response.data.message);
            } catch (error) {
                const errorMsg = error.response?.data?.message || "Failed to add payment";
                toast.error(errorMsg);
            } finally {
                setLoading(false);
            }
        }
    };
    // --- TABLE SKELETON COMPONENT ---
    const TableSkeleton = () => {
        return (
            <>
                {[...Array(5)].map((_, i) => (
                    <tr key={i} className="skeleton-row">
                        <td className="ps-4">
                            <div className="skeleton-box" style={{ width: '80px', height: '18px', borderRadius: '4px' }}></div>
                        </td>
                        <td>
                            <div className="skeleton-box mb-1" style={{ width: '140px', height: '16px' }}></div>
                        </td>
                        <td><div className="skeleton-box" style={{ width: '70px', height: '18px' }}></div></td>
                        <td>
                            <div className="skeleton-box mb-1" style={{ width: '60px', height: '14px' }}></div>
                        </td>
                        <td><div className="skeleton-box" style={{ width: '90px', height: '22px', borderRadius: '12px' }}></div></td>
                        <td><div className="skeleton-box" style={{ width: '40px', height: '18px' }}></div></td>
                        <td className="text-center">
                            <div className="d-flex justify-content-center gap-2">
                                <div className="skeleton-box" style={{ width: '24px', height: '24px', borderRadius: '50%' }}></div>
                                <div className="skeleton-box" style={{ width: '24px', height: '24px', borderRadius: '50%' }}></div>
                            </div>
                        </td>
                    </tr>
                ))}
            </>
        );
    };


    return (
        <div className="animate__animated animate__fadeIn">
            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h6 className="fw-bold mb-1">Purchase Orders</h6>
                    <p className="text-muted small mb-0">Manage supplier procurement and costs</p>
                </div>
                <div className="d-flex gap-2">
                    <button 
                        onClick={() => setShowEmailModal(true)} 
                        className="btn btn-outline-primary d-flex align-items-center gap-2 px-3 py-2" 
                        style={{ borderRadius: '6px', fontSize: '0.85rem' }}
                    >
                        <i className="bi bi-envelope"></i>
                        <span>Get Pricing</span>
                    </button>
                    
                    <button onClick={() => setShowModal(true)} className="btn btn-primary d-flex align-items-center gap-2 px-3 py-2" style={{ backgroundColor: '#2b3a67', border: 'none', borderRadius: '6px', fontSize: '0.85rem' }}>
                        <i className="bi bi-plus-lg"></i>
                        <span>Create PO</span>
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '15px' }}>
                <div className="table-responsivee">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light border-bottom">
                            <tr>
                                <th className="ps-4 border-0 text-muted fw-semibold bg-transparent">PO #</th>
                                <th className="border-0 text-muted small fw-semibold bg-transparent">Supplier</th>
                                <th className="border-0 text-muted small fw-semibold bg-transparent">Cost</th>
                                <th className="border-0 text-muted small fw-semibold bg-transparent">Payment Status</th>
                                <th className="border-0 text-muted small fw-semibold bg-transparent">Status</th>
                                <th className="border-0 text-muted small fw-semibold bg-transparent">Date</th>
                                <th className="border-0 text-muted small fw-semibold text-center bg-transparent">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                             {loading ? (
                                <TableSkeleton />
                            ) : purchaseOrders.length === 0 ? (
                                <tr><td colSpan="7" className="text-center py-5 text-muted small">No purchase orders found for this lead.</td></tr>
                            ) : purchaseOrders.map((po) => (
                                <tr key={po.id} className="border-top">
                                    <td className="ps-4 fw-bold text-primary">{po.po_number}</td>
                                    <td>
                                        <div className="fw-bold text-dark small">{po.supplier?.name}</div>
                                        <div className="text-muted" style={{fontSize: '0.7rem'}}>{po.items_count || po.items?.length} items</div>
                                    </td>
                                    <td className="fw-bold text-dark">${parseFloat(po.total).toLocaleString()}</td>
                                    <td>
                                        <span className={`small fw-bold ${po.payment_status === 'paid' ? 'text-success' : 'text-warning'}`}>
                                            {po.payment_status?.toUpperCase()}
                                        </span>
                                        <div className="text-muted" style={{fontSize: '0.7rem'}}>${po.paid_amount || 0} paid</div>
                                    </td>
                                    <td>
                                        <span className={`badge ${getStatusColor(po.status)} border-0 fw-bold text-uppercase`} style={{ fontSize: '0.6rem', padding: '0.5em 0.8em' }}>
                                            {po.status}
                                        </span>
                                    </td>
                                    {/*<td className="text-muted small">
                                        <i className="bi bi-card-image me-1"></i>
                                        {po.drawing_data ? (Array.isArray(po.drawing_data) ? po.drawing_data.length : 1) : 0}
                                    </td>*/}
                                    <td className="text-muted small">
                                        <i className="bi bi-calendar me-1"></i>
                                        {new Date(po.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="text-center px-4">
                                        <div className="d-flex justify-content-center gap-3">
                                           <div className="dropdown">
                                                <button 
                                                    className="btn btn-link btn-sm text-muted shadow-none p-0" 
                                                    type="button" 
                                                    data-bs-toggle="dropdown" 
                                                    aria-expanded="false"
                                                >
                                                    <i className="bi bi-three-dots-vertical fs-5"></i>
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-end shadow border-0" style={{ borderRadius: '10px', fontSize: '14px' }}>
                                                    {/* VIEW OPTION */}
                                                    <li>
                                                        <button className="dropdown-item py-2" onClick={() => handlePreview(po)}>
                                                            <i className="bi bi-eye me-2 text-muted"></i> View Details
                                                        </button>
                                                    </li>

                                                    {/* EDIT OPTION */}
                                                    <li>
                                                        <button className="dropdown-item py-2" onClick={() => handleEdit(po)}>
                                                            <i className="bi bi-pencil-square me-2 text-primary"></i> Edit PO
                                                        </button>
                                                    </li>

                                                    {/* STATUS CHANGE OPTION */}
                                                    <li>
                                                        <button className="dropdown-item py-2" onClick={() => handleStatusUpdate(po)}>
                                                            <i className="bi bi-arrow-repeat me-2 text-warning"></i> Change Status
                                                        </button>
                                                    </li>

                                                    {/* PAYMENT OPTION */}
                                                    <li>
                                                        <button className="dropdown-item py-2" onClick={() => handleAddPayment(po)}>
                                                            <i className="bi bi-cash-stack me-2 text-success"></i> Add Payment
                                                        </button>
                                                    </li>

                                                    <li><hr className="dropdown-divider" /></li>

                                                    {/* DELETE OPTION */}
                                                    <li>
                                                        <button className="dropdown-item py-2 text-danger" onClick={() => handleDelete(po.id)}>
                                                            <i className="bi bi-trash me-2"></i> Delete PO
                                                        </button>
                                                    </li>
                                                </ul>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            
                        </tbody>
                    </table>
                </div>
            </div>

            {/* --- MODALS SECTION --- */}
            
            {/* Create PO Modal */}
           <CreatePOModal 
                show={showModal} 
                onClose={handleCloseModal} // Use the new close handler
                leadId={leadId}
                lead={lead}
                onSuccess={fetchPOs}
                editingPO={editingPO} // Pass the PO data for editing
            />

            <SupplierEmailModal 
                show={showEmailModal}
                onClose={() => setShowEmailModal(false)}
                leadId={leadId}
                lead={lead} // Lead number pass karein
            />

            {/* Preview PO Modal - THIS WAS MISSING */}
            <POPreviewModal 
                show={showPreviewModal} 
                onClose={() => setShowPreviewModal(false)} 
                poData={selectedPO}
            />
        </div>
    );
};

export default POTab;