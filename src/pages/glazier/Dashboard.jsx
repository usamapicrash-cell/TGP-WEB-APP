import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/axios'; 
import { notify } from '../../utils/notifier';
import { Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const GlazierDashboard = () => {
    const navigate = useNavigate(); // Add this
    const handleTabNavigation = (jobId, tabName) => {
        navigate(`/glazier/job-details/${jobId}`, { state: { activeTab: tabName } });
    };
    const handleSketchNavigation = (jobId) => {
        navigate(`/glazier/drawing/${jobId}`);
    };
    const [isActive, setIsActive] = useState(false);
    const [seconds, setSeconds] = useState(0);
    const [assignedJobs, setAssignedJobs] = useState([]);
    const [activeJob, setActiveJob] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const timerRef = useRef(null);
    const themeBlue = '#34497e';
    const themeRed = '#d30000';
    const themeGreen = '#007a21';

    const fetchGlazierJobs = async () => {
        try {
            const res = await api.post('/jobs/glazier');
            const jobs = res.data.jobs || [];
            setAssignedJobs(jobs);
            
            const ongoingJob = jobs.find(j => j.work_status === 'in_progress');
            
            if (ongoingJob && ongoingJob.clock_in_time) {
                const startTime = new Date(ongoingJob.clock_in_time).getTime();
                const now = Date.now();
                const diffInSecs = Math.floor((now - startTime) / 1000);
                
                setSeconds(diffInSecs > 0 ? diffInSecs : 0);
                setIsActive(true);
                setActiveJob(ongoingJob);
                startTimer();
            } else {
                setIsActive(false);
                setActiveJob(null);
                setSeconds(0);
                clearInterval(timerRef.current);
            }
        } catch (err) {
            notify.error("Failed to load glazier jobs");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateStatus = async (jobId, newStatus, newProgress) => {
        if (isProcessing) return;
        setIsProcessing(true);
        try {
            const response = await api.put(`/jobs/Markedcomplete/${jobId}`, {
                work_status: newStatus,
                progress: parseInt(newProgress)
            });

            if (response.data) {
                notify.success('Job Marked as Completed');
                // Dashboard refresh karein taake completed job queue se nikal jaye
                fetchGlazierJobs();
            }
        } catch (err) {
            console.error("Update failed:", err);
            notify.error('Failed to update status');
        } finally {
            setIsProcessing(false);
        }
    };
    useEffect(() => {
        fetchGlazierJobs();
        return () => clearInterval(timerRef.current);
    }, []);

    const startTimer = () => {
        clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setSeconds(prev => prev + 1);
        }, 1000);
    };

    const handleClockAction = (actionType, jobId = null) => {
        if (isProcessing) return;
        if (!navigator.geolocation) {
            notify.error("Geolocation not supported");
            return;
        }

        setIsProcessing(true); // Start Loader immediately

        const sendAttendanceRequest = async (lat, lng) => {
            const payload = {
                job_id: jobId || activeJob?.id,
                lat: lat,
                lng: lng,
                action: actionType
            };

            try {
                const res = await api.post('/glazier/attendance', payload);
                if (actionType === 'CLOCK_IN') {
                    setIsActive(true);
                    setActiveJob(res.data.job);
                    setSeconds(0);
                    startTimer();
                    notify.success("Job Started");
                } else {
                    setIsActive(false);
                    setActiveJob(null);
                    setSeconds(0);
                    clearInterval(timerRef.current);
                    notify.success("Job Stopped");
                    fetchGlazierJobs();
                }
            } catch (err) {
                notify.error(err.response?.data?.message || "Attendance Error");
            } finally {
                setIsProcessing(false); // Stop Loader
            }
        };

        navigator.geolocation.getCurrentPosition(
            (position) => {
                sendAttendanceRequest(position.coords.latitude, position.coords.longitude);
            },
            (error) => {
                setIsProcessing(false);
                if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
                    sendAttendanceRequest(31.5204, 74.3587); 
                } else {
                    notify.error("Please allow location access or check your GPS.");
                }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    const formatTime = (s) => {
        const h = Math.floor(s / 3600).toString().padStart(2, '0');
        const m = Math.floor((s % 3600) / 60).toString().padStart(2, '0');
        const sec = (s % 60).toString().padStart(2, '0');
        return `${h}:${m}:${sec}`;
    };

    if (loading) {
    return (
        <div className="container-fluid px-3 pb-5" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            {/* Header Skeleton */}
            <div className="pt-4 mb-3">
                <div className="skeleton-line" style={{ width: '120px', height: '30px', background: '#eee', borderRadius: '8px' }}></div>
            </div>

            {/* Timer Card Skeleton */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '20px' }}>
                <div className="card-body text-center py-4">
                    <div className="skeleton-line mx-auto mb-2" style={{ width: '100px', height: '15px', background: '#f0f0f0' }}></div>
                    <div className="skeleton-line mx-auto mb-3" style={{ width: '200px', height: '60px', background: '#eee', borderRadius: '12px' }}></div>
                    <div className="skeleton-line mx-auto" style={{ width: '90%', height: '45px', background: '#f0f0f0', borderRadius: '10px' }}></div>
                </div>
            </div>

            {/* Queue Title Skeleton */}
            <div className="mb-3 px-1">
                <div className="skeleton-line" style={{ width: '80px', height: '15px', background: '#eee' }}></div>
            </div>

            {/* 3 Step Job Queue Skeletons */}
            {[1, 2, 3].map((item) => (
                <div key={item} className="card border-0 shadow-sm mb-3" style={{ borderRadius: '20px', backgroundColor: '#ffffff', overflow: 'hidden' }}>
                    <div className="card-body p-4">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                            <div className="d-flex align-items-center">
                                <div className="skeleton-circle" style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#eee' }}></div>
                                <div className="ms-3">
                                    <div className="skeleton-line mb-1" style={{ width: '40px', height: '10px', background: '#f0f0f0' }}></div>
                                    <div className="skeleton-line" style={{ width: '80px', height: '15px', background: '#eee' }}></div>
                                </div>
                            </div>
                            <div className="skeleton-btn" style={{ width: '100px', height: '35px', borderRadius: '12px', background: '#f0f0f0' }}></div>
                        </div>
                        <div className="mb-3">
                            <div className="skeleton-line mb-2" style={{ width: '60%', height: '20px', background: '#eee' }}></div>
                            <div className="skeleton-line" style={{ width: '40%', height: '15px', background: '#f0f0f0' }}></div>
                        </div>
                        <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                            <div className="skeleton-line" style={{ width: '120px', height: '20px', background: '#f0f0f0' }}></div>
                            <div className="skeleton-line" style={{ width: '60px', height: '15px', background: '#f0f0f0' }}></div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

    return (
        <div className="container-fluid px-3 pb-5" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            
            <div className="d-flex justify-content-between align-items-center pt-4 mb-3">
                <h4 className="fw-bold m-0">Dashboard</h4>
            </div>

            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '20px' }}>
                <div className="card-body text-center py-4">
                    <p className="text-muted mb-1 small fw-bold text-uppercase">Shift Status: {isActive ? 'On Duty' : 'Off Duty'}</p>
                    <h1 className="fw-bold mb-3" style={{ fontSize: '3rem', letterSpacing: '1px' }}>{formatTime(seconds)}</h1>
                    
                    <div className="px-3">
                        {isActive ? (
                            <div className="d-flex gap-2">
                                <button className="btn w-100 py-2 fw-bold text-white shadow-sm" 
                                    disabled={isProcessing}
                                    onClick={() => handleClockAction('CLOCK_OUT')}
                                    style={{ backgroundColor: themeRed, borderRadius: '10px' }}>
                                    {isProcessing ? <Spinner size="sm" className="me-1" /> : '■ CLOCK OUT'}
                                </button>
                            </div>
                        ) : (
                            <button className="btn w-100 py-2 fw-bold text-white shadow-sm" 
                                disabled={isProcessing || assignedJobs.length === 0}
                                onClick={() => handleClockAction('CLOCK_IN', assignedJobs[0]?.id)}
                                style={{ backgroundColor: themeBlue, borderRadius: '10px' }}>
                                {isProcessing ? <Spinner size="sm" className="me-1" /> : '▶ CLOCK IN'}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            <div className="mb-4">
                {isActive && activeJob ? (
                    <div className="card border-0 shadow-sm p-2" style={{ borderRadius: '20px' }}>
                        <div className="card-body">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <span className="text-primary fw-bold small">Active Task</span>
                                <span className="text-muted small">ID: {activeJob.job_number}</span>
                            </div>
                            <h5 className="fw-bold mb-1">{activeJob.title}</h5>
                            <p className="text-muted small mb-3"><i className="bi bi-person me-1"></i> {activeJob.lead?.client_name || 'Assigned Client'}</p>
                            
                            <div className="bg-light p-3 rounded-3 mb-3 d-flex align-items-start">
                                <i className="bi bi-geo-alt-fill text-muted me-2 mt-1"></i>
                                <div>
                                    <small className="d-block fw-bold text-dark">{activeJob.lead?.address || '123 Main Street, Downtown'}</small>
                                    <small className="text-primary cursor-pointer">Open in Maps</small>
                                </div>
                            </div>

                            <div className="d-flex justify-content-between gap-2 mb-3">
                                <button 
                                    className="btn flex-fill py-2 border-0 shadow-sm d-flex align-items-center justify-content-center gap-2" 
                                    onClick={() => handleTabNavigation(activeJob.id, 'Chat')}
                                    style={{ backgroundColor: 'rgb(240 244 248)', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', color: themeBlue, lineHeight: 2 }}
                                >
                                    <i className="bi bi-chat-text fs-6"></i> CHAT
                                </button>
                                
                                <button 
                                    className="btn flex-fill py-2 border-0 shadow-sm d-flex align-items-center justify-content-center gap-2" 
                                    onClick={() => handleSketchNavigation(activeJob.id)}
                                    style={{ backgroundColor: 'rgb(240 244 248)', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', color: themeBlue, lineHeight: 2 }}
                                >
                                    <i className="bi bi-pencil-square fs-6"></i> SKETCH
                                </button>
                                
                                <button 
                                    className="btn flex-fill py-2 border-0 shadow-sm d-flex align-items-center justify-content-center gap-2" 
                                    onClick={() => handleTabNavigation(activeJob.id, 'Media')}
                                    style={{ backgroundColor: 'rgb(240 244 248)', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', color: themeBlue, lineHeight: 2 }}
                                >
                                    <i className="bi bi-camera fs-6"></i> PHOTOS
                                </button>
                            </div>

                            <button className="btn w-100 py-3 fw-bold text-white shadow-sm" 
                                disabled={isProcessing}
                                onClick={() => handleUpdateStatus(activeJob.id, 'completed', 100)}
                                style={{ backgroundColor: themeGreen, borderRadius: '10px' }}>
                                {isProcessing ? <Spinner size="sm" className="me-1" /> : 'MARK AS COMPLETED'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="card border-0 shadow-sm py-5 text-center" style={{ borderRadius: '20px', minHeight: '250px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                        <div className="bg-light rounded-circle mb-3 d-flex align-items-center justify-content-center" style={{ width: '60px', height: '60px', margin: '0 auto' }}>
                            <i className="bi bi-briefcase text-muted fs-3"></i>
                        </div>
                        <h6 className="fw-bold text-uppercase mb-2">No Active Task</h6>
                        <p className="text-muted small px-4">Select a job from your queue below to begin working and tracking time.</p>
                        {assignedJobs.length > 0 && !isActive && (
                            <button className="btn text-white fw-bold px-4 py-2 mt-2 shadow-sm" 
                                disabled={isProcessing}
                                onClick={() => handleClockAction('CLOCK_IN', assignedJobs[0].id)}
                                style={{ backgroundColor: themeBlue, borderRadius: '8px' }}>
                                {isProcessing ? <Spinner size="sm" className="me-1" /> : `START ${assignedJobs[0].job_number}`}
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="d-flex justify-content-between align-items-center mb-3 px-1">
                <h6 className="fw-bold text-uppercase m-0" style={{ color: themeBlue, fontSize: '0.75rem' }}>
                    Job Queue <span className="text-muted fw-normal ms-2"> {assignedJobs.length}</span>
                </h6>
                <i className="bi bi-arrow-clockwise text-primary cursor-pointer" onClick={fetchGlazierJobs}></i>
            </div>

            {assignedJobs.map(job => (
                <div key={job.id} className="card border-0 shadow-sm mb-3" style={{ borderRadius: '20px', backgroundColor: '#ffffff' }}>
                    <div className="card-body p-4">
                        {/* Header: Status and Action */}
                        <div className="d-flex justify-content-between align-items-start mb-3">
                            <div className="d-flex align-items-center">
                                <div className="rounded-circle d-flex align-items-center justify-content-center shadow-sm" 
                                     style={{ width: '40px', height: '40px', backgroundColor: '#f0f4f8', color: themeBlue }}>
                                    <i className="bi bi-hash fs-5"></i>
                                </div>
                                <div className="ms-3">
                                    <span className="text-uppercase fw-bold text-muted-50" style={{ fontSize: '0.65rem', letterSpacing: '1px' }}>Job ID</span>
                                    <h6 className="fw-bold m-0" style={{ color: '#2d3436' }}>{job.job_number}</h6>
                                </div>
                            </div>
                            {!isActive && (
                                <button className="btn fw-bold text-white px-4 py-2" 
                                    disabled={isProcessing}
                                    onClick={() => handleClockAction('CLOCK_IN', job.id)}
                                    style={{ 
                                        backgroundColor: themeBlue, 
                                        borderRadius: '12px', 
                                        fontSize: '0.75rem',
                                        boxShadow: '0 4px 12px rgba(52, 73, 126, 0.2)'
                                    }}>
                                    {isProcessing ? <Spinner size="sm" /> : 'START NOW'}
                                </button>
                            )}
                        </div>

                        {/* Content Section */}
                        <div className="mb-3">
                            <h5 className="fw-bold mb-1" style={{ color: '#2d3436', fontSize: '1.1rem' }}>{job.title}</h5>
                            <div className="d-flex align-items-center text-muted">
                                <i className="bi bi-person-circle me-2" style={{ fontSize: '0.85rem' }}></i>
                                <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>{job.lead?.client_name || 'Walk-in Client'}</span>
                            </div>
                        </div>

                        {job.description && (
                            <div className="p-3 bg-light rounded-3 mb-3" style={{ borderLeft: `4px solid ${themeBlue}` }}>
                                <p className="text-muted mb-0 small" style={{ lineHeight: '1.5', fontStyle: 'italic' }}>
                                    {job.description}
                                </p>
                            </div>
                        )}

                        {/* Footer Section */}
                        <div className="pt-3 border-top d-flex justify-content-between align-items-center">
                            <div className="d-flex align-items-center gap-3">
                                <div className="d-flex align-items-center bg-light px-2 py-1 rounded-2">
                                    <i className="bi bi-calendar-event text-primary me-2" style={{ fontSize: '0.75rem' }}></i>
                                    <span className="fw-bold" style={{ fontSize: '0.7rem', color: '#636e72' }}>
                                        {job.start_date ? new Date(job.start_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A'}
                                    </span>
                                </div>
                                <i className="bi bi-arrow-right text-muted" style={{ fontSize: '0.8rem' }}></i>
                                <div className="d-flex align-items-center bg-light px-2 py-1 rounded-2">
                                    <span className="fw-bold" style={{ fontSize: '0.7rem', color: '#636e72' }}>
                                        {job.end_date ? new Date(job.end_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : 'N/A'}
                                    </span>
                                </div>
                            </div>
                            <div className="text-primary cursor-pointer d-flex align-items-center gap-1" onClick={() => navigate(`/glazier/job-details/${job.id}`)}>
                                <span className="fw-bold" style={{ fontSize: '0.7rem' }}>DETAILS</span>
                                <i className="bi bi-chevron-right small"></i>
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default GlazierDashboard;