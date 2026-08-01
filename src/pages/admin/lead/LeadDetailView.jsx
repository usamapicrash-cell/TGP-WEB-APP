import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { notify } from '../../../utils/notifier';
import CreateGlazierModal from '../modal/CreateGlazierModal';
import ConvertToJobModal from '../modal/ConvertToJobModal';

// Tabs
import DetailsTab from './tab/DetailsTab';
import QuoteTab from './tab/QuoteTab';
import MediaTab from '../workorder/tab/MediaTab';
import PaymentsTab from '../workorder/tab/PaymentsTab';
import POTab from '../workorder/tab/POTab';
import Schedule from './tab/Schedule';
import ActivityTab from '../workorder/tab/ActivityTab';
import History from './tab/History';
import ChatTab from '../workorder/tab/ChatTab';
import OrderCommunication from '../OrderCommunication';

const LeadDetailView = ({ lead, onBack, onJobCreated }) => {
    const [activeTab, setActiveTab] = useState('Details');
    const [executives, setExecutives] = useState([]);
    
    // Local state for lead updates
    const [currentLead, setCurrentLead] = useState(lead);
    const [assignedId, setAssignedId] = useState(lead.gjob?.glazier_id || '');
    const [updating, setUpdating] = useState(false);
    
    const [showModal, setShowModal] = useState(false);
    const [showJobModal, setShowJobModal] = useState(false);

    const tabs = ['Details', 'Quote', 'Chat', 'Media', 'POs', 'Payments', 'Schedule', 'Internal Notes', 'History'];

    useEffect(() => {
        setCurrentLead(lead);
        setAssignedId(lead.gjob?.glazier_id || '');
    }, [lead]);

    const fetchGlaziers = () => {
        api.get('/users?role=glazier')
            .then(res => setExecutives(res.data))
            .catch(err => console.error("Error fetching glaziers", err));
    };

    useEffect(() => {
        fetchGlaziers();
    }, []);

    const handleAssign = async (e) => {
        const glazierId = e.target.value;
        setAssignedId(glazierId);
        setUpdating(true);

        try {
            await api.patch(`/leads/${currentLead.id}/assign`, { glazier_id: glazierId });
            
            setCurrentLead(prev => ({
                ...prev,
                gjob: {
                    ...prev.gjob,
                    glazier_id: glazierId,
                    glazier: executives.find(ex => ex.id == glazierId)
                }
            }));

            notify.success("Lead assigned successfully!");
        } catch (err) {
            console.error("Assignment Error:", err);
            notify.error("Assignment Failed");
            setAssignedId(currentLead.gjob?.glazier_id || '');
        } finally {
            setUpdating(false);
        }
    };

    const renderTabContent = () => {
        if (!currentLead) return null;

        const contractValue = currentLead.value || 0;
        const props = { 
            leadId: currentLead.id, 
            lead: currentLead, 
            leadValue: contractValue 
        };

        switch (activeTab) {
            case 'Details': return <DetailsTab {...props} />;
            case 'Quote': return <QuoteTab {...props} />;
            case 'Chat': return <ChatTab {...props} />;
            case 'Media': return <MediaTab {...props} />;
            case 'Payments': return <PaymentsTab {...props} />;
            case 'POs': return <POTab {...props} />;
            case 'Schedule': return <Schedule {...props} />;
            case 'Internal Notes': return <ActivityTab {...props} />;
            case 'History': return <History {...props} />;
            default: return <DetailsTab {...props} />;
        }
    };

    return (
        <div className="p-3 p-md-4">
            <style>
                {`
                    .custom-assign-select {
                        height: 38px !important;
                        font-size: 13px !important;
                        border-color: #cbd5e1 !important;
                        background-color: #ffffff !important;
                        border-radius: 8px !important;
                        padding-top: 4px;
                        padding-bottom: 4px;
                    }
                    .custom-assign-select:focus {
                        border-color: #34497e !important;
                        box-shadow: 0 0 0 0.2rem rgba(52, 73, 126, 0.15) !important;
                    }
                    .nav-pill-btn {
                        border-radius: 8px;
                        font-size: 0.85rem;
                        font-weight: 500;
                        color: #64748b;
                        transition: all 0.2s ease;
                        background: transparent;
                    }
                    .nav-pill-btn.active {
                        background-color: #ffffff !important;
                        color: #34497e !important;
                        box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
                        font-weight: 600;
                    }
                    .nav-pill-btn:hover:not(.active) {
                        color: #1e293b;
                        background-color: rgba(255,255,255,0.6);
                    }
                    .no-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .no-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                    .btn-convert-job {
                        background-color: #34497e !important;
                        border: none !important;
                        border-radius: 8px !important;
                        height: 38px !important;
                        font-size: 13px !important;
                        font-weight: 600 !important;
                    }
                    .btn-convert-job:hover {
                        background-color: #283863 !important;
                    }
                    .back-link {
                        color: #64748b;
                        font-size: 13px;
                        transition: color 0.15s ease;
                    }
                    .back-link:hover {
                        color: #1e293b;
                    }
                `}
            </style>
            
            {/* Clean & Compact Header Container */}
            <div className="mb-4">
                {/* Back Button */}
                <div className="mb-2">
                    <button 
                        className="btn btn-link text-decoration-none p-0 back-link fw-medium d-inline-flex align-items-center" 
                        onClick={onBack}
                    >
                        <i className="bi bi-arrow-left me-1"></i> Back to Leads
                    </button>
                </div>

                {/* Main Header Content */}
                <div className="d-flex flex-column flex-lg-row align-items-lg-center justify-content-between gap-3">
                    
                    {/* Left Side: Client Name + Status Badges & Sub-details */}
                    <div className="d-flex flex-column gap-1">
                        <div className="d-flex align-items-center flex-wrap gap-2">
                            <h2 className="fw-bold text-dark mb-0 fs-3">{currentLead.client_name}</h2>
                            
                            <span className="badge bg-emerald-100 text-emerald-800 bg-success-subtle text-success px-2.5 py-1 rounded-pill small fw-semibold">
                                {currentLead.status?.toUpperCase() || 'LEAD'}
                            </span>

                            {assignedId && (
                                <span className="badge bg-light text-secondary border px-2.5 py-1 rounded-pill small fw-normal d-inline-flex align-items-center">
                                    <i className="bi bi-person-fill me-1 text-primary"></i>
                                    {executives.find(e => e.id == assignedId)?.name || "Assigned"}
                                </span>
                            )}
                        </div>

                        {/* ID & Category */}
                        <div className="text-muted small d-flex align-items-center gap-2 mt-1">
                            <span className="fw-semibold text-dark">{currentLead.lead_number}</span>
                            <span>•</span>
                            <span className="text-uppercase tracking-wide">{currentLead.lead_type?.name || 'RESIDENTIAL'}</span>
                        </div>
                    </div>

                    {/* Right Side: Communication + Assign Dropdown + Action Button (Single Straight Line) */}
                    <div className="d-flex align-items-center flex-wrap gap-2 gap-sm-3 mt-1 mt-lg-0">
                        
                        {/* WhatsApp / Call Icons */}
                        {currentLead && (
                            <div className="d-flex align-items-center me-1">
                                <OrderCommunication 
                                    phoneNumber={currentLead?.phone} 
                                    clientName={currentLead?.client_name || 'Customer'} 
                                />
                            </div>
                        )}

                        {/* Compact Assign Box */}
                        <div className="d-flex align-items-center gap-2">
                            <span className="small fw-bold text-muted text-nowrap d-none d-sm-inline" style={{ fontSize: '11px', letterSpacing: '0.5px' }}>
                                ASSIGN TO:
                            </span>
                            <select 
                                className="form-select custom-assign-select shadow-none"
                                style={{ width: '160px' }}
                                value={assignedId}
                                onChange={handleAssign}
                                disabled={updating}
                            >
                                <option value="">Unassigned</option>
                                {executives.map(exec => (
                                    <option key={exec.id} value={exec.id}>{exec.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Convert Button */}
                        <button 
                            onClick={() => setShowJobModal(true)} 
                            className="btn btn-primary btn-convert-job px-3 shadow-sm text-nowrap d-inline-flex align-items-center justify-content-center" 
                        >
                            <i className="bi bi-briefcase me-2"></i> Convert to Job
                        </button>
                    </div>

                </div>
            </div>

            {/* Scrollable Navigation Tabs Bar */}
            <div className="d-flex p-1 mb-4 align-items-center  rounded-3" style={{ backgroundColor: 'rgb(245, 247, 249)' }}>
                <div className="d-flex align-items-center gap-1 overflow-x-auto no-scrollbar py-1 px-1 w-100">
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`btn border-0 py-2 px-3 nav-pill-btn text-nowrap ${activeTab === tab ? 'active' : ''}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* Active Tab Panel */}
            <div className="tab-content-container">
                {renderTabContent()}
            </div>

            {/* Modals */}
            <ConvertToJobModal 
                show={showJobModal}
                onClose={() => setShowJobModal(false)}
                lead={currentLead}
                onSuccess={onJobCreated}
            />

            <CreateGlazierModal 
                show={showModal} 
                onClose={() => setShowModal(false)} 
                onGlazierCreated={fetchGlaziers} 
            />
        </div>
    );
};

export default LeadDetailView;