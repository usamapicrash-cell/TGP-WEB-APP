import React, { useState, useEffect } from 'react';
import api from '../../../../api/axios';
import { notify } from '../../../../utils/notifier';
import StatusHandler from '../../../../components/StatusHandler';
import moment from 'moment';

const ActivityTab = ({ leadId }) => {
    const [noteText, setNoteText] = useState("");
    const [selectedType, setSelectedType] = useState("General");
    const [activityLogs, setActivityLogs] = useState([]);
    const [loading, setLoading] = useState(true);
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
            fetchLogs();
            
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
                <div className="card-body p-3 p-md-4">
                    <h6 className="fw-bold mb-2">Internal Notes</h6>
                    <textarea 
                        className="form-control border-0 bg-light p-3 mb-3" 
                        rows="4"
                        placeholder="Add a new observation..."
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        style={{ fontSize: '14px', resize: 'vertical' }}
                    ></textarea>

                    {/* Properly Aligned Actions Bar */}
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-stretch align-items-md-center gap-3">
                        {/* Type Select Pills */}
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            {noteTypes.map((type) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setSelectedType(type)}
                                    className={`btn btn-sm px-3 py-1 rounded-pill border-0 fw-semibold ${
                                        selectedType === type 
                                            ? 'text-white' 
                                            : 'bg-light text-muted'
                                    }`}
                                    style={{ 
                                        fontSize: '12px',
                                        backgroundColor: selectedType === type ? '#2b3a67' : undefined 
                                    }}
                                >
                                    {type}
                                </button>
                            ))}
                        </div>

                        {/* Submit Button - Fixed Auto-width */}
                        <button 
                            className="btn btn-primary btn-sm px-4 py-2 fw-bold align-self-end align-self-md-auto"
                            onClick={handleAddNote}
                            disabled={saving}
                            style={{ 
                                backgroundColor: '#2b3a67', 
                                borderColor: '#2b3a67',
                                borderRadius: '6px', 
                                minWidth: '130px',
                                whiteSpace: 'nowrap'
                            }}
                        >
                            {saving ? 'Saving...' : '+ Add Note'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Logs List Container */}
            <StatusHandler loading={loading} error={error} data={activityLogs} loadingText="Loading Notes">
                <div className="ps-2 pe-1">
                    {activityLogs.length === 0 ? (
                        <p className="text-muted small ps-2">No activities logged yet.</p>
                    ) : (
                        activityLogs.map((log) => (
                            <div key={log.id} className="mb-4 border-start border-2 ps-3 ps-md-4 position-relative">
                                {/* Timeline Indicator Dot */}
                                <div className="position-absolute" style={{ 
                                    left: '-7px', 
                                    top: '2px', 
                                    width: '12px', 
                                    height: '12px', 
                                    backgroundColor: '#2b3a67', 
                                    borderRadius: '50%' 
                                }}></div>
                                
                                <div className="d-flex align-items-center gap-2 mb-1">
                                    <span className="badge bg-light text-dark border-0 fw-semibold" style={{ fontSize: '10px' }}>
                                        {log.type?.toUpperCase()}
                                    </span>
                                </div>

                                <div className="small mb-2 d-flex flex-wrap align-items-center gap-1" style={{ fontSize: '12px' }}>
                                    <span className="fw-bold text-dark">{log.user?.name || 'System'}</span>
                                    <span className="text-muted d-none d-sm-inline">•</span>
                                    <span className="text-muted d-block d-sm-inline w-100 w-sm-auto" style={{ fontSize: '11px' }}>
                                        {moment(log.created_at).format('MMM DD, YYYY - hh:mm A')}
                                    </span>
                                </div>

                                {/* Content Box */}
                                <div className="text-muted small bg-light p-3 rounded-3 w-100" style={{ wordBreak: 'break-word', fontSize: '13px' }}>
                                    {log.content}
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