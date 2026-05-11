import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';

const DetailsTab = ({ order, onUpdate }) => {
    const [latestSiteVisit, setLatestSiteVisit] = useState('Loading...');
    const [currentStatus, setCurrentStatus] = useState(order?.work_status || 'pending');
    const [currentProgress, setCurrentProgress] = useState(order?.progress || 0);
    const [isUpdating, setIsUpdating] = useState(false);

    // Sync state with order prop (Important for forward/backward navigation)
    useEffect(() => {
        if (order) {
            setCurrentStatus(order.work_status || 'pending');
            setCurrentProgress(order.progress || 0);
        }
    }, [order]);

    useEffect(() => {
        const fetchLatestSiteVisit = async () => {
            const leadId = order?.lead?.id;
            if (!leadId) {
                setLatestSiteVisit('Not Scheduled');
                return;
            }
            try {
                const { data } = await api.get(`/leads/${leadId}/appointments`);
                const siteVisits = (data || [])
                    .filter(app => app.type === 'site_visit')
                    .sort((a, b) => new Date(b.date) - new Date(a.date));

                if (siteVisits.length > 0) {
                    const formattedDate = new Date(siteVisits[0].date).toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                    });
                    setLatestSiteVisit(formattedDate);
                } else {
                    setLatestSiteVisit('Not Scheduled');
                }
            } catch (err) {
                setLatestSiteVisit('N/A');
            }
        };
        fetchLatestSiteVisit();
    }, [order?.lead?.id]);

    const handleUpdate = async (newStatus, newProgress) => {
        // Optimistic update: UI pehle update karein
        const statusToSave = newStatus;
        const progressToSave = parseInt(newProgress);

        setIsUpdating(true);
        try {
            await api.put(`/jobs/${order.id}`, {
                work_status: statusToSave,
                progress: progressToSave
            });
            toast.success('Status Updated');
            
            // Parent ko update dein taake headers refresh hon
            if (onUpdate) await onUpdate();
        } catch (err) {
            console.error("Update error:", err);
            toast.error('Failed to update');
            // Revert back on error
            setCurrentStatus(order?.work_status || 'pending');
            setCurrentProgress(order?.progress || 0);
        } finally {
            setIsUpdating(false);
        }
    };

    const getInitials = (name) => name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'NA';

    return (
        <div className="row g-4">
            <div className="col-md-8">
                {/* Job Information Card */}
                <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
                    <div className="card-body p-4">
                        <h5 className="fw-bold mb-4" style={{ fontSize: '1.1rem' }}>Job Information</h5>
                        <div className="row g-4">
                            {/* Assigned To */}
                            <div className="col-6 col-md-6">
                                <label className="text-muted small fw-bold text-uppercase mb-2 d-block">Assigned To</label>
                                <div className="d-flex align-items-center">
                                    <div className="bg-primary text-white rounded-circle me-2 d-flex align-items-center justify-content-center fw-bold" 
                                         style={{ width: '36px', height: '36px', fontSize: '12px' }}>
                                        {getInitials(order.glazier?.name)}
                                    </div>
                                    <span className="fw-bold text-dark">{order.glazier?.name || 'Unassigned'}</span>
                                </div>
                            </div>

                            {/* Scheduled Date */}
                            <div className="col-6 col-md-6">
                                <label className="text-muted small fw-bold text-uppercase mb-2 d-block">Scheduled Date</label>
                                <div className="d-flex align-items-center fw-bold text-dark">
                                    <i className="bi bi-calendar4-event me-2 text-primary fs-5"></i>
                                    {latestSiteVisit}
                                </div>
                            </div>

                            {/* Estimated Value */}
                            <div className="col-6 col-md-6">
                                <label className="text-muted small fw-bold text-uppercase mb-2 d-block">Estimated Value</label>
                                <div className="fw-bold text-dark fs-6">
                                    ${order.lead?.value ? parseFloat(order.lead.value).toLocaleString() : '0.00'}
                                </div>
                            </div>

                            {/* Status Dropdown */}
                            <div className="col-6 col-md-6">
                                <label className="text-muted small fw-bold text-uppercase mb-2 d-block">Status</label>
                                <select 
                                    className="form-select form-select-sm border-0 bg-light fw-bold text-primary text-uppercase"
                                    style={{ borderRadius: '8px', width: 'fit-content' }}
                                    value={currentStatus}
                                    disabled={isUpdating}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setCurrentStatus(val);
                                        // Agar status complete ho to progress 100 kardein
                                        const autoProg = val === 'completed' ? 100 : currentProgress;
                                        setCurrentProgress(autoProg);
                                        handleUpdate(val, autoProg);
                                    }}
                                >
                                    <option value="pending">Pending</option>
                                    <option value="in_progress">In Progress</option>
                                    <option value="completed">Completed</option>
                                </select>
                            </div>

                            {/* Progress Slider */}
                            <div className="col-12 mt-4">
                                <label className="text-muted small fw-bold text-uppercase mb-2 d-block">
                                    Job Completion ({currentProgress}%)
                                </label>
                                <div className="progress mb-2" style={{ height: '8px', borderRadius: '10px', backgroundColor: '#eee' }}>
                                    <div className="progress-bar bg-primary" role="progressbar" 
                                         style={{ width: `${currentProgress}%`, borderRadius: '10px', transition: 'width 0.3s ease' }}>
                                    </div>
                                </div>
                                {/*<input 
                                    type="range" 
                                    className="form-range custom-range" 
                                    min="0" max="100" 
                                    step="1"
                                    value={currentProgress} 
                                    disabled={isUpdating || currentStatus === 'completed'}
                                    onChange={(e) => setCurrentProgress(e.target.value)}
                                    onMouseUp={(e) => handleUpdate(currentStatus, e.target.value)}
                                    onTouchEnd={(e) => handleUpdate(currentStatus, e.target.value)}
                                />*/}
                            </div>

                            {/* Description */}
                            <div className="col-12 mt-3">
                                <label className="text-muted small fw-bold text-uppercase mb-1 d-block">Description</label>
                                <p className="text-muted mb-0" style={{ fontSize: '0.9rem', lineHeight: '1.6' }}>
                                    {order.description || "No description provided for this job."}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Audit Summary Section */}
                {/*<div className="card border-0 shadow-sm p-4" style={{ borderRadius: '16px' }}>
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h6 className="fw-bold mb-0">Job Activity Summary</h6>
                        <span className="text-primary small fw-bold">Active Log</span>
                    </div>
                    <div className="bg-light p-3 rounded-3 text-center">
                        <p className="small text-muted mb-0 italic">
                           Recent activities are tracked in the history tab.
                        </p>
                    </div>
                </div>*/}
            </div>

            {/* Right Column: Location & Contact */}
            <div className="col-md-4">
                <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '16px' }}>
                    <div className="card-body p-4">
                        <h6 className="fw-bold mb-3">Location</h6>
                        <div className="d-flex align-items-start mb-3">
                            <i className="bi bi-geo-alt text-danger me-2 mt-1"></i>
                            <p className="small text-muted mb-0">{order.lead?.job_address || 'Address not available'}</p>
                        </div>
                        {order.lead?.job_address && (
                            <div className="rounded-4 overflow-hidden shadow-sm" style={{ height: '180px' }}>
                                <iframe
                                    title="Map" width="100%" height="100%" frameBorder="0" style={{ border: 0 }}
                                    src={`https://maps.google.com/maps?q=${encodeURIComponent(order.lead.job_address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                    allowFullScreen
                                ></iframe>
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
                    <div className="card-body p-4">
                        <h6 className="fw-bold mb-3">Client Contact</h6>
                        <div className="mb-3">
                            <div className="text-muted small text-uppercase fw-bold mb-1" style={{ fontSize: '0.65rem' }}>Client Name</div>
                            <div className="fw-bold text-dark">{order.lead?.client_name || 'N/A'}</div>
                        </div>
                        <div>
                            <div className="text-muted small text-uppercase fw-bold mb-1" style={{ fontSize: '0.65rem' }}>Phone Number</div>
                            <div className="fw-bold text-primary">
                                <i className="bi bi-telephone-fill me-2 small"></i>
                                {order.lead?.phone || 'N/A'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailsTab;