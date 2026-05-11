import React, { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/axios'; 
import CreatePOModal from './modal/CreatePOModal';
import POPreviewModal from './modal/POPreviewModal';
import InvoicePreviewModal from './modal/InvoicePreviewModal';
import { toast } from 'react-hot-toast';
import Swal from 'sweetalert2';

const AdminPurchaseOrder = () => {
    const [purchaseOrders, setPurchaseOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    
    // Modals & Selection States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showPreviewModal, setShowPreviewModal] = useState(false);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [selectedPO, setSelectedPO] = useState(null);
    const [editingPO, setEditingPO] = useState(null);

    const debounceTimeout = useRef(null);

    // --- FETCH DATA ---
    const fetchAllPOs = useCallback(async (searchQuery = "") => {
        try {
            setLoading(true);
            const response = await api.get('/purchase-orders', {
                params: { 
                    search: searchQuery,
                    _t: Date.now() 
                }
            });
            setPurchaseOrders(response.data);
        } catch (error) {
            toast.error("Failed to load Purchase Orders");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAllPOs();
    }, [fetchAllPOs]);

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);
        if (debounceTimeout.current) clearTimeout(debounceTimeout.current);
        debounceTimeout.current = setTimeout(() => {
            fetchAllPOs(value);
        }, 500);
    };

    // --- UTILS ---
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

    // --- HANDLERS ---
    const handlePreview = (po) => {
        setSelectedPO(po);
        setShowPreviewModal(true);
    };

    const handleInvoicePreview = (po) => {
        setSelectedPO(po);
        setShowInvoiceModal(true);
    };

    const handleEdit = (po) => {
        setEditingPO(po);
        setShowCreateModal(true);
    };

    const handleCloseCreateModal = () => {
        setShowCreateModal(false);
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
            reverseButtons: true,
            confirmButtonText: 'Update Status',
            cancelButtonText: 'Cancel',
            customClass: {
                popup: 'border-0 shadow-lg rounded-4',
                title: 'fw-bold fs-5 pt-4',
                input: 'form-select small shadow-none mx-auto w-75',
                confirmButton: 'btn px-4 fw-bold text-white',
                cancelButton: 'btn btn-outline-secondary px-4 fw-bold',
                actions: 'pb-4 pt-2 d-flex justify-content-center gap-3'
            },
            didOpen: () => {
                const confirmBtn = Swal.getConfirmButton();
                confirmBtn.style.backgroundColor = '#2b3a67';
                confirmBtn.style.borderRadius = '8px';
                Swal.getCancelButton().style.borderRadius = '8px';
            },
            buttonsStyling: false,
        });

        if (newStatus && newStatus !== po.status) {
            try {
                const response = await api.patch(`/purchase-orders/${po.id}/status`, { status: newStatus });
                setPurchaseOrders(prev => 
                    prev.map(item => item.id === po.id ? { ...item, status: response.data.status } : item)
                );
                toast.success(`PO status updated to ${newStatus}`);
            } catch (error) {
                toast.error(error.response?.data?.message || "Failed to update status");
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
                        <option value="Online">Online</option>
                    </select>
                </div>
            `,
            showCancelButton: true,
            reverseButtons: true,
            confirmButtonText: 'Record Payment',
            customClass: {
                popup: 'border-0 shadow-lg rounded-4',
                confirmButton: 'btn px-4 fw-bold text-white',
                cancelButton: 'btn btn-light px-4 fw-bold',
                actions: 'pb-4 pt-2 d-flex justify-content-center gap-3'
            },
            didOpen: () => {
                const confirmBtn = Swal.getConfirmButton();
                confirmBtn.style.backgroundColor = '#2b3a67';
                confirmBtn.style.borderRadius = '8px';
            },
            buttonsStyling: false,
            preConfirm: () => {
                const amount = document.getElementById('swal-amount').value;
                const method = document.getElementById('swal-method').value;
                if (!amount || amount <= 0) {
                    Swal.showValidationMessage('Please enter a valid amount');
                    return false;
                }
                return { amount, payment_method: method };
            }
        });

        if (formValues) {
            try {
                const response = await api.post(`/purchase-orders/${po.id}/payment`, formValues);
                setPurchaseOrders(prev => prev.map(item => 
                    item.id === po.id ? { 
                        ...item, 
                        paid_amount: response.data.paid_amount, 
                        payment_status: response.data.payment_status 
                    } : item
                ));
                toast.success(response.data.message);
            } catch (error) {
                toast.error(error.response?.data?.message || "Failed to add payment");
            }
        }
    };

    const handleDelete = async (id) => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "This action cannot be undone.",
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
                setPurchaseOrders(prev => prev.filter(po => po.id !== id));
                toast.success("Purchase Order deleted");
            } catch (error) {
                toast.error(error.response?.data?.message || "Error deleting PO");
            }
        }
    };

    // Skeleton Component
    const TableSkeleton = () => (
        <>
            {[...Array(5)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                    <td className="ps-4"><div className="skeleton-box" style={{ width: '120px', height: '18px', borderRadius: '4px' }}></div></td>
                    <td><div className="skeleton-box" style={{ width: '80px', height: '18px' }}></div></td>
                    <td><div className="skeleton-box" style={{ width: '100px', height: '18px' }}></div></td>
                    <td><div className="skeleton-box" style={{ width: '70px', height: '18px' }}></div></td>
                    <td className="text-center"><div className="skeleton-box mx-auto" style={{ width: '80px', height: '22px', borderRadius: '12px' }}></div></td>
                    <td className="text-center"><div className="skeleton-box mx-auto" style={{ width: '30px', height: '24px' }}></div></td>
                </tr>
            ))}
        </>
    );

    return (
        <div className="p-4 animate__animated animate__fadeIn">
            {/* Header Section */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
                <div>
                    <h4 className="fw-bold mb-1">PO Management</h4>
                    <p className="text-muted small mb-0">Global procurement and supplier cost tracking.</p>
                </div>

                <div className="d-flex gap-2 align-items-center">
                    <div style={{ minWidth: '250px' }}>
                        <input 
                            type="text" 
                            className="form-control shadow-none border-0 bg-light" 
                            placeholder="Search Supplier or PO#..." 
                            value={searchTerm}
                            onChange={handleSearchChange}
                            style={{ borderRadius: '8px' }}
                        />
                    </div>
                </div>
            </div>

            {/* Table Container */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '15px' }}>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light border-bottom">
                            <tr style={{ fontSize: '0.85rem' }}>
                                <th className="ps-4 border-0 text-muted fw-semibold py-3">Supplier</th>
                                <th className="border-0 text-muted fw-semibold py-3">PO Number</th>
                                <th className="border-0 text-muted fw-semibold py-3">Reference</th>
                                <th className="border-0 text-muted fw-semibold py-3">Value</th>
                                <th className="border-0 text-muted fw-semibold py-3 text-center">Status</th>
                                <th className="border-0 text-muted fw-semibold py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody style={{ fontSize: '0.85rem' }}>
                            {loading ? (
                                <TableSkeleton />
                            ) : purchaseOrders.length === 0 ? (
                                <tr><td colSpan="6" className="text-center py-5 text-muted">No Purchase Orders found.</td></tr>
                            ) : (
                                purchaseOrders.map((po) => (
                                    <tr key={po.id}>
                                        <td className="ps-4 py-3">
                                            <div className="fw-bold text-dark">{po.supplier?.name}</div>
                                            <div className="text-muted" style={{ fontSize: '0.75rem' }}>{po.supplier?.email}</div>
                                        </td>
                                        <td><span className="badge bg-light text-primary border">{po.po_number}</span></td>
                                        <td>
                                            <div className="fw-bold text-dark">{po.lead?.gjob?.job_number || 'No Job'}</div>
                                            <div className="text-muted small">{po.lead?.lead_number}</div>
                                        </td>
                                        <td>
                                            <div className="fw-bold">${parseFloat(po.total || 0).toLocaleString()}</div>
                                            <div className={`x-small fw-bold ${po.payment_status === 'paid' ? 'text-success' : 'text-warning'}`}>
                                                {po.payment_status?.toUpperCase()}
                                            </div>
                                        </td>
                                        <td className="text-center">
                                            <span className={`badge rounded-pill px-3 py-2 ${getStatusColor(po.status)}`} 
                                                  style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>
                                                {po.status}
                                            </span>
                                        </td>
                                        <td className="text-center">
                                            <div className="dropdown">
                                                <button className="btn btn-link btn-sm text-muted shadow-none" type="button" data-bs-toggle="dropdown">
                                                    <i className="bi bi-three-dots-vertical fs-5"></i>
                                                </button>
                                                <ul className="dropdown-menu dropdown-menu-end shadow border-0 rounded-3">
                                                    <li><button className="dropdown-item py-2" onClick={() => handlePreview(po)}><i className="bi bi-eye me-2"></i> View PO</button></li>
                                                    <li><button className="dropdown-item py-2" onClick={() => handleInvoicePreview(po)}><i className="bi bi-file-earmark-text me-2"></i> Invoice</button></li>
                                                    <li><button className="dropdown-item py-2 text-primary" onClick={() => handleEdit(po)}><i className="bi bi-pencil-square me-2"></i> Edit</button></li>
                                                    <li><button className="dropdown-item py-2 text-warning" onClick={() => handleStatusUpdate(po)}><i className="bi bi-arrow-repeat me-2"></i> Status</button></li>
                                                    <li><button className="dropdown-item py-2 text-success" onClick={() => handleAddPayment(po)}><i className="bi bi-cash-stack me-2"></i> Payment</button></li>
                                                    <li><hr className="dropdown-divider" /></li>
                                                    <li><button className="dropdown-item py-2 text-danger" onClick={() => handleDelete(po.id)}><i className="bi bi-trash me-2"></i> Delete</button></li>
                                                </ul>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modals */}
            <CreatePOModal 
                show={showCreateModal} 
                onClose={handleCloseCreateModal} 
                onSuccess={() => fetchAllPOs(searchTerm)}
                editingPO={editingPO}
            />

            {selectedPO && showPreviewModal && (
                <POPreviewModal 
                    show={showPreviewModal} 
                    onClose={() => setShowPreviewModal(false)} 
                    poData={selectedPO}
                />
            )}

            {selectedPO && showInvoiceModal && (
                <InvoicePreviewModal 
                    show={showInvoiceModal} 
                    onClose={() => setShowInvoiceModal(false)} 
                    invoiceData={selectedPO}
                />
            )}
        </div>
    );
};

export default AdminPurchaseOrder;