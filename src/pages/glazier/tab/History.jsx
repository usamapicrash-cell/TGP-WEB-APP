import React, { useState, useEffect } from 'react';
import api from '../../../api/axios';
import StatusHandler from '../../../components/StatusHandler';

const History = ({ leadId }) => {
    const [lead, setLead] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                // Fetch the lead with history/activities
                const response = await api.get(`/lead/${leadId}`);
                setLead(response.data);
            } catch (err) {
                console.error("Error fetching history:", err);
                setError(err);
            } finally {
                setLoading(false);
            }
        };

        if (leadId) fetchHistory();
    }, [leadId]);

    // Access activities from the nested relationship using Optional Chaining
    const activities = lead?.gjob?.activities || [];

    const formatDateTime = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <StatusHandler loading={loading} error={error} data={lead} loadingText="Loading History...">
            <div className="card border-0 shadow-sm p-4" style={{ borderRadius: '12px' }}>
                <h6 className="text-primary mb-4 small fw-bold text-uppercase">
                    <i className="bi bi-clock-history me-2"></i>Audit Trail
                </h6>
                
                <div className="position-relative ps-4">
                    {/* Vertical Timeline Line */}
                    <div 
                        className="border-start position-absolute h-100 opacity-25" 
                        style={{ left: '7px', top: '10px', borderLeftStyle: 'dashed' }}
                    ></div>

                    {activities.length > 0 ? (
                        activities.map((item, idx) => (
                            <div key={item.id || idx} className="mb-4 position-relative">
                                {/* Timeline Dot */}
                                <div className={`bg-${idx === 0 ? 'primary' : 'secondary'} opacity-${idx === 0 ? '100' : '50'} rounded-circle position-absolute`} 
                                     style={{ 
                                         width: '12px', 
                                         height: '12px', 
                                         left: '-32px', 
                                         top: '5px',
                                         border: '2px solid #fff',
                                         boxShadow: '0 0 0 2px rgba(13, 110, 253, 0.1)'
                                     }}>
                                </div>

                                {/* Event Title (Action) */}
                                <div className={`small fw-bold ${idx === 0 ? 'text-dark' : 'text-secondary'}`}>
                                    {item.action}
                                </div>

                                {/* Description */}
                                {item.description && (
                                    <div className="text-muted small mb-1" style={{ fontSize: '0.8rem' }}>
                                        {item.description}
                                    </div>
                                )}

                                {/* Meta Info */}
                                <div className="text-muted" style={{ fontSize: '0.75rem' }}>
                                    {formatDateTime(item.created_at)} • 
                                    <span className="text-primary ms-1">
                                        By: {item.user?.name || 'System'}
                                    </span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-muted small">No history records found.</div>
                    )}
                </div>
            </div>
        </StatusHandler>
    );
};

export default History;