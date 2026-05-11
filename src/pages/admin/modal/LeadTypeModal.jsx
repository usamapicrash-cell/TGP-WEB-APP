import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { alert, notify } from '../../../utils/notifier';

const LeadTypeModal = ({ show, onClose }) => {
    const [types, setTypes] = useState([]);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(false);

    const fetchTypes = async () => {
        try {
            const response = await api.get('/lead-types');
            setTypes(response.data);
        } catch (err) {
            console.error("Error fetching types", err);
        }
    };

    useEffect(() => {
        if (show) fetchTypes();
    }, [show]);

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newName.trim()) return;
        setLoading(true);
        try {
            await api.post('/lead-types', { name: newName });
            setNewName('');
            notify.success('Project type added successfully! 🚀');
            fetchTypes();
        } catch (err) {
            alert.error("Addition Failed", err.response?.data?.message || "Failed to add type");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        // Fancy SweetAlert2 Confirmation
        const isConfirmed = await alert.confirm(
            'Delete Project Type?', 
            'Make sure this type is not assigned to any lead.'
        );

        if (isConfirmed) {
            try {
                await api.delete(`/lead-types/${id}`);
                notify.success('Type deleted!'); // Fancy Toaster
                fetchTypes();
            } catch (err) {
                // Agar backend pe foreign key constraint hai
                alert.error(
                    "Cannot Delete", 
                    "This type is currently in use and cannot be removed."
                );
            }
        }
    };

    if (!show) return null;

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered modal-lg">
                <div className="modal-content border-0 shadow" style={{ borderRadius: '15px' }}>
                    <div className="modal-header border-0 p-4 pb-0">
                        <h5 className="fw-bold mb-0">Manage Project Types</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-4">
                        {/* Form to Add New */}
                        <form onSubmit={handleAdd} className="mb-4">
                            <label className="form-label small fw-bold text-muted">ADD NEW TYPE</label>
                            <div className="input-group">
                                <input 
                                    type="text" 
                                    className="form-control bg-light border-0 shadow-none" 
                                    placeholder="e.g. Store Front" 
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    style={{ borderRadius: '8px 0 0 8px' }}
                                />
                                <button 
                                    className="btn btn-primary px-3" 
                                    style={{ backgroundColor: '#34497e', border: 'none', borderRadius: '0 8px 8px 0' }}
                                    disabled={loading}
                                >
                                    {loading ? <span className="spinner-border spinner-border-sm"></span> : <i className="bi bi-plus-lg"></i>}
                                </button>
                            </div>
                        </form>

                        {/* List of Existing Types */}
                        <label className="form-label small fw-bold text-muted mb-2">EXISTING TYPES</label>
                        <div className="overflow-auto pe-2" style={{ maxHeight: '300px' }}>
                            <div className="row g-3"> {/* g-3 adds spacing between cards */}
                                {types.length === 0 ? (
                                    <div className="col-12">
                                        <p className="text-muted small py-3 text-center">No project types found.</p>
                                    </div>
                                ) : (
                                    types.map(type => (
                                        <div key={type.id} className="col-4"> {/* This makes it 2 per row */}
                                            <div className="p-3 border rounded-3 h-100 d-flex justify-content-between align-items-center bg-white shadow-sm">
                                                <div className="text-truncate">
                                                    <div className="fw-bold text-dark mb-0 text-truncate" style={{ fontSize: '0.9rem' }}>
                                                        {type.name}
                                                    </div>
                                                    <small className="text-muted d-block text-truncate" style={{ fontSize: '0.7rem' }}>
                                                        <i className="bi bi-person me-1"></i>
                                                        {type.creator?.name || 'System'}
                                                    </small>
                                                </div>
                                                <button 
                                                    className="btn btn-sm btn-link text-danger p-0 ms-2 shadow-none" 
                                                    onClick={() => handleDelete(type.id)}
                                                >
                                                    <i className="bi bi-trash3 fs-6"></i>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer border-0 p-4 pt-0">
                        <button className="btn btn-light" style={{ borderRadius: '8px' }} onClick={onClose}>
                            Close
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LeadTypeModal;