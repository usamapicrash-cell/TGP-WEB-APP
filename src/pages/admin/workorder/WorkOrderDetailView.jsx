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
import OrderCommunication from '../OrderCommunication'; // New Separate Component

const WorkOrderDetailView = ({ order, onBack }) => {
    const [activeTab, setActiveTab] = useState('Details');
    const [fullOrderData, setFullOrderData] = useState(null);
    const [loading, setLoading] = useState(true);

    const tabs = ['Details', 'Chat', 'Media', 'POs', 'Payments', 'Site Visits', 'Internal Notes', 'History'];

    // --- Fetch Single Job Detail ---
    const fetchOrderDetail = useCallback(async () => {
        try {
            setLoading(true);
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

    const renderTabContent = () => {
        if (loading) return <div className="text-center p-5"><div className="spinner-border text-primary"></div></div>;
        if (!fullOrderData) return <div className="text-center p-5">No data found.</div>;
        const contractValue = fullOrderData.lead?.value || 0;

        const commonProps = { 
            leadId: fullOrderData.lead?.id, 
            lead: fullOrderData.lead,
            leadValue: contractValue,
            orderId: order.id,
            onUpdate: fetchOrderDetail 
        };

        switch (activeTab) {
            case 'Details': return <DetailsTab order={fullOrderData} onUpdate={fetchOrderDetail} />;
            case 'Chat': return <ChatTab {...commonProps} />;
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
        <div className="p-2 p-md-3">
            {/* Header: Flex wrapper for mobile stacking */}
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-3">
                
                {/* Left: Back Button & Title */}
                <div className="d-flex align-items-start align-items-sm-center">
                    <button className="btn btn-link text-dark p-0 me-3 mt-1 mt-sm-0" onClick={onBack}>
                        <i className="bi bi-arrow-left fs-4"></i>
                    </button>
                    <div>
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            <h4 className="fw-bold mb-0 text-break">
                                {loading ? 'Loading...' : (fullOrderData?.title || fullOrderData?.lead?.client_name)}
                            </h4>
                            <span className={`badge rounded-pill fw-normal ${
                                (fullOrderData?.work_status || order.status) === 'completed' ? 'bg-success-subtle text-success border border-success-subtle' :
                                (fullOrderData?.work_status || order.status) === 'in_progress' ? 'bg-primary-subtle text-primary border border-primary-subtle' :
                                'bg-warning-subtle text-warning border border-warning-subtle'
                            }`} style={{ fontSize: '0.75rem', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                <i className="bi bi-circle-fill me-1" style={{ fontSize: '0.45rem' }}></i>
                                {fullOrderData?.work_status || order.status}
                            </span>
                        </div>
                        <p className="text-muted small mb-0 mt-1 text-break">
                            {fullOrderData?.lead?.job_address || 'Address N/A'} - ID: {fullOrderData?.job_number || order.id}
                        </p>
                    </div>
                </div>

                {/* Right: Smart Communication Icons */}
                {!loading && fullOrderData && (
                    <div className="ms-auto ms-sm-0 align-self-end align-self-sm-center">
                        <OrderCommunication 
                            phoneNumber={fullOrderData?.lead?.phone} 
                            clientName={fullOrderData?.lead?.client_name || 'Customer'} 
                        />
                    </div>
                )}
            </div>

            {/* Pill Navigation (Scrollable horizontally without ugly scrollbars) */}
            <div 
                className="d-flex p-1 p-md-2 mb-4 align-items-center hide-scrollbar" 
                style={{ 
                    borderRadius: '12px', 
                    gap: '4px', 
                    backgroundColor: 'rgb(245, 247, 249)', 
                    overflowX: 'auto', 
                    whiteSpace: 'nowrap',
                    scrollbarWidth: 'none', /* Firefox */
                    msOverflowStyle: 'none'  /* IE/Edge */
                }}
            >
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`btn border-0 py-2 px-3 small fw-semibold ${activeTab === tab ? 'shadow-sm' : 'text-muted'}`}
                        style={{
                            borderRadius: '8px',
                            fontSize: '0.85rem',
                            backgroundColor: activeTab === tab ? '#ffffff' : 'transparent',
                            color: activeTab === tab ? 'var(--primary-blue, #0d6efd)' : '#6c757d',
                            minWidth: 'fit-content',
                            transition: 'all 0.2s ease-in-out'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Dynamic Content */}
            <div className="tab-content-container">
                {renderTabContent()}
            </div>
        </div>
    );
};

export default WorkOrderDetailView;