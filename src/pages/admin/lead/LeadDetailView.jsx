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

const LeadDetailView = ({ lead, onBack, onJobCreated }) => {
    const [activeTab, setActiveTab] = useState('Details');
    const [executives, setExecutives] = useState([]);
    
    // 1. Local state for lead taaki update hone par pure tabs refresh hon
    const [currentLead, setCurrentLead] = useState(lead);
    const [assignedId, setAssignedId] = useState(lead.gjob?.glazier_id || '');
    const [updating, setUpdating] = useState(false);
    
    const [showModal, setShowModal] = useState(false);
    const [showJobModal, setShowJobModal] = useState(false);

    const tabs = ['Details', 'Quote', 'Chat', 'Media', 'Payments', 'POs', 'Schedule', 'Internal Notes', 'History'];

    // Update local state if prop changes
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
            const res = await api.patch(`/leads/${currentLead.id}/assign`, { glazier_id: glazierId });
            
            // 2. CRITICAL: Update local lead state with new glazier info
            // Is se ChatTab aur baqi components ko fresh data milega
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
            setAssignedId(currentLead.gjob?.glazier_id || ''); // Revert UI
        } finally {
            setUpdating(false);
        }
    };

    const renderTabContent = () => {
        if (!currentLead) return null;

        const contractValue = currentLead.value || 0;
        const props = { 
            leadId: currentLead.id, 
            lead: currentLead, // Fresh updated lead pass ho rahi hai
            leadValue: contractValue 
        };

        switch (activeTab) {
            case 'Details': return <DetailsTab {...props} />;
            case 'Quote': return <QuoteTab {...props} />;
            case 'Chat': return <ChatTab {...props} />; // ChatTab ab fresh glazier dekhega
            case 'Media': return <MediaTab {...props} />;
            case 'Payments': return <PaymentsTab {...props} />;
            case 'POs': return <POTab {...props} />;
            case 'Schedule': return <Schedule {...props} />;
            case 'Internal Notes': return <ActivityTab {...props} />;
            case 'History': return <History {...props} />;
            default: return <DetailsTab {...props} />;
        }
    };

    // ... handleJobCreated logic (same as yours)

    return (
        <div className="p-3">
            <style>
                {`
                    .custom-assign-select {
                        width: 180px !important;
                        height: 40px !important;
                        padding: 5px !important;
                        border-radius: 8px !important;
                    }
                    .transition-all { transition: all 0.2s ease-in-out; }
                `}
            </style>
            
            <div className="d-flex justify-content-between align-items-start mb-4">
               <div>
                    <button className="btn btn-link text-decoration-none p-0 mb-2 text-muted small" onClick={onBack}>
                        <i className="bi bi-arrow-left me-1"></i> Back to Leads
                    </button>
                    
                    <div className="d-flex align-items-center gap-3">
                        <h4 className="fw-bold mb-0">{currentLead.client_name}</h4>
                        
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

                <div className="d-flex gap-2">
                    <div className="me-2">
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
                    <button onClick={() => setShowJobModal(true)} className="btn btn-primary px-4 align-self-end shadow-none" style={{ backgroundColor: '#34497e', border: 'none', borderRadius: '8px', height: '38px' }}>
                        Convert to Job
                    </button>
                </div>
            </div>

            {/* Pill Navigation */}
            <div className="d-flex p-2 mb-4 align-items-center" style={{ borderRadius: '12px', gap: '4px', backgroundColor: 'rgb(245, 247, 249)', overflowX: 'auto' }}>
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

            <div className="tab-content-container">
                {renderTabContent()}
            </div>

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