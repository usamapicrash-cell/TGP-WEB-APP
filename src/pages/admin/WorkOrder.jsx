import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import WorkOrderDetailView from './workorder/WorkOrderDetailView';

const WorkOrder = () => {
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);

    // --- Fetch Jobs from API ---
    const fetchJobs = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/jobs'); 
            setJobs(response.data);
        } catch (err) {
            console.error("Error fetching jobs:", err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchJobs();
    }, [fetchJobs]);

    // Helper to determine step status from checklist_data
    const getStepStatus = (checklist, categoryName) => {
        if (!checklist || !Array.isArray(checklist)) return 'pending';
        
        const categoryItems = checklist.filter(item => item.category === categoryName);
        if (categoryItems.length === 0) return 'pending';

        const allDone = categoryItems.every(item => item.completed);
        const someDone = categoryItems.some(item => item.completed);

        if (allDone) return 'completed';
        if (someDone) return 'active';
        return 'pending';
    };

    // --- Skeleton Loader Component ---
    const CardSkeleton = () => (
        <div className="card border-0 shadow-sm p-3 p-md-4 mb-3" style={{ borderRadius: '12px' }}>
            <div className="d-flex justify-content-between mb-3">
                <div className="w-50">
                    <div className="skeleton-box mb-2" style={{ width: '70%', height: '20px' }}></div>
                    <div className="skeleton-box" style={{ width: '40%', height: '12px' }}></div>
                </div>
                <div className="skeleton-box" style={{ width: '80px', height: '24px', borderRadius: '20px' }}></div>
            </div>
            <div className="mb-4">
                <div className="skeleton-box mb-2" style={{ width: '100%', height: '8px' }}></div>
            </div>
            <div className="d-flex gap-2">
                <div className="skeleton-box" style={{ width: '100px', height: '32px' }}></div>
                <div className="skeleton-box" style={{ width: '100px', height: '32px' }}></div>
            </div>
        </div>
    );

    if (selectedOrder) {
        return <WorkOrderDetailView order={selectedOrder} onBack={() => setSelectedOrder(null)} />;
    }

    return (
        <div className="p-2 p-md-3">
            <style>
                {`
                    /* Stepper Scrollbar for Mobile */
                    .stepper-container::-webkit-scrollbar {
                        display: none;
                    }
                    .stepper-container {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}
            </style>

            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="fw-bold mb-0">Work Order</h4>
                    <p className="text-muted small mb-0">Monitor all active jobs and their progress</p>
                </div>
                <button className="btn btn-light border shadow-sm px-3" onClick={fetchJobs} disabled={loading}>
                    <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
                </button>
            </div>

            {/* List Section */}
            <div className="d-flex flex-column gap-3">
                {loading ? (
                    <>
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                    </>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-5 bg-white rounded-3 shadow-sm">
                        <i className="bi bi-clipboard-x fs-1 text-muted"></i>
                        <p className="mt-2 text-muted mb-0">No active jobs found.</p>
                    </div>
                ) : (
                    jobs.map((job) => {
                        const steps = [
                            { label: 'Pre-Approval', cat: 'Pre-Approval', icon: 'bi-file-earmark-check' },
                            { label: 'Pre-Install', cat: 'Pre-Install', icon: 'bi-box-seam' },
                            { label: 'Install', cat: 'Install In Progress', icon: 'bi-tools' },
                            { label: 'Done', cat: 'Install Completed', icon: 'bi-house-check' }
                        ];

                        return (
                            <div key={job.id} className="card border-0 shadow-sm p-3 p-md-4" style={{ borderRadius: '12px' }}>
                                {/* Card Header Info */}
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start gap-2 mb-3">
                                    <div className="w-100">
                                        <span className="text-muted small d-block">{job.lead?.lead_number}</span>
                                        <h5 className="fw-bold mb-1 text-break" style={{ fontSize: '1.1rem' }}>
                                            {job.title || (job.lead?.client_name ? `${job.lead.client_name} - Job` : 'Job Request')}
                                        </h5>
                                        <div className="d-flex flex-wrap gap-2 gap-sm-3 text-muted small mt-1">
                                            <span><i className="bi bi-person me-1"></i>{job.lead?.client_name || 'N/A'}</span>
                                            <span className="text-break">
                                                <i className="bi bi-geo-alt me-1"></i>{job.lead?.job_address || 'No Address'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="d-flex flex-row flex-sm-column justify-content-between align-items-center align-items-sm-end w-100 w-sm-auto border-top border-sm-0 pt-2 pt-sm-0 mt-1 mt-sm-0">
                                        <span className="fw-bold text-primary">{job.job_number}</span>
                                        <span className="badge rounded-pill bg-light fw-bold px-3 py-2 text-uppercase mt-sm-1" 
                                              style={{ color: 'var(--primary-blue)', fontSize: '0.65rem', border: '1px solid #eee' }}>
                                            {job.work_status || 'Pending'}
                                        </span>
                                    </div>
                                </div>

                                {/* --- DOMINO STEPPER --- */}
                                <div className="domino-stepper stepper-container overflow-x-auto mb-4 mt-2 py-1">
                                    <div className="d-flex align-items-center flex-nowrap" style={{ minWidth: '320px' }}>
                                        {steps.map((step, index) => {
                                            const status = getStepStatus(job.checklist_data, step.cat);
                                            return (
                                                <div key={index} className={`step-item ${status} flex-fill`}>
                                                    <div className="step-icon">
                                                        {status === 'completed' ? <i className="bi bi-check-lg"></i> : <i className={`bi ${step.icon}`}></i>}
                                                    </div>
                                                    <div className="step-label">{step.label}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Progress & Action Controls */}
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-stretch align-items-sm-center gap-3">
                                    <div className="w-100 w-sm-50">
                                        <div className="d-flex justify-content-between small mb-1">
                                            <span className="text-muted x-small fw-bold">Overall Progress</span>
                                            <span className="fw-bold x-small">{job.progress || 0}%</span>
                                        </div>
                                        <div className="progress" style={{ height: '6px', backgroundColor: '#f0f2f5', borderRadius: '10px' }}>
                                            <div 
                                                className="progress-bar progress-bar-striped progress-bar-animated" 
                                                style={{ 
                                                    width: `${job.progress || 0}%`, 
                                                    backgroundColor: 'var(--primary-blue)', 
                                                    borderRadius: '10px' 
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                    
                                    <button 
                                        className="btn btn-primary btn-sm px-4 py-2 py-sm-1 shadow-none" 
                                        style={{ backgroundColor: 'var(--primary-blue)', border: 'none', borderRadius: '8px' }}
                                        onClick={() => setSelectedOrder(job)}
                                    >
                                        View Details
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default WorkOrder;