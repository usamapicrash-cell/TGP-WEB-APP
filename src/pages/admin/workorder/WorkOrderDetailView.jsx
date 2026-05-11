import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../api/axios'; // Apka axios instance
import DetailsTab from './tab/DetailsTab';
import ChatTab from './tab/ChatTab';
import MediaTab from './tab/MediaTab';
import PaymentsTab from './tab/PaymentsTab';
import POTab from './tab/POTab';
import SiteVisitsTab from './tab/SiteVisitsTab';
import ActivityTab from './tab/ActivityTab';
import History from '../lead/tab/History';


const WorkOrderDetailView = ({ order, onBack }) => {
    const [activeTab, setActiveTab] = useState('Details');
    const [fullOrderData, setFullOrderData] = useState(null);
    const [loading, setLoading] = useState(true);

    const tabs = ['Details', 'Chat', 'Media', 'Payments', 'POs', 'Site Visits', 'Internal Notes', 'History'];

    // --- Fetch Single Job Detail ---
    const fetchOrderDetail = useCallback(async () => {
        try {
            setLoading(true);
            // Assuming endpoint is /jobs/{id}
            const response = await api.get(`/jobs/${order.id}`);
            setFullOrderData(response.data);
        } catch (err) {
            console.error("Error fetching job details:", err);
        } finally {
            setLoading(false);
        }
    }, [order.id]);

    useEffect(() => {
        fetchOrderDetail();
    }, [fetchOrderDetail]);

    // Helper to render the correct component
    const renderTabContent = () => {
        // Jab tak data load ho raha ho ya na mile
        if (loading) return <div className="text-center p-5"><div className="spinner-border text-primary"></div></div>;
        if (!fullOrderData) return <div className="text-center p-5">No data found.</div>;
        const contractValue = fullOrderData.lead?.value || 0;

        // Common props jo har tab ko chahiye ho saktay hain
        const commonProps = { 
            leadId: fullOrderData.lead?.id, 
            lead: fullOrderData.lead,
            leadValue: contractValue,
            orderId: order.id,
            onUpdate: fetchOrderDetail // Taake koi bhi tab data refresh kar sakay
        };
        switch (activeTab) {
            case 'Details': return <DetailsTab order={fullOrderData} onUpdate={fetchOrderDetail} />;
            case 'Chat': return <ChatTab {...commonProps} />; // ChatTab ab fresh glazier dekhega
            case 'Media': return <MediaTab {...commonProps} />;
            case 'Payments': return <PaymentsTab {...commonProps} />;
            case 'POs': return <POTab {...commonProps} />;
            case 'Site Visits': return <SiteVisitsTab {...commonProps} />;
            case 'Internal Notes': return <ActivityTab {...commonProps} />;
            case 'History': return <History {...commonProps} />;
            default: return <DetailsTab order={fullOrderData} onUpdate={fetchOrderDetail} />;
        }
    };

    return (
        <div className="p-3">
            {/* Header */}
            <div className="d-flex align-items-center mb-3">
                <button className="btn btn-link text-dark p-0 me-3" onClick={onBack}>
                    <i className="bi bi-arrow-left fs-4"></i>
                </button>
                <div>
                    <h4 className="fw-bold mb-0">
                        {loading ? 'Loading...' : (fullOrderData?.title || fullOrderData?.lead?.client_name)}
                        <span className={`badge rounded-pill fw-normal ${
                            (fullOrderData?.work_status || order.status) === 'completed' ? 'bg-success-subtle text-success border border-success-subtle' :
                            (fullOrderData?.work_status || order.status) === 'in_progress' ? 'bg-primary-subtle text-primary border border-primary-subtle' :
                            'bg-warning-subtle text-warning border border-warning-subtle'
                        }`} style={{ fontSize: '0.8rem', letterSpacing: '0.5px', textTransform: 'uppercase', margin:'5px 17px' }}>
                            <i className="bi bi- circle-fill me-1" style={{ fontSize: '0.5rem' }}></i>
                            {fullOrderData?.work_status || order.status}
                        </span>
                    </h4>
                    <p className="text-muted small mb-0">
                        {fullOrderData?.lead?.job_address || 'Address N/A'} - ID: {fullOrderData?.job_number || order.id}
                    </p>
                </div>
                {/*<div className="ms-auto">
                    <button className="btn btn-outline-secondary btn-sm me-2">
                        <i className="bi bi-telephone"></i>
                    </button>
                    <button className="btn btn-outline-secondary btn-sm">
                        <i className="bi bi-envelope"></i>
                    </button>
                </div>*/}
            </div>

            {/* Pill Navigation */}
            <div 
                className="d-flex p-2 mb-4 align-items-center" 
                style={{ borderRadius: '12px', gap: '4px', backgroundColor: 'rgb(245, 247, 249)', overflowX: 'auto', whiteSpace: 'nowrap' }}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`btn border-0 py-2 px-3 small fw-semibold transition-all ${activeTab === tab ? 'shadow-sm' : 'text-muted'}`}
                        style={{
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            backgroundColor: activeTab === tab ? '#ffffff' : 'transparent',
                            color: activeTab === tab ? 'var(--primary-blue)' : '#6c757d',
                            minWidth: 'fit-content'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Render Component Dynamically */}
            <div className="tab-content-container">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default WorkOrderDetailView;