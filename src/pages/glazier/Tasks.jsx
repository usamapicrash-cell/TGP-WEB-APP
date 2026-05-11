import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { notify } from '../../utils/notifier';
import { Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const GlazierTasks = () => {
    const navigate = useNavigate(); // Add this
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);

    const themeBlue = '#34497e';
    const themeGreen = '#007a21';

    const fetchAllJobs = async () => {
        try {
            const res = await api.post('/jobs/glazier/all');
            setJobs(res.data.jobs || []);
        } catch (err) {
            notify.error("Failed to load tasks");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllJobs();
    }, []);

    if (loading) {
        return (
            <div className="container-fluid px-3 pb-5" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
                <div className="pt-4 mb-4">
                    <div className="skeleton-line" style={{ width: '150px', height: '28px', background: '#eee', borderRadius: '8px' }}></div>
                </div>
                {[1, 2, 3].map(i => (
                    <div key={i} className="card border-0 shadow-sm mb-3" style={{ borderRadius: '20px' }}>
                        <div className="card-body p-4">
                            <div className="skeleton-line mb-3" style={{ width: '40%', height: '20px', background: '#eee' }}></div>
                            <div className="skeleton-line mb-2" style={{ width: '70%', height: '25px', background: '#f0f0f0' }}></div>
                            <div className="skeleton-line" style={{ width: '100%', height: '8px', background: '#eee', borderRadius: '10px' }}></div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="container-fluid px-3 pb-5" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <div className="pt-4 mb-4 px-1">
                <h4 className="fw-bold m-0">Assigned Jobs</h4>
                <p className="text-muted small">Monitor all active jobs and their progress</p>
            </div>

            {jobs.length > 0 ? (
                jobs.map((job) => (
                    <div key={job.id} className="card border-0 shadow-sm mb-3" style={{ borderRadius: '20px', backgroundColor: '#ffffff' }}>
                        <div className="card-body p-4">
                            {/* Header Section */}
                            <div className="d-flex justify-content-between align-items-start mb-3">
                                <div className="d-flex align-items-center">
                                    <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm" 
                                         style={{ width: '40px', height: '40px', backgroundColor: '#f0f4f8', color: themeBlue }}>
                                        <i className="bi bi-hash fs-5"></i>
                                    </div>
                                    <div className="ms-3">
                                        {/*<span className="text-uppercase fw-bold text-muted" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Job ID</span>*/}
                                        <h6 className="fw-bold m-0" style={{ color: '#2d3436' }}>{job.job_number || `JB-${job.id}`}</h6>
                                    </div>
                                </div>
                                <span className="badge rounded-pill px-3 py-2" 
                                      style={{ 
                                          backgroundColor: job.work_status === 'completed' ? '#e8f5e9' : '#e3f2fd', 
                                          color: job.work_status === 'completed' ? themeGreen : themeBlue,
                                          fontSize: '0.65rem'
                                      }}>
                                    {job.work_status === 'completed' ? 'COMPLETED' : 'IN PROGRESS'}
                                </span>
                            </div>

                            {/* Content Section */}
                            <div className="mb-3">
                                <h5 className="fw-bold mb-1" style={{ color: '#2d3436', fontSize: '1.1rem' }}>{job.title}</h5>
                                <div className="d-flex align-items-center text-muted">
                                    <i className="bi bi-geo-alt me-2" style={{ fontSize: '0.85rem' }}></i>
                                    <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{job.lead?.address || '123 Main Street, Downtown'}</span>
                                </div>
                            </div>

                            {/* Progress Section */}
                            <div className="mb-4">
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                    <span className="text-muted fw-bold" style={{ fontSize: '0.65rem' }}>JOB COMPLETION</span>
                                    <span className="fw-bold" style={{ fontSize: '0.75rem', color: themeBlue }}>{job.progress + '%'}</span>
                                </div>
                                <div className="progress" style={{ height: '8px', borderRadius: '10px', backgroundColor: '#f0f0f0' }}>
                                    <div className="progress-bar progress-bar-animated" 
                                         role="progressbar" 
                                         style={{ 
                                             width: job.progress + '%', 
                                             backgroundColor: job.work_status === 'completed' ? themeGreen : themeBlue,
                                             borderRadius: '10px'
                                         }}>
                                    </div>
                                </div>
                            </div>

                            {/* Footer Section */}
                            <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="d-flex align-items-center bg-light px-2 py-1 rounded-2">
                                        <i className="bi bi-calendar-check text-primary me-2" style={{ fontSize: '0.75rem' }}></i>
                                        <span className="fw-bold" style={{ fontSize: '0.7rem', color: '#636e72' }}>
                                            {job.end_date ? new Date(job.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'Pending'}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-primary cursor-pointer d-flex align-items-center gap-1" onClick={() => navigate(`/glazier/job-details/${job.id}`)}>
                                    <span className="fw-bold" style={{ fontSize: '0.7rem' }}>VIEW DETAILS</span>
                                    <i className="bi bi-chevron-right small"></i>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            ) : (
                <div className="card border-0 shadow-sm py-5 text-center" style={{ borderRadius: '20px' }}>
                    <i className="bi bi-clipboard-x fs-1 text-muted"></i>
                    <p className="mt-2 text-muted">No jobs assigned yet.</p>
                </div>
            )}
        </div>
    );
};

export default GlazierTasks;