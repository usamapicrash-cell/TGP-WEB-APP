import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { notify } from '../../../utils/notifier';

const CreateSupplierModal = ({ show, onClose, onSupplierCreated, selectedData }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        address: ''
    });

    // Populate form if editing
    useEffect(() => {
        if (selectedData) {
            setFormData({
                name: selectedData.name || '',
                email: selectedData.email || '',
                phone: selectedData.phone || '',
                address: selectedData.address || ''
            });
        } else {
            setFormData({ name: '', email: '', phone: '', address: '' });
        }
    }, [selectedData, show]);

    if (!show) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (selectedData) {
                // EDIT MODE (PUT)
                await api.put(`/suppliers/${selectedData.id}`, formData);
                notify.success("Supplier updated successfully!");
            } else {
                // CREATE MODE (POST)
                await api.post('/suppliers', formData);
                notify.success("Supplier added successfully!");
            }
            onSupplierCreated();
            onClose();
        } catch (err) {
            notify.error(err.response?.data?.message || "Action failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow" style={{ borderRadius: '15px' }}>
                    <div className="modal-header border-0 pt-4 px-4">
                        <h5 className="modal-title fw-bold">
                            {selectedData ? 'Edit Supplier' : 'Add New Supplier'}
                        </h5>
                        <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                    </div>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="modal-body px-4">
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">COMPANY NAME</label>
                                <input 
                                    type="text" 
                                    className="form-control bg-light border-0 py-2" 
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">EMAIL ADDRESS</label>
                                <input 
                                    type="email" 
                                    className="form-control bg-light border-0 py-2" 
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">PHONE NUMBER</label>
                                <input 
                                    type="text" 
                                    className="form-control bg-light border-0 py-2" 
                                    required
                                    value={formData.phone}
                                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                                />
                            </div>

                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">OFFICE ADDRESS</label>
                                <textarea 
                                    className="form-control bg-light border-0 py-2" 
                                    rows="3"
                                    required
                                    value={formData.address}
                                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                                    style={{ resize: 'none' }}
                                ></textarea>
                            </div>
                        </div>

                        <div className="modal-footer border-0 pb-4 px-4">
                            <button type="button" className="btn btn-light px-4" onClick={onClose}>Cancel</button>
                            <button 
                                type="submit" 
                                className="btn btn-primary px-4 fw-semibold"
                                disabled={loading}
                                style={{ backgroundColor: '#34497e', border: 'none' }}
                            >
                                {loading ? 'Saving...' : (selectedData ? 'Update Supplier' : 'Save Supplier')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateSupplierModal;