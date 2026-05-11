import React, { useState, useEffect } from 'react';
import api from '../../../../api/axios';
import { toast } from 'react-hot-toast';

const DetailsTab = ({ order, onUpdate }) => {
    const [latestSiteVisit, setLatestSiteVisit] = useState('Loading...');
    const [currentStatus, setCurrentStatus] = useState(order?.work_status || 'pending');
    const [currentProgress, setCurrentProgress] = useState(order?.progress || 0);
    const [isUpdating, setIsUpdating] = useState(false);
    const [activities, setActivities] = useState(order?.activities || []);

    // Checklist state
    const [checklist, setChecklist] = useState([
        { id: 1, category: 'Pre-Approval', label: 'Estimate Schedule', completed: false },
        { id: 2, category: 'Pre-Approval', label: 'Quote sent', completed: false },
        { id: 3, category: 'Pre-Approval', label: 'Quote approval from customer', completed: false },
        { id: 4, category: 'Pre-Approval', label: 'Downpayment received', completed: false },
        { id: 5, category: 'Pre-Install', label: 'Material ordered', completed: false },
        { id: 6, category: 'Pre-Install', label: 'Materials received', completed: false },
        { id: 7, category: 'Pre-Install', label: 'Install Scheduled', completed: false },
        { id: 8, category: 'Install In Progress', label: 'Install In Progress', completed: false },
        { id: 9, category: 'Install Completed', label: 'Install completed', completed: false },
        { id: 10, category: 'Install Completed', label: 'Invoice sent', completed: false },
        { id: 11, category: 'Install Completed', label: 'Receive Final payment', completed: false },
        { id: 12, category: 'Install Completed', label: 'Ask for Review', completed: false },
    ]);

    // Update States when order prop changes
    useEffect(() => {
        if (order) {
            setCurrentStatus(order.work_status || 'pending');
            setCurrentProgress(order.progress || 0);
            setActivities(order.activities || []);
            
            // Checklist data sync from DB
            if (order.checklist_data) {
                // Laravel casts array automatically, but sometimes it comes as string
                const savedData = typeof order.checklist_data === 'string' 
                    ? JSON.parse(order.checklist_data) 
                    : order.checklist_data;
                setChecklist(savedData);
            }
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
                console.error("Error fetching site visit:", err);
                setLatestSiteVisit('N/A');
            }
        };
        fetchLatestSiteVisit();
    }, [order?.lead?.id]);

    const handleUpdate = async (newStatus, newProgress, updatedChecklist = null) => {
        if (isUpdating) return;
        setIsUpdating(true);
        try {
            // Direct array bhej rahe hain kyunke backend par casts use ho raha hai
            const response = await api.put(`/jobs/${order.id}`, {
                work_status: newStatus,
                progress: newProgress,
                checklist_data: updatedChecklist // Direct Array
            });

            if (response.data) {
                toast.success('Progress Updated');
                if (onUpdate) await onUpdate();
            }
        } catch (err) {
            console.error("Update failed:", err);
            toast.error('Failed to update');
        } finally {
            setIsUpdating(false);
        }
    };

    const toggleItem = (id) => {
        const updated = checklist.map(item => 
            item.id === id ? { ...item, completed: !item.completed } : item
        );
        
        setChecklist(updated);
        
        const completedCount = updated.filter(i => i.completed).length;
        const newProgress = Math.round((completedCount / updated.length) * 100);
        
        setCurrentProgress(newProgress);
        
        let newStatus = currentStatus;
        if (newProgress === 100) newStatus = 'completed';
        else if (newProgress > 0 && currentStatus === 'pending') newStatus = 'in_progress';
        
        setCurrentStatus(newStatus);
        
        // Pass essential data to backend
        handleUpdate(newStatus, newProgress, updated);
    };

    if (!order) return <div className="p-4 text-center">Loading details...</div>;

    const getInitials = (name) => {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'NA';
    };

    const categories = [...new Set(checklist.map(item => item.category))];

    return (
        <div className="row g-4">
            <div className="col-md-8">
              <div className="card border-0 shadow-sm p-4 mb-4" style={{ borderRadius: '12px' }}>
                    <h6 className="fw-bold mb-4">Job Information</h6>
                    <div className="row g-4">
                        <div className="col-md-6">
                            <label className="text-muted small d-block mb-1">ASSIGNED TO</label>
                            <div className="d-flex align-items-center">
                                <div className="bg-primary text-white rounded-circle me-2 d-flex align-items-center justify-content-center fw-bold" 
                                     style={{ width: '32px', height: '32px', fontSize: '10px' }}>
                                    {getInitials(order.glazier?.name)}
                                </div>
                                <span className="fw-bold small">{order.glazier?.name || 'Unassigned'}</span>
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="text-muted small d-block mb-1">SCHEDULED DATE (SITE VISIT)</label>
                            <div className="small fw-bold text-dark">
                                <i className="bi bi-calendar3 me-2 text-primary"></i>
                                {latestSiteVisit}
                            </div>
                        </div>

                        <div className="col-md-6">
                            <label className="text-muted small d-block mb-1">JOB STATUS</label>
                            <select 
                                className="form-control form-control-sm border-0 bg-light fw-bold text-uppercase" 
                                style={{ width: 'fit-content', fontSize: '0.75rem', cursor: 'pointer' }}
                                value={currentStatus}
                                disabled={isUpdating}
                                onChange={(e) => {
                                    const newStatus = e.target.value;
                                    const newProg = newStatus === 'completed' ? 100 : currentProgress;
                                    handleUpdate(newStatus, newProg, checklist);
                                }}
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>

                        <div className="col-md-6">
                            <label className="text-muted small d-block mb-1">
                                PROGRESS ({currentProgress}%)
                            </label>
                            <div className="d-flex align-items-center gap-2">
                                <div className="progress w-100" style={{ height: '6px', maxWidth: '100px' }}>
                                    <div 
                                        className={`progress-bar ${currentStatus === 'completed' ? 'bg-success' : 'bg-primary'}`}
                                        style={{ width: `${currentProgress}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>

                        <div className="col-12">
                            <label className="text-muted small d-block mb-1">DESCRIPTION</label>
                            <p className="small text-muted mb-0">
                                {order.description || "No description provided for this job."}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="card border-0 shadow-sm p-4" style={{ borderRadius: '12px' }}>
                    <h6 className="text-primary small fw-bold text-uppercase mb-4">
                        <i className="bi bi-list-check me-2"></i>Work Order Checklist
                    </h6>
                    
                    {categories.map((cat, idx) => (
                        <div key={idx} className="mb-4">
                            <div className="d-flex align-items-center mb-3">
                                <span className="badge bg-light text-dark border fw-bold me-2" style={{fontSize: '0.7rem'}}>{cat}</span>
                                <div className="flex-grow-1 border-bottom opacity-25"></div>
                            </div>
                            <div className="row g-3">
                                {checklist.filter(item => item.category === cat).map(item => (
                                    <div key={item.id} className="col-md-6">
                                        <div className={`p-2 rounded border d-flex align-items-center ${item.completed ? 'bg-light border-success' : 'bg-white border-light'}`}>
                                            <div className="form-check mb-0">
                                                <input 
                                                    type="checkbox" 
                                                    className="form-check-input cursor-pointer" 
                                                    checked={item.completed}
                                                    onChange={() => toggleItem(item.id)}
                                                    id={`item-${item.id}`}
                                                />
                                                <label 
                                                    className={`form-check-label small ps-2 cursor-pointer ${item.completed ? 'text-decoration-line-through text-muted' : 'fw-bold'}`} 
                                                    htmlFor={`item-${item.id}`}
                                                >
                                                    {item.label}
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="col-md-4">
                <div className="card border-0 shadow-sm p-4 mb-4" style={{ borderRadius: '12px' }}>
                    <h6 className="fw-bold mb-3">Location</h6>
                    <p className="small text-muted mb-3">{order.lead?.job_address || 'No address available'}</p>
                    {order.lead?.job_address && (
                        <div className="rounded overflow-hidden shadow-sm" style={{ height: '200px', border: '1px solid #eee' }}>
                            <iframe
                                title="Work Order Location" width="100%" height="100%" frameBorder="0"
                                src={`https://maps.google.com/maps?q=${encodeURIComponent(order.lead.job_address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                                allowFullScreen
                            ></iframe>
                        </div>
                    )}
                </div>
                
                <div className="bg-light p-3 rounded shadow-sm" style={{ borderLeft: '4px solid #2b3a67' }}>
                    <h6 className="fw-bold mb-2" style={{ fontSize: '0.7rem' }}>CLIENT CONTACT</h6>
                    <div className="small mb-1"><strong>Name:</strong> {order.lead?.client_name || 'N/A'}</div>
                    <div className="small"><strong>Phone:</strong> {order.lead?.phone || 'N/A'}</div>
                </div>
            </div>
        </div>
    );
};

export default DetailsTab;