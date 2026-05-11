import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';

const AppointmentJobModal = ({ show, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState([]);
    const [formData, setFormData] = useState({
        lead_id: '',
        title: '',
        type: 'appointment',
        date: '',
        time: '',
        status: 'scheduled'
    });

    useEffect(() => {
        if (show) {
            const fetchLeads = async () => {
                try {
                    const response = await api.get('/leads');
                    const leadsData = response.data.data || response.data;
                    setLeads(leadsData);
                } catch (error) {
                    console.error("Error fetching leads:", error);
                }
            };
            fetchLeads();
        }
    }, [show]);

    if (!show) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.lead_id) {
            toast.error("Please select a job first.");
            return;
        }

        setLoading(true);
        const toastId = toast.loading("Scheduling...");
        try {
            // Aapke specification ke mutabiq leadId URL me ja raha hai
            const response = await api.post(`/leads/${formData.lead_id}/appointments`, formData);
            toast.success("Appointment Scheduled!", { id: toastId });
            if (onSuccess) onSuccess(response.data);
            onClose();
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Failed to schedule.";
            toast.error(errorMsg, { id: toastId });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 p-2" style={{ borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                    
                    <style>{`
                        .custom-input { border: 1px solid #eee !important; font-size: 0.85rem !important; border-radius: 8px !important; padding: 10px !important; background-color: #f8f9fa !important; }
                        .btn-save { background-color: #2b3a67 !important; color: white !important; font-size: 0.8rem !important; font-weight: bold !important; border-radius: 8px !important; transition: opacity 0.2s; }
                        .btn-save:disabled { opacity: 0.7; }
                    `}</style>

                    <div className="modal-header border-0 pb-0">
                        <div>
                            <h6 className="fw-bold mb-0" style={{ color: '#1a1a1a' }}>Schedule New Appointment</h6>
                            <small className="text-muted">Assign a slot to an existing job/lead.</small>
                        </div>
                        <button type="button" className="btn-close small shadow-none" onClick={onClose}></button>
                    </div>

                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>
                            
                            {/* Lead/Job Selection */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-secondary">Select Lead *</label>
                                <select 
                                    name="lead_id" 
                                    required 
                                    className="form-select custom-input shadow-none" 
                                    value={formData.lead_id}
                                    onChange={handleChange}
                                >
                                    <option value="">Choose a Lead...</option>
                                    {leads.map(item => (
                                        <option key={item.id} value={item.id || item.id}>
                                            #{item.lead_number } - {item.client_name || 'No Name'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Type Selection */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-secondary">Type *</label>
                                <select 
                                    name="type" 
                                    className="form-select custom-input shadow-none"
                                    value={formData.type}
                                    onChange={handleChange}
                                >
                                    <option value="appointment">General Appointment</option>
                                </select>
                            </div>

                            {/* Title */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-secondary">Title / Reason *</label>
                                <input 
                                    type="text" 
                                    name="title"
                                    required
                                    className="form-control custom-input shadow-none" 
                                    placeholder="e.g. Measurement or Consultation" 
                                    value={formData.title}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Date & Time Row */}
                            <div className="row g-3 mb-4">
                                <div className="col-6">
                                    <label className="form-label small fw-bold text-secondary">Date *</label>
                                    <input 
                                        type="date" 
                                        name="date"
                                        required
                                        className="form-control custom-input shadow-none" 
                                        value={formData.date}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="col-6">
                                    <label className="form-label small fw-bold text-secondary">Time *</label>
                                    <input 
                                        type="time" 
                                        name="time"
                                        required
                                        className="form-control custom-input shadow-none" 
                                        value={formData.time}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="d-flex gap-2">
                                <button 
                                    type="button" 
                                    className="btn btn-light flex-fill fw-bold border py-2 text-uppercase" 
                                    onClick={onClose}
                                    style={{ fontSize: '11px', borderRadius: '8px' }}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-save flex-fill py-2 text-uppercase shadow-sm" 
                                    disabled={loading}
                                >
                                    {loading ? 'Processing...' : 'Confirm Appointment'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AppointmentJobModal;