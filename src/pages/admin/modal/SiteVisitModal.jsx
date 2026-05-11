import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { notify } from '../../../utils/notifier';

const SiteVisitModal = ({ show, onClose, visitData, leadId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        type: 'site_visit',
        date: '',
        time: '',
        end_time: '',
        status: 'scheduled',
        description: '',
        icon: 'bi-calendar-check' // Default icon
    });

    // Icons ki list dropdown ke liye
    const iconOptions = [
        { label: 'General Visit', value: 'bi-geo-alt' },
        { label: 'Measurement', value: 'bi-rulers' },
        { label: 'Installation', value: 'bi-tools' },
        { label: 'Delivery', value: 'bi-truck' },
        { label: 'Repair', value: 'bi-wrench' },
        { label: 'Consultation', value: 'bi-chat-dots' }
    ];

    useEffect(() => {
        if (visitData) {
            setFormData({
                title: visitData.title || '',
                type: visitData.type || 'site_visit',
                date: visitData.date || '',
                time: visitData.time || '',
                end_time: visitData.end_time || '',
                status: visitData.status || 'scheduled',
                description: visitData.description || '',
                icon: visitData.icon || 'bi-calendar-check'
            });
        } else {
            setFormData({
                title: '',
                type: 'site_visit',
                date: new Date().toISOString().split('T')[0],
                time: '09:00',
                end_time: '10:00',
                status: 'scheduled',
                description: '',
                icon: 'bi-calendar-check'
            });
        }
    }, [visitData, show]);

    if (!show) return null;

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let response;
            if (visitData) {
                response = await api.put(`/appointments/${visitData.id}`, formData);
                notify.success("Site visit updated successfully!");
            } else {
                response = await api.post(`/appointments/lead/${leadId}`, formData);
                notify.success("Site visit logged successfully!");
            }
            if (onSuccess) onSuccess(response.data);
            onClose();
        } catch (error) {
            const errorMsg = error.response?.data?.message || "Failed to save site visit.";
            notify.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '12px' }}>
                    <div className="modal-header border-bottom-0 pt-4 px-4 pb-2">
                        <h5 className="modal-title fw-bold mb-0">{visitData ? 'Edit Site Visit' : 'Log New Site Visit'}</h5>
                        <button type="button" className="btn-close shadow-none" onClick={onClose} disabled={loading}></button>
                    </div>

                    <div className="modal-body px-4 pb-4">
                        <form onSubmit={handleSubmit}>
                            {/* Title */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold mb-1">Title *</label>
                                <input type="text" name="title" required className="form-control form-control-sm bg-light border-0 py-2 shadow-none" 
                                    value={formData.title} onChange={handleChange} placeholder="E.g. Measurement for Glass" />
                            </div>

                            {/* Icon Selection Dropdown */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold mb-1">Visit Type Icon</label>
                                <select name="icon" className="form-select form-select-sm bg-light border-0 py-2 shadow-none" 
                                    value={formData.icon} onChange={handleChange}>
                                    {iconOptions.map((opt, idx) => (
                                        <option key={idx} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Date */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold mb-1">Scheduled Date *</label>
                                <input type="date" name="date" required className="form-control form-control-sm bg-light border-0 py-2 shadow-none" 
                                    value={formData.date} onChange={handleChange} />
                            </div>

                            {/* Times */}
                            <div className="row g-3 mb-3">
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold mb-1">Start Time *</label>
                                    <input type="time" name="time" required className="form-control form-control-sm bg-light border-0 py-2 shadow-none" 
                                        value={formData.time} onChange={handleChange} />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold mb-1">End Time</label>
                                    <input type="time" name="end_time" className="form-control form-control-sm bg-light border-0 py-2 shadow-none" 
                                        value={formData.end_time} onChange={handleChange} />
                                </div>
                            </div>

                            {/* Status & Notes (Same as before) */}
                            <div className="mb-3">
                                <label className="form-label small fw-bold mb-1">Status</label>
                                <select name="status" className="form-select form-select-sm bg-light border-0 py-2 shadow-none" value={formData.status} onChange={handleChange}>
                                    <option value="scheduled">Scheduled</option>
                                    <option value="pending">Pending</option>
                                    <option value="completed">Completed</option>
                                    <option value="cancelled">Cancelled</option>
                                </select>
                            </div>

                            <div className="mb-4">
                                <label className="form-label small fw-bold mb-1">Notes</label>
                                <textarea name="description" className="form-control form-control-sm bg-light border-0 shadow-none" rows="3" 
                                    value={formData.description} onChange={handleChange} placeholder="Enter visit details..."></textarea>
                            </div>

                            <button type="submit" disabled={loading} className="btn w-100 fw-bold text-white py-2 shadow-sm" style={{ backgroundColor: '#2b3a67', borderRadius: '8px' }}>
                                {loading ? 'PROCESSING...' : (visitData ? 'SAVE CHANGES' : 'LOG VISIT')}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SiteVisitModal;