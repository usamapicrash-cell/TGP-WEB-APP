import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import api from '../../api/axios';
import { notify } from '../../utils/notifier';
import { Spinner } from 'react-bootstrap';

// Tabs Components (Make sure to import your existing tab components)
import DetailsTab from './tab/DetailsTab';
import ChatTab from './tab/ChatTab';
import MediaTab from './tab/MediaTab';
import PaymentsTab from './tab/PaymentsTab';
import POTab from './tab/POTab';
import SiteVisitsTab from './tab/SiteVisitsTab';
import ActivityTab from './tab/ActivityTab';
import History from './tab/History';

const JobDetails = () => {
    const location = useLocation();
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'Details');
    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state]);

    const { id } = useParams();
    const navigate = useNavigate();
    const [job, setJob] = useState(null);
    const [loading, setLoading] = useState(true);

    const tabs = ['Details', 'Chat', 'Media', 'Payments', 'POs', 'Site Visits', 'Internal Notes', 'History'];

    const fetchJobDetails = useCallback(async () => {
        try {
            setLoading(true);
            const res = await api.get(`/jobs/${id}`);
            // API response logic adjust karein: res.data.job ya res.data
            setJob(res.data.job || res.data);
        } catch (err) {
            notify.error("Could not load job details");
            console.error("Error fetching job details:", err);
        } finally {
            setLoading(false);
        }
    }, [id]);

    useEffect(() => {
        fetchJobDetails();
    }, [fetchJobDetails]);

    const renderTabContent = () => {
        if (loading) return (
            <div className="text-center p-5">
                <Spinner animation="border" style={{ color: '#34497e' }} />
            </div>
        );
        if (!job) return <div className="text-center p-5">No data found.</div>;

        const commonProps = {
            leadId: job.lead?.id,
            lead: job.lead,
            leadValue: job.lead?.value || 0,
            orderId: id,
            onUpdate: fetchJobDetails
        };

        switch (activeTab) {
            case 'Details': return <DetailsTab order={job} onUpdate={fetchJobDetails} />;
            case 'Chat': return <ChatTab job={job} onUpdate={fetchJobDetails} />;
            case 'Media': return <MediaTab {...commonProps} />;
            case 'Payments': return <PaymentsTab {...commonProps} />;
            case 'POs': return <POTab {...commonProps} />;
            case 'Site Visits': return <SiteVisitsTab {...commonProps} />;
            case 'Internal Notes': return <ActivityTab {...commonProps} />;
            case 'History': return <History {...commonProps} />;
            default: return <DetailsTab order={job} onUpdate={fetchJobDetails} />;
        }
    };

    return (
        <div className="p-3" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            {/* --- Header Section --- */}
            <div className="d-flex align-items-center mb-3">
                <button className="btn btn-link text-dark p-0 me-3" onClick={() => navigate(-1)}>
                    <i className="bi bi-arrow-left fs-4"></i>
                </button>
                <div>
                    <h4 className="fw-bold mb-0">
                        {loading ? 'Loading...' : (job?.title || job?.lead?.client_name || 'Job Details')}
                        {/*{!loading && job && (
                            <span className={`badge rounded-pill fw-normal ${
                                job.work_status === 'completed' ? 'bg-success-subtle text-success border border-success-subtle' :
                                job.work_status === 'in_progress' ? 'bg-primary-subtle text-primary border border-primary-subtle' :
                                'bg-warning-subtle text-warning border border-warning-subtle'
                            }`} style={{ fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase', marginLeft: '12px' }}>
                                <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.4rem' }}></i>
                                {job.work_status}
                            </span>
                        )}*/}
                    </h4>
                    <p className="text-muted small mb-0">
                        {job?.lead?.address || job?.lead?.job_address || 'Address N/A'} • {job?.job_number || id}
                    </p>
                </div>
            </div>

            {/* --- Pill Navigation --- */}
            <div 
                className="d-flex p-2 mb-4 align-items-center" 
                style={{ 
                    borderRadius: '12px', 
                    gap: '4px', 
                    backgroundColor: 'rgb(245, 247, 249)', 
                    overflowX: 'auto', 
                    whiteSpace: 'nowrap',
                    scrollbarWidth: 'none' // For Firefox
                }}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`btn border-0 py-2 px-3 fw-semibold transition-all ${activeTab === tab ? 'shadow-sm text-primary' : 'text-muted'}`}
                        style={{
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            backgroundColor: activeTab === tab ? '#ffffff' : 'transparent',
                            minWidth: 'fit-content'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* --- Dynamic Tab Content --- */}
            <div className="tab-content-container">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default JobDetails;