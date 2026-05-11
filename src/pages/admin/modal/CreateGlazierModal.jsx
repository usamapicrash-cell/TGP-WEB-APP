import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { notify, alert } from '../../../utils/notifier';

const CreateGlazierModal = ({ show, onClose, onGlazierCreated, selectedData }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({ 
        name: '', 
        email: '', 
        password: 'password123' 
    });

    // Jab selectedData change ho (Edit click par), form fields bhar do
    useEffect(() => {
        if (selectedData) {
            setFormData({
                name: selectedData.name || '',
                email: selectedData.email || '',
                password: '' // Edit ke waqt password khali chor sakte hain
            });
        } else {
            // Create mode ke liye reset
            setFormData({ name: '', email: '', password: 'password123' });
        }
    }, [selectedData, show]);

    if (!show) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (selectedData) {
                // EDIT LOGIC (PUT Request)
                // Note: Agar aapka route /users/id hai toh wo use karein
                await api.put(`/users/${selectedData.id}`, formData);
                notify.success("Glazier updated successfully! 📝");
            } else {
                // CREATE LOGIC (POST Request)
                await api.post('/glaziers', formData);
                notify.success("Glazier created successfully! 🛠️");
            }

            onGlazierCreated(); // Refresh table
            onClose(); // Close modal
        } catch (err) {
            const errorMsg = err.response?.data?.message || "Action failed";
            alert.error("Error", errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1070 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
                    <form onSubmit={handleSubmit}>
                        <div className="modal-header border-0 p-4 pb-0">
                            <h5 className="fw-bold mb-0">
                                {selectedData ? 'Edit Glazier' : 'Create New Glazier'}
                            </h5>
                            <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                        </div>
                        <div className="modal-body p-4">
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">FULL NAME</label>
                                <input 
                                    required
                                    type="text" 
                                    className="form-control bg-light border-0 shadow-none py-2" 
                                    value={formData.name}
                                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                                    placeholder="e.g. Mike Ross"
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">EMAIL ADDRESS</label>
                                <input 
                                    required
                                    type="email" 
                                    className="form-control bg-light border-0 shadow-none py-2" 
                                    value={formData.email}
                                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                                    placeholder="mike@example.com"
                                />
                            </div>

                            {/* Password field sirf naye user ke liye dikhayein ya optional rakhein */}
                            {!selectedData ? (
                                <div className="p-3 bg-light rounded-3">
                                    <small className="text-muted d-block">Default Security Password:</small>
                                    <code className="fw-bold text-dark">password123</code>
                                </div>
                            ) : (
                                <small className="text-muted italic">Leave password blank to keep current one.</small>
                            )}
                        </div>
                        <div className="modal-footer border-0 p-4 pt-0">
                            <button type="button" className="btn btn-link text-muted text-decoration-none shadow-none" onClick={onClose}>Cancel</button>
                            <button 
                                type="submit" 
                                className="btn text-white px-4 fw-bold shadow-none" 
                                disabled={loading}
                                style={{ backgroundColor: '#34497e', borderRadius: '8px' }}
                            >
                                {loading ? 'Saving...' : (selectedData ? 'Update Glazier' : 'Create Glazier')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default CreateGlazierModal;