import React, { useState, useEffect } from 'react';
import api from '../../../../api/axios';
import { notify } from '../../../../utils/notifier';
import StatusHandler from '../../../../components/StatusHandler'; // Added
import moment from 'moment';

const ActivityTab = ({ leadId }) => {
    const [noteText, setNoteText] = useState("");
    const [selectedType, setSelectedType] = useState("General");
    const [activityLogs, setActivityLogs] = useState([]);
    const [loading, setLoading] = useState(true); // Initial loading true
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    const noteTypes = ["General", "Measurement", "Issue", "Follow-up"];

    const fetchLogs = async () => {
        try {
            const res = await api.get(`/leads/${leadId}/activities`);
            setActivityLogs(res.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching logs", err);
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
            fetchLogs(); // Refresh list
        } catch (err) {
            notify.error("Failed to add note");
        } finally {
            setSaving(false);
        }
    };

    return (
            <div className="animate__animated animate__fadeIn">
                {/* Input Section */}
                <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px' }}>
                    <div className="card-body p-4">
                        <h6 className="fw-bold mb-1">Internal Notes</h6>
                        <textarea 
                            className="form-control border-0 bg-light p-3 mb-3" 
                            rows="4"
                            placeholder="Add a new observation..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                        ></textarea>

                        <div className="d-flex justify-content-between align-items-center">
                            <div className="d-flex gap-2">
                                {noteTypes.map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => setSelectedType(type)}
                                        className={`btn btn-sm px-3 rounded-pill border-0 fw-bold ${
                                            selectedType === type ? 'bg-primary text-white' : 'bg-light text-muted'
                                        }`}
                                    >
                                        {type}
                                    </button>
                                ))}
                            </div>
                            <button 
                                className="btn btn-primary btn-sm px-4 fw-bold"
                                onClick={handleAddNote}
                                disabled={saving}
                                style={{ backgroundColor: '#2b3a67', borderRadius: '6px' }}
                            >
                                {saving ? 'Saving...' : '+ Add Note'}
                            </button>
                        </div>
                    </div>
                </div>
        <StatusHandler loading={loading} error={error} data={activityLogs} loadingText="Loading Notes">
                {/* History Log */}
                <div className="ps-2">
                    {activityLogs.length === 0 ? (
                        <p className="text-muted small ps-4">No activities logged yet.</p>
                    ) : (
                        activityLogs.map((log) => (
                            <div key={log.id} className="mb-4 border-start border-2 ps-4 position-relative">
                                <div className="position-absolute" style={{ 
                                    left: '-7px', top: '0', width: '12px', height: '12px', 
                                    backgroundColor: '#2b3a67', borderRadius: '50%' 
                                }}></div>
                                
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <span className="badge bg-light text-dark border-0 small">{log.type.toUpperCase()}</span>
                                </div>
                                <div className="small mb-2">
                                    <span className="fw-bold text-dark">{log.user?.name || 'System'}</span>
                                    <span className="text-muted mx-2">•</span>
                                    <span className="text-muted">{moment(log.created_at).format('MMM DD, YYYY - hh:mm A')}</span>
                                </div>
                                <p className="text-muted small bg-light p-2 rounded-3" style={{ maxWidth: '90%' }}>
                                    {log.content}
                                </p>
                            </div>
                        ))
                    )}
                </div>
        </StatusHandler>
            </div>
    );
};

export default ActivityTab;