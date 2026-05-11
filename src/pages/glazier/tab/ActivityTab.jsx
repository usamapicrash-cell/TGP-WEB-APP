import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import { notify } from '../../../utils/notifier';
import StatusHandler from '../../../components/StatusHandler';
import moment from 'moment';

const ActivityTab = ({ leadId }) => {
    const [noteText, setNoteText] = useState("");
    const [selectedType, setSelectedType] = useState("General");
    const [activityLogs, setActivityLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const noteTypes = [
        { label: "General", icon: "bi-chat-left-text" },
        { label: "Measurement", icon: "bi-rulers" },
        { label: "Issue", icon: "bi-exclamation-triangle" },
        { label: "Follow-up", icon: "bi-telephone-outbound" }
    ];

    const fetchLogs = async () => {
        try {
            const res = await api.get(`/leads/${leadId}/activities`);
            setActivityLogs(res.data);
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (leadId) fetchLogs();
    }, [leadId]);

    const handleAddNote = async () => {
        if (!noteText.trim()) return;
        setSaving(true);
        try {
            await api.post(`/leads/${leadId}/activities`, {
                content: noteText,
                type: selectedType
            });
            setNoteText("");
            notify.success("Note added!");
            fetchLogs();
        } catch (err) {
            notify.error("Failed to add note");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="animate__animated animate__fadeIn p-1">
            {/* Input Section - Refined Card */}
            <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '16px', overflow: 'hidden' }}>
                <div className="card-body p-3">
                    <div className="d-flex align-items-center gap-2 mb-3">
                        <h6 className="fw-bold mb-0" style={{ color: '#2b3a67' }}>Internal Notes</h6>
                    </div>

                    <textarea 
                        className="form-control border-0 bg-light p-3 mb-3 shadow-none" 
                        rows="3"
                        placeholder="Type a new observation here..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        style={{ borderRadius: '12px', fontSize: '0.9rem' }}
                    ></textarea>

                    <div className="d-flex flex-column gap-3">
                        {/* Type Selection - Scrollable on mobile */}
                        <div className="d-flex gap-2 overflow-auto pb-2 custom-scrollbar">
                            {noteTypes.map((t) => (
                                <button
                                    key={t.label}
                                    onClick={() => setSelectedType(t.label)}
                                    className={`btn btn-sm px-3 py-2 rounded-pill border-0 d-flex align-items-center gap-2 transition-all ${
                                        selectedType === t.label 
                                        ? 'bg-primary text-white shadow-sm' 
                                        : 'bg-light text-muted'
                                    }`}
                                    style={{ fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                                >
                                    <i className={`bi ${t.icon}`}></i>
                                    {t.label}
                                </button>
                            ))}
                        </div>

                        <button 
                            className="btn btn-primary w-100 py-2 fw-bold shadow-sm"
                            onClick={handleAddNote}
                            disabled={saving || !noteText.trim()}
                            style={{ backgroundColor: '#2b3a67', borderRadius: '10px', border: 'none' }}
                        >
                            {saving ? (
                                <span className="spinner-border spinner-border-sm me-2"></span>
                            ) : (
                                <i className="bi bi-plus-lg me-2"></i>
                            )}
                            Post Note
                        </button>
                    </div>
                </div>
            </div>

            <h6 className="fw-bold mb-3 px-1" style={{ color: '#2b3a67' }}>Activity Timeline</h6>

            <StatusHandler loading={loading} error={error} data={activityLogs} loadingText="Loading History">
                <div className="position-relative ps-3">
                    {/* Timeline Vertical Line */}
                    <div className="position-absolute h-100 border-start border-2 opacity-10" style={{ left: '11px', top: '5px', zIndex: 0 }}></div>

                    {activityLogs.length === 0 ? (
                        <div className="text-center py-4 bg-light rounded-4 border border-dashed">
                            <i className="bi bi-journal-x fs-2 text-muted opacity-50"></i>
                            <p className="text-muted small mt-2">No activities logged yet.</p>
                        </div>
                    ) : (
                        activityLogs.map((log) => (
                            <div key={log.id} className="mb-4 position-relative" style={{ zIndex: 1 }}>
                                {/* Timeline Dot */}
                                <div className="position-absolute shadow-sm" style={{ 
                                    left: '-28px', top: '4px', width: '12px', height: '12px', 
                                    backgroundColor: '#2b3a67', borderRadius: '50%', border: '2px solid #fff'
                                }}></div>
                                
                                <div className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                                    <div className="card-body p-3">
                                        <div className="d-flex justify-content-between align-items-start mb-2">
                                            <div>
                                                <span className={`badge rounded-pill mb-2 border-0 ${
                                                    log.type === 'Issue' ? 'bg-danger text-white' : 
                                                    log.type === 'Measurement' ? 'bg-info text-dark' : 'bg-secondary-subtle text-dark'
                                                }`} style={{ fontSize: '0.65rem', fontWeight: '700' }}>
                                                    {log.type.toUpperCase()}
                                                </span>
                                                <div className="d-flex align-items-center gap-2">
                                                    <div className="bg-light rounded-circle d-flex align-items-center justify-content-center" style={{ width: '24px', height: '24px' }}>
                                                        <i className="bi bi-person text-muted" style={{ fontSize: '0.75rem' }}></i>
                                                    </div>
                                                    <span className="fw-bold text-dark small">{log.user?.name || 'System Admin'}</span>
                                                </div>
                                            </div>
                                            <span className="text-muted" style={{ fontSize: '0.7rem' }}>
                                                {moment(log.created_at).fromNow()}
                                            </span>
                                        </div>
                                        
                                        <div className="bg-light-subtle p-3 rounded-3 border-start border-3" style={{ borderLeftColor: '#2b3a67 !important', backgroundColor: '#fdfdfd' }}>
                                            <p className="mb-0 text-secondary small leading-normal" style={{ whiteSpace: 'pre-line' }}>
                                                {log.content}
                                            </p>
                                        </div>
                                        
                                        <div className="mt-2 text-end">
                                            <span className="text-muted italic" style={{ fontSize: '0.65rem' }}>
                                                <i className="bi bi-clock me-1"></i>
                                                {moment(log.created_at).format('MMM DD • hh:mm A')}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </StatusHandler>
        </div>
    );
};

export default ActivityTab;