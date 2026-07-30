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

    const tabs = ['Details', 'Quote', 'Chat', 'Media', 'Payments', 'POs', 'Schedule', 'Internal Notes', 'History'];

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
        <div className="p-2 p-md-3">
            <style>
                {`
                    .custom-assign-select {
                        width: 100% !important;
                        height: 40px !important;
                        padding: 5px !important;
                        border-radius: 8px !important;
                    }
                    @media (min-width: 576px) {
                        .custom-assign-select {
                            width: 180px !important;
                        }
                    }
                    .transition-all { transition: all 0.2s ease-in-out; }
                    
                    /* Custom Scrollbar for Pill Tabs on mobile */
                    .no-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .no-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}
            </style>
            
            {/* Header Section */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
                <div>
                    <button className="btn btn-link text-decoration-none p-0 mb-2 text-muted small" onClick={onBack}>
                        <i className="bi bi-arrow-left me-1"></i> Back to Leads
                    </button>
                    
                    <div className="d-flex flex-wrap align-items-center gap-2 gap-sm-3">
                        <h4 className="fw-bold mb-0 text-break">{currentLead.client_name}</h4>
                        
                        {assignedId && (
                            <span className="badge bg-info-subtle text-info border-info-subtle px-3 rounded-pill" style={{ fontSize: '0.85rem' }}>
                                <i className="bi bi-person me-1"></i>
                                {executives.find(e => e.id == assignedId)?.name || "Assigned"}
                            </span>
                        )}

                        <span className={`badge rounded-pill ${currentLead.status === 'quote' ? 'bg-primary-subtle text-primary' : 'bg-success-subtle text-success'} px-3`}>
                            {currentLead.status?.toUpperCase()}
                        </span>
                    </div>

                    <p className="text-muted small mb-0 mt-1">
                        <span className="fw-bold text-dark">{currentLead.lead_number}</span> • {currentLead.lead_type?.name || 'General Project'}
                    </p>
                </div>

                {/* Actions Section */}
                <div className="d-flex flex-column flex-sm-row w-100 w-md-auto align-items-stretch align-items-sm-end gap-2">
                    <div className="flex-fill">
                        <label className="small fw-bold text-muted d-block mb-1 text-uppercase" style={{ fontSize: '10px' }}>Assign To</label>
                        <select 
                            className="form-control custom-assign-select"
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
                    <button 
                        onClick={() => setShowJobModal(true)} 
                        className="btn btn-primary px-4 shadow-none text-nowrap mt-2 mt-sm-0" 
                        style={{ backgroundColor: '#34497e', border: 'none', borderRadius: '8px', height: '40px' }}
                    >
                        Convert to Job
                    </button>
                </div>
            </div>

            {/* Pill Navigation Bar */}
            <div className="d-flex p-2 mb-4 align-items-center justify-content-between flex-nowrap overflow-x-auto no-scrollbar" style={{ borderRadius: '12px', gap: '6px', backgroundColor: 'rgb(245, 247, 249)' }}>
                <div className="d-flex align-items-center" style={{ gap: '4px' }}>
                    {tabs.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`btn border-0 py-2 px-3 small fw-semibold transition-all ${activeTab === tab ? 'shadow-sm bg-white text-primary' : 'text-muted'}`}
                            style={{ borderRadius: '8px', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Communication Tool Options */}
                {currentLead && (
                    <div className="ms-2 flex-shrink-0">
                        <OrderCommunication 
                            phoneNumber={currentLead?.phone} 
                            clientName={currentLead?.client_name || 'Customer'} 
                        />
                    </div>
                )}
            </div>

            {/* Render Tab Data */}
            <div className="tab-content-container">
                {renderTabContent()}
            </div>

            {/* Modal Dialogs */}
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