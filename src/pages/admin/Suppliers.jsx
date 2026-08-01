import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { notify } from '../../utils/notifier';
import CreateSupplierModal from './modal/CreateSupplierModal'; 

const Suppliers = () => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState(null);

    // Fetch Suppliers from API
    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/suppliers');
            setSuppliers(res.data);
        } catch (err) {
            console.error("Error fetching suppliers", err);
            notify.error("Failed to load suppliers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    // Edit button click handler
    const handleEdit = (supplier) => {
        setSelectedSupplier(supplier);
        setShowModal(true);
    };

    // Modal close handler
    const handleCloseModal = () => {
        setShowModal(false);
        setSelectedSupplier(null);
    };

    // Delete Handler
    const handleDelete = async (id, name) => {
        if (window.confirm(`Are you sure you want to delete supplier: ${name}?`)) {
            try {
                await api.delete(`/suppliers/${id}`);
                notify.success(`${name} removed successfully`);
                fetchSuppliers();
            } catch (err) {
                notify.error("Action failed");
            }
        }
    };

    // Filtered List for Search
    const filteredSuppliers = suppliers.filter(s => 
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-2 p-md-3">
            {/* Header Section */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
                <div>
                    <h4 className="fw-bold mb-0">Suppliers Management</h4>
                    <p className="text-muted small mb-0">Manage your inventory and glass suppliers</p>
                </div>
                <div>
                    <button 
                        className="btn btn-primary px-4 d-inline-flex align-items-center justify-content-center gap-2"
                        style={{ 
                            backgroundColor: '#34497e', 
                            border: 'none', 
                            borderRadius: '8px', 
                            height: '40px',
                            whiteSpace: 'nowrap'
                        }}
                        onClick={() => setShowModal(true)}
                    >
                        <i className="bi bi-plus-lg"></i> Add New Supplier
                    </button>
                </div>
            </div>

            {/* Search & Stats Row */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-md-8">
                    <div className="position-relative">
                        <input 
                            type="text" 
                            className="form-control ps-4 border-0 shadow-sm" 
                            placeholder="Search by company name or email..." 
                            style={{ borderRadius: '10px', height: '45px' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="bg-white p-2 px-3 shadow-sm rounded-3 d-flex align-items-center justify-content-between" style={{ height: '45px' }}>
                        <span className="small fw-bold text-muted">TOTAL SUPPLIERS</span>
                        <span className="badge bg-primary-subtle text-primary rounded-pill px-3">{suppliers.length}</span>
                    </div>
                </div>
            </div>

            {/* Suppliers Table Container */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '15px' }}>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light d-none d-md-table-header-group">
                                <tr>
                                    <th className="ps-4 py-3 border-0 small fw-bold text-muted">SUPPLIER NAME</th>
                                    <th className="py-3 border-0 small fw-bold text-muted">CONTACT INFO</th>
                                    <th className="py-3 border-0 small fw-bold text-muted">ADDRESS</th>
                                    <th className="py-3 border-0 small fw-bold text-muted">ADDED ON</th>
                                    <th className="py-3 border-0 text-end pe-4 small fw-bold text-muted">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="5" className="text-center py-5">
                                            <div className="spinner-border spinner-border-sm text-primary me-2"></div>
                                            <span className="text-muted">Loading suppliers...</span>
                                        </td>
                                    </tr>
                                ) : filteredSuppliers.length > 0 ? (
                                    filteredSuppliers.map((sup) => (
                                        <tr key={sup.id} className="d-flex flex-column d-md-table-row p-3 p-md-0 border-bottom border-md-0">
                                            {/* Name & Avatar Column */}
                                            <td className="ps-0 ps-md-4 border-0 border-md-bottom py-2 py-md-3">
                                                <div className="d-flex align-items-center justify-content-between justify-content-md-start">
                                                    <div className="d-flex align-items-center">
                                                        <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold me-3 flex-shrink-0" style={{ width: '38px', height: '38px', fontSize: '0.8rem' }}>
                                                            {sup.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <span className="fw-semibold text-dark d-block">{sup.name}</span>
                                                            <small className="text-muted">ID: #{sup.id}</small>
                                                        </div>
                                                    </div>

                                                    {/* Mobile Dropdown Menu */}
                                                    <div className="dropdown d-md-none">
                                                        <button className="btn btn-link text-muted p-0 shadow-none" data-bs-toggle="dropdown">
                                                            <i className="bi bi-three-dots-vertical fs-5"></i>
                                                        </button>
                                                        <ul className="dropdown-menu dropdown-menu-end border-0 shadow p-2" style={{ borderRadius: '10px' }}>
                                                            <li>
                                                                <button className="dropdown-item rounded-2 py-2 small d-flex align-items-center gap-2" onClick={() => handleEdit(sup)}>
                                                                    <i className="bi bi-pencil text-primary"></i> Edit Supplier
                                                                </button>
                                                            </li>
                                                            <li><hr className="dropdown-divider" /></li>
                                                            <li>
                                                                <button className="dropdown-item rounded-2 py-2 small d-flex align-items-center gap-2 text-danger" onClick={() => handleDelete(sup.id, sup.name)}>
                                                                    <i className="bi bi-trash"></i> Delete Supplier
                                                                </button>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Contact Info Column */}
                                            <td className="border-0 border-md-bottom py-1 py-md-3 ps-0 ps-md-2">
                                                <div className="small">
                                                    <div className="text-dark"><i className="bi bi-envelope me-1"></i> {sup.email}</div>
                                                    <div className="text-muted"><i className="bi bi-telephone me-1"></i> {sup.phone}</div>
                                                </div>
                                            </td>

                                            {/* Address Column */}
                                            <td className="text-muted border-0 border-md-bottom py-1 py-md-3 small ps-0 ps-md-2">
                                                <i className="bi bi-geo-alt me-1 d-md-inline"></i>
                                                <span className="d-md-none fw-bold me-1 text-dark">Address:</span>
                                                {sup.address}
                                            </td>

                                            {/* Added Date Column */}
                                            <td className="text-muted border-0 border-md-bottom py-1 py-md-3 small ps-0 ps-md-2">
                                                <span className="d-md-none fw-bold me-2 text-dark">Added:</span>
                                                {new Date(sup.created_at).toLocaleDateString('en-GB')}
                                            </td>

                                            {/* Desktop Actions Column */}
                                            <td className="text-end pe-4 d-none d-md-table-cell border-0 border-md-bottom">
                                                <div className="dropdown">
                                                    <button className="btn btn-link text-muted p-0 shadow-none" data-bs-toggle="dropdown">
                                                        <i className="bi bi-three-dots-vertical fs-5"></i>
                                                    </button>
                                                    <ul className="dropdown-menu dropdown-menu-end border-0 shadow-sm p-2" style={{ borderRadius: '10px' }}>
                                                        <li>
                                                            <button className="dropdown-item rounded-2 py-2 small d-flex align-items-center gap-2" onClick={() => handleEdit(sup)}>
                                                                <i className="bi bi-pencil text-primary"></i> Edit Supplier
                                                            </button>
                                                        </li>
                                                        <li><hr className="dropdown-divider" /></li>
                                                        <li>
                                                            <button className="dropdown-item rounded-2 py-2 small d-flex align-items-center gap-2 text-danger" onClick={() => handleDelete(sup.id, sup.name)}>
                                                                <i className="bi bi-trash"></i> Delete Supplier
                                                            </button>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="text-center py-5 text-muted">
                                            No suppliers found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal for Creating/Updating Supplier */}
            <CreateSupplierModal 
                show={showModal} 
                onClose={handleCloseModal} 
                onSupplierCreated={fetchSuppliers}
                selectedData={selectedSupplier}
            />
        </div>
    );
};

export default Suppliers;