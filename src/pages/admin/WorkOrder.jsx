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
        <div className="card border-0 shadow-sm p-2.5 p-md-4 mb-2" style={{ borderRadius: '10px' }}>
            <div className="d-flex justify-content-between mb-2">
                <div className="w-50">
                    <div className="skeleton-box mb-1" style={{ width: '70%', height: '16px' }}></div>
                    <div className="skeleton-box" style={{ width: '40%', height: '10px' }}></div>
                </div>
                <div className="skeleton-box" style={{ width: '70px', height: '20px', borderRadius: '15px' }}></div>
            </div>
            <div className="mb-3">
                <div className="skeleton-box mb-1" style={{ width: '100%', height: '6px' }}></div>
            </div>
            <div className="d-flex gap-2">
                <div className="skeleton-box" style={{ width: '90px', height: '28px' }}></div>
                <div className="skeleton-box" style={{ width: '90px', height: '28px' }}></div>
            </div>
        </div>
    );

    if (selectedOrder) {
        return <WorkOrderDetailView order={selectedOrder} onBack={() => setSelectedOrder(null)} />;
    }

    return (
        <div className="p-2 p-md-4">
            <style>
                {`
                    /* Stepper Container Base */
                    .stepper-wrapper {
                        position: relative;
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        max-width: 550px;
                        margin: 0 auto;
                        padding: 4px 0;
                    }

                    /* Stepper Line Behind Icons */
                    .stepper-wrapper::before {
                        content: '';
                        position: absolute;
                        top: 16px;
                        left: 10px;
                        right: 10px;
                        height: 2px;
                        background-color: #e2e8f0;
                        z-index: 1;
                    }

                    .step-item {
                        position: relative;
                        z-index: 2;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        background: transparent;
                    }

                    /* Stepper Icon Circle */
                    .step-icon {
                        width: 32px;
                        height: 32px;
                        border-radius: 50%;
                        background-color: #ffffff;
                        border: 2px solid #cbd5e1;
                        color: #64748b;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 13px;
                        transition: all 0.2s ease;
                    }

                    /* Mobile Specific Compact Adjustments */
                    @media (max-width: 576px) {
                        .stepper-wrapper::before {
                            top: 14px;
                        }
                        .step-icon {
                            width: 28px;
                            height: 28px;
                            font-size: 11px;
                        }
                        .step-label {
                            font-size: 9px !important;
                            margin-top: 3px !important;
                        }
                    }

                    /* Active State */
                    .step-item.active .step-icon {
                        border-color: #34497e;
                        color: #34497e;
                        background-color: #f1f5f9;
                    }

                    /* Completed State */
                    .step-item.completed .step-icon {
                        background-color: #34497e;
                        border-color: #34497e;
                        color: #ffffff;
                    }

                    .step-label {
                        font-size: 10px;
                        font-weight: 600;
                        color: #64748b;
                        margin-top: 4px;
                        text-transform: uppercase;
                        letter-spacing: 0.2px;
                        text-align: center;
                    }

                    .step-item.completed .step-label,
                    .step-item.active .step-label {
                        color: #1e293b;
                        font-weight: 700;
                    }

                    .btn-view-details {
                        background-color: #34497e !important;
                        border: none !important;
                        border-radius: 6px !important;
                        height: 34px !important;
                        font-size: 12px !important;
                        font-weight: 600 !important;
                    }

                    .btn-view-details:hover {
                        background-color: #283863 !important;
                    }

                    /* Skeleton Loader styles */
                    .skeleton-box {
                        background-color: #e2e8f0;
                        border-radius: 4px;
                        animation: pulse 1.5s infinite ease-in-out;
                    }

                    @keyframes pulse {
                        0% { opacity: 0.6; }
                        50% { opacity: 1; }
                        100% { opacity: 0.6; }
                    }
                `}
            </style>

            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h5 className="fw-bold mb-0 text-dark">Work Orders</h5>
                    <p className="text-muted small mb-0" style={{ fontSize: '12px' }}>Monitor all active jobs and their progress</p>
                </div>
                <button className="btn btn-light border shadow-sm p-1.5 px-2.5 rounded-3" onClick={fetchJobs} disabled={loading}>
                    <i className={`bi bi-arrow-clockwise ${loading ? 'spin' : ''}`}></i>
                </button>
            </div>

            {/* List Section */}
            <div className="d-flex flex-column gap-2.5">
                {loading ? (
                    <>
                        <CardSkeleton />
                        <CardSkeleton />
                        <CardSkeleton />
                    </>
                ) : jobs.length === 0 ? (
                    <div className="text-center py-4 bg-white rounded-3 shadow-sm border">
                        <i className="bi bi-clipboard-x fs-2 text-muted"></i>
                        <p className="mt-1 text-muted small mb-0">No active jobs found.</p>
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
                            <div key={job.id} className="card border-0 shadow-sm p-3 p-md-3.5" style={{ borderRadius: '10px' }}>
                                
                                {/* Top Header Info */}
                                <div className="d-flex flex-row justify-content-between align-items-start gap-2 mb-2">
                                    <div>
                                        <span className="text-muted fw-semibold d-block" style={{ fontSize: '11px' }}>{job.lead?.lead_number || 'LD-N/A'}</span>
                                        <h6 className="fw-bold text-dark mb-1 fs-6">
                                            {job.title || (job.lead?.client_name ? `Job for ${job.lead.client_name}` : 'Job Request')}
                                        </h6>
                                        <div className="d-flex flex-wrap align-items-center gap-2 text-muted mt-0.5" style={{ fontSize: '11px' }}>
                                            <span><i className="bi bi-person me-1"></i>{job.lead?.client_name || 'N/A'}</span>
                                            {job.lead?.job_address && (
                                                <span><i className="bi bi-geo-alt me-1"></i>{job.lead.job_address}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Job Number & Status Badge */}
                                    <div className="d-flex flex-column align-items-end gap-1 text-nowrap">
                                        <span className="fw-bold text-dark" style={{ fontSize: '13px', letterSpacing: '0.3px' }}>
                                            {job.job_number}
                                        </span>
                                        <span className="badge bg-light text-secondary border px-2 py-1 rounded-pill fw-bold text-uppercase" style={{ fontSize: '10px' }}>
                                            {job.work_status || 'PENDING'}
                                        </span>
                                    </div>
                                </div>

                                {/* Controlled Stepper */}
                                <div className="my-2 py-1 w-100">
                                    <div className="stepper-wrapper">
                                        {steps.map((step, index) => {
                                            const status = getStepStatus(job.checklist_data, step.cat);
                                            return (
                                                <div key={index} className={`step-item ${status}`}>
                                                    <div className="step-icon">
                                                        {status === 'completed' ? (
                                                            <i className="bi bi-check-lg"></i>
                                                        ) : (
                                                            <i className={`bi ${step.icon}`}></i>
                                                        )}
                                                    </div>
                                                    <div className="step-label">{step.label}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Divider */}
                                <hr className="my-1.5 border-light-subtle" />

                                {/* Bottom Progress & Action Bar */}
                                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-start align-items-sm-center gap-3 mt-2">
                                    {/* Progress Bar Container */}
                                    <div className="w-100 flex-grow-1 me-0 me-sm-2">
                                        <div className="d-flex justify-content-between align-items-center mb-1" style={{ fontSize: '11px' }}>
                                            <span className="text-muted fw-semibold">Overall Progress</span>
                                            <span className="fw-bold text-dark">{job.progress || 0}%</span>
                                        </div>
                                        <div className="progress" style={{ height: '6px', backgroundColor: '#f1f5f9', borderRadius: '10px' }}>
                                            <div 
                                                className="progress-bar" 
                                                style={{ 
                                                    width: `${job.progress || 0}%`, 
                                                    backgroundColor: '#34497e', 
                                                    borderRadius: '10px',
                                                    transition: 'width 0.3s ease'
                                                }}
                                            ></div>
                                        </div>
                                    </div>

                                    {/* Action Button */}
                                    <div className="w-100 w-sm-auto pt-1 pt-sm-0">
                                        <button 
                                            className="btn btn-primary btn-view-details px-3 text-nowrap d-inline-flex align-items-center justify-content-center shadow-sm w-100"
                                            onClick={() => setSelectedOrder(job)}
                                        >
                                            View Details
                                        </button>
                                    </div>
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