import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { notify } from '../../../utils/notifier';

const ScheduleJobModal = ({ show, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [leads, setLeads] = useState([]); // Leads fetch karne ke liye
    const [formData, setFormData] = useState({
        lead_id: '',
        title: '',
        type: 'site_visit',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        end_time: '10:00',
        status: 'scheduled',
        description: '',
        icon: 'bi-calendar-check'
    });

    const iconOptions = [
        { label: 'General Visit', value: 'bi-geo-alt' },
        { label: 'Measurement', value: 'bi-rulers' },
        { label: 'Installation', value: 'bi-tools' },
        { label: 'Delivery', value: 'bi-truck' },
        { label: 'Repair', value: 'bi-wrench' },
        { label: 'Consultation', value: 'bi-chat-dots' }
    ];

    // Leads load karna jab modal khule
    useEffect(() => {
        if (show) {
            const fetchLeads = async () => {
                try {
                    const response = await api.get('/jobs'); // Aapka leads ka endpoint
                    // Laravel pagination response handle karne ke liye (agar pagination hai)
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
            notify.error("Please select a job first.");
            return;
        }

        setLoading(true);
        try {
            // Post to your endpoint (leadId as part of URL according to your backend)
            const response = await api.post(`/appointments/lead/${formData.lead_id}`, formData);
            notify.success("Site visit scheduled successfully!");
            if (onSuccess) onSuccess(response.data);
            onClose();
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Failed to schedule visit.";
            notify.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 p-2" style={{ borderRadius: '12px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
                    
                    {/* Modal Header */}
                    <div className="modal-header border-0 pb-0">
                        <div>
                            <h6 className="fw-bold mb-0" style={{ color: '#1a1a1a' }}>Schedule New Job</h6>
                            <small className="text-muted">Assign a site visit to an existing job.</small>
                        </div>
                        <button type="button" className="btn-close small shadow-none" onClick={onClose}></button>
                    </div>

                    <div className="modal-body">
                        <form onSubmit={handleSubmit}>
                            
                            {/* Which Lead? (Lead Selection) */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-secondary">Which Job? *</label>
                                <select 
                                    name="lead_id" 
                                    required 
                                    className="form-select form-select-sm bg-light border-0 py-2 shadow-none" 
                                    style={{ borderRadius: '8px' }}
                                    value={formData.lead_id}
                                    onChange={handleChange}
                                >
                                    <option value="">Select a job</option>
                                    {leads.map(lead => (
                                        <option key={lead.lead.id} value={lead.lead.id}>
                                            #{lead.job_number} - {lead.lead.client_name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Job Title */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-secondary">Job Title *</label>
                                <input 
                                    type="text" 
                                    name="title"
                                    required
                                    className="form-control form-control-sm bg-light border-0 py-2 shadow-none" 
                                    placeholder="E.G Window Replacement" 
                                    style={{ borderRadius: '8px' }}
                                    value={formData.title}
                                    onChange={handleChange}
                                />
                            </div>

                            {/* Visit Type Icon */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-secondary">Visit Type</label>
                                <select 
                                    name="icon" 
                                    className="form-select form-select-sm bg-light border-0 py-2 shadow-none" 
                                    style={{ borderRadius: '8px' }}
                                    value={formData.icon}
                                    onChange={handleChange}
                                >
                                    {iconOptions.map((opt, idx) => (
                                        <option key={idx} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date & Time Row */}
                            <div className="row g-3 mb-3">
                                <div className="col-12">
                                    <label className="form-label small fw-bold text-secondary">Date *</label>
                                    <input 
                                        type="date" 
                                        name="date"
                                        required
                                        className="form-control form-control-sm bg-light border-0 py-2 shadow-none" 
                                        style={{ borderRadius: '8px' }}
                                        value={formData.date}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="col-6">
                                    <label className="form-label small fw-bold text-secondary">Start Time *</label>
                                    <input 
                                        type="time" 
                                        name="time"
                                        required
                                        className="form-control form-control-sm bg-light border-0 py-2 shadow-none" 
                                        style={{ borderRadius: '8px' }}
                                        value={formData.time}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="col-6">
                                    <label className="form-label small fw-bold text-secondary">End Time</label>
                                    <input 
                                        type="time" 
                                        name="end_time"
                                        className="form-control form-control-sm bg-light border-0 py-2 shadow-none" 
                                        style={{ borderRadius: '8px' }}
                                        value={formData.end_time}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            {/* Status */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-secondary">Status</label>
                                <select 
                                    name="status" 
                                    className="form-select form-select-sm bg-light border-0 py-2 shadow-none" 
                                    style={{ borderRadius: '8px' }}
                                    value={formData.status}
                                    onChange={handleChange}
                                >
                                    <option value="scheduled">Scheduled</option>
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            {/* Description */}
                            <div className="mb-4">
                                <label className="form-label small fw-bold text-secondary">Notes</label>
                                <textarea 
                                    name="description" 
                                    className="form-control form-control-sm bg-light border-0 shadow-none" 
                                    rows="2" 
                                    placeholder="Any specific instructions..."
                                    style={{ borderRadius: '8px' }}
                                    value={formData.description}
                                    onChange={handleChange}
                                ></textarea>
                            </div>

                            {/* Action Buttons */}
                            <div className="d-flex gap-2 pt-2">
                                <button 
                                    type="button" 
                                    className="btn btn-light flex-fill fw-bold border py-2 text-uppercase" 
                                    onClick={onClose}
                                    style={{ fontSize: '12px', borderRadius: '8px' }}
                                    disabled={loading}
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    className="btn btn-primary flex-fill fw-bold py-2 border-0 text-uppercase" 
                                    style={{ backgroundColor: '#2b3a67', fontSize: '12px', borderRadius: '8px' }}
                                    disabled={loading}
                                >
                                    {loading ? 'Processing...' : 'Confirm'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleJobModal;