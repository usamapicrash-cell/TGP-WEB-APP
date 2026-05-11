import React, { useState, useEffect } from 'react';
import api from '../../../../api/axios';
import { toast } from 'react-hot-toast';
import StatusHandler from '../../../../components/StatusHandler';
// AdminCalendar ko import karein (apne sahi path ke mutabiq)
import AdminCalendar from '../../calendarAttach'; 

const Schedule = ({ leadId }) => {
    // ... (Aapka existing state aur logic yahan rahega)
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    
    const [formData, setFormData] = useState({ 
        title: '', 
        type: 'appointment', 
        date: '', 
        time: '' 
    });

    const fetchAppointments = async () => {
        if (!leadId) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/leads/${leadId}/appointments`);
            setAppointments(data || []);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAppointments(); }, [leadId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        const toastId = toast.loading("Scheduling...");
        
        try {
            await api.post(`/leads/${leadId}/appointments`, formData);
            toast.success("Appointment Scheduled", { id: toastId });
            setFormData({ title: '', type: 'appointment', date: '', time: '' });
            setIsAdding(false);
            fetchAppointments();
        } catch (err) {
            const message = err.response?.data?.message || "Failed to schedule";
            toast.error(message, { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="row g-3">
            <style>{`
                .border-dashed { border: 2px dashed #dee2e6 !important; transition: all 0.3s ease; border-radius: 12px; }
                .border-dashed:hover { border-color: #2b3a67 !important; background-color: #f1f3f9 !important; }
                .custom-input { border: 1px solid #eee !important; font-size: 0.85rem !important; border-radius: 8px !important; padding: 10px !important; }
                .btn-save { background-color: #2b3a67 !important; color: white !important; font-size: 0.75rem !important; font-weight: bold !important; border-radius: 8px !important; }
                .badge-visit { background-color: #fff3cd; color: #856404; border: 1px solid #ffeeba; }
                .badge-app { background-color: #e1e7ff; color: #2b3a67; border: 1px solid #d1d9ff; }
                .avatar-sm { width: 30px; height: 30px; font-size: 0.65rem; background-color: #f8f9fa; border: 1px solid #dee2e6; }
            `}</style>

            <div className="col-12 mb-2">
                <h6 className="fw-bold small mb-0 text-uppercase" style={{ color: '#2b3a67', letterSpacing: '0.5px' }}>
                    Appointments & Site Visits
                </h6>
            </div>

            {/* Lead Specific Appointments List */}
            <div className="row g-3">
                <div className="col-md-6">
                    {isAdding ? (
                        <div className="card border shadow-sm p-3 h-100" style={{ borderRadius: '12px' }}>
                            <form onSubmit={handleSubmit}>
                                <div className="d-flex justify-content-between mb-3">
                                    <h6 className="fw-bold mb-0" style={{ fontSize: '0.85rem' }}>Schedule New Slot</h6>
                                    <button type="button" onClick={() => setIsAdding(false)} className="btn-close" style={{ fontSize: '0.6rem' }}></button>
                                </div>
                                <div className="row g-2">
                                    <div className="col-12">
                                        <select className="form-select custom-input" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                                            <option value="appointment">General Appointment</option>
                                        </select>
                                    </div>
                                    <div className="col-12">
                                        <input required type="text" placeholder="Title / Reason" className="form-control custom-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                                    </div>
                                    <div className="col-6">
                                        <input required type="date" className="form-control custom-input" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} />
                                    </div>
                                    <div className="col-6">
                                        <input required type="time" className="form-control custom-input" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} />
                                    </div>
                                    <div className="col-12 mt-2">
                                        <button type="submit" className="btn btn-save w-100 py-2 shadow-sm" disabled={saving}>
                                            {saving ? 'SAVING...' : 'CONFIRM SCHEDULE'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    ) : (
                        <div className="card border-dashed h-100 d-flex align-items-center justify-content-center py-4" style={{ cursor: 'pointer', minHeight: '145px' }} onClick={() => setIsAdding(true)}>
                            <div className="text-center">
                                <div className="bg-white shadow-sm rounded-circle d-inline-flex align-items-center justify-content-center mb-2" style={{width: '35px', height: '35px'}}>
                                    <i className="bi bi-plus-lg text-primary"></i>
                                </div>
                                <p className="small mb-0 fw-bold d-block">Add Slot</p>
                            </div>
                        </div>
                    )}
                </div>

                <StatusHandler loading={loading} error={error} data={appointments} loadingText="Loading Schedule...">
                    {appointments.map((app) => (
                        <div className="col-md-6" key={app.id}>
                            {/* ... (Aapka existing Card UI) */}
                            <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: '12px', borderLeft: `5px solid ${app.type === 'site_visit' ? '#ffc107' : '#2b3a67'}` }}>
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <span className={`badge mb-2 px-2 py-1 ${app.type === 'site_visit' ? 'badge-visit' : 'badge-app'}`} style={{ fontSize: '0.6rem', textTransform: 'uppercase' }}>
                                            {app.type.replace('_', ' ')}
                                        </span>
                                        <h6 className="fw-bold mb-1" style={{ fontSize: '0.9rem' }}>{app.title}</h6>
                                        <p className="text-muted small mb-0">
                                            <i className="bi bi-calendar-check me-1"></i>
                                            {new Date(app.date).toLocaleDateString('en-GB')} | 
                                            <span className="ms-1">
                                                {new Date(`2000-01-01T${app.time}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                            </span>
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </StatusHandler>
            </div>

            {/* --- YAHA ADMIN CALENDAR AA JAYEGA --- */}
            <div className="col-12 mt-5">
                <hr className="my-4 text-muted opacity-25" />
                <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-calendar-range text-muted"></i>
                    <h6 className="fw-bold small mb-0 text-uppercase text-muted" style={{ letterSpacing: '0.5px' }}>
                        Availability Overview
                    </h6>
                </div>
                <div className="rounded-4 overflow-hidden border shadow-sm bg-white">
                    <AdminCalendar isCompact={true} /> 
                </div>
            </div>
        </div>
    );
};

export default Schedule;