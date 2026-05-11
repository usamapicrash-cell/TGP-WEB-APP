import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../api/axios';
import SiteVisitModal from '../../admin/modal/SiteVisitModal';
import { toast } from 'react-hot-toast';

const SiteVisitsTab = ({ leadId }) => {
    const [showModal, setShowModal] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);

    const formatTime12h = (timeString) => {
        if (!timeString) return '';
        const [hours, minutes] = timeString.split(':');
        let h = parseInt(hours);
        const ampm = h >= 12 ? 'PM' : 'AM';
        h = h % 12 || 12;
        return `${h}:${minutes} ${ampm}`;
    };

    const fetchVisits = useCallback(async () => {
        if (!leadId) {
            setLoading(false);
            return;
        }
        try {
            setLoading(true);
            const response = await api.get(`/appointments/lead/${leadId}`);
            setVisits(response.data);
        } catch (error) {
            console.error("Error fetching visits:", error);
        } finally {
            setLoading(false);
        }
    }, [leadId]);

    useEffect(() => {
        fetchVisits();
    }, [fetchVisits]);

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this visit?")) return;
        try {
            await api.delete(`/appointments/${id}`);
            toast.success("Visit deleted successfully!");
            fetchVisits();
        } catch (error) {
            toast.error("Failed to delete visit.");
        }
    };

    const getStatusStyles = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed': return { bg: '#E8F5E9', text: '#2E7D32' };
            case 'pending': return { bg: '#FFF3E0', text: '#EF6C00' };
            default: return { bg: '#E3F2FD', text: '#1565C0' };
        }
    };

    return (
        <div className="animate__animated animate__fadeIn">
            {/* Header: Clean & Aligned */}
            <div className="d-flex justify-content-between align-items-center mb-4 pb-2 border-bottom">
                <div>
                    <h6 className="fw-bold mb-0 text-dark" style={{ fontSize: '1.1rem' }}>Visit History</h6>
                    {/*<p className="text-muted small mb-0">Timeline of site visits and measurements</p>*/}
                </div>
                <button 
                    onClick={() => { setSelectedVisit(null); setShowModal(true); }} 
                    className="btn d-flex align-items-center gap-2 px-3 py-2 fw-semibold shadow-sm"
                    style={{ backgroundColor: '#2b3a67', color: 'white', borderRadius: '8px', fontSize: '0.85rem', border: 'none' }}
                >
                    <i className="bi bi-plus-lg"></i>
                    Log New Visit
                </button>
            </div>

            {loading ? (
                <div className="text-center p-5"><div className="spinner-border text-primary" role="status"></div></div>
            ) : visits.length === 0 ? (
                <div className="text-center p-5 border rounded-4 bg-light">
                    <p className="text-muted mb-0">No visits recorded yet.</p>
                </div>
            ) : (
                <div className="position-relative">
    {/* Vertical Timeline Line - Sirf bade screens ya list view ke liye aesthetic touch */}
    <div className="position-absolute h-100 border-start border-2 opacity-10" style={{ left: '24px', top: '0', zIndex: 0 }}></div>

    <div className="d-flex flex-column gap-3">
        {visits.map((visit) => {
            const status = getStatusStyles(visit.status);
            return (
                <div 
                    key={visit.id} 
                    className="card border-0 shadow-sm position-relative" 
                    style={{ 
                        borderRadius: '16px', 
                        backgroundColor: '#fff', 
                        zIndex: 1,
                        transition: 'transform 0.2s ease' 
                    }}
                >
                    <div className="card-body p-3">
                        <div className="d-flex justify-content-between">
                            <div className="d-flex gap-3">
                                {/* Icon Container: Clean & Elevated */}
                                <div 
                                    className="rounded-circle d-flex align-items-center justify-content-center shadow-sm" 
                                    style={{ 
                                        width: '48px', 
                                        height: '48px', 
                                        backgroundColor: '#f8f9fa',
                                        border: '1px solid #edf2f7'
                                    }}
                                >
                                    <i className={`bi ${visit.icon || 'bi-calendar-event'} fs-5`} style={{ color: '#2b3a67' }}></i>
                                </div>

                                <div>
                                    {/* Title & Status Row */}
                                    <div className="d-flex align-items-center gap-2 mb-1">
                                        <h6 className="fw-bold text-dark mb-0" style={{ fontSize: '1rem', letterSpacing: '-0.3px' }}>
                                            {visit.title || 'Site Visit'}
                                        </h6>
                                        <span 
                                            className="badge rounded-pill" 
                                            style={{ 
                                                backgroundColor: status.bg, 
                                                color: status.text, 
                                                fontSize: '0.65rem',
                                                fontWeight: '700',
                                                padding: '0.4em 0.8em',
                                                textTransform: 'uppercase'
                                            }}
                                        >
                                            {visit.status || 'Scheduled'}
                                        </span>
                                    </div>
                                    
                                    {/* Date & Time Info */}
                                    <div className="d-flex flex-wrap align-items-center gap-3 text-muted mb-2" style={{ fontSize: '0.82rem' }}>
                                        <span className="d-flex align-items-center gap-1">
                                            <i className="bi bi-calendar3 opacity-75"></i>
                                            {visit.date}
                                        </span>
                                        <span className="d-flex align-items-center gap-1">
                                            <i className="bi bi-clock opacity-75"></i>
                                            {formatTime12h(visit.time)} {visit.end_time && `— ${formatTime12h(visit.end_time)}`}
                                        </span>
                                    </div>

                                    {/* Description: Subtle styling */}
                                    {visit.description && (
                                        <div 
                                            className="p-2 rounded-3 bg-light-subtle border-start border-3" 
                                            style={{ borderLeftColor: '#2b3a67 !important' }}
                                        >
                                            <p className="mb-0 text-secondary small fst-italic leading-sm">
                                                "{visit.description}"
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Action Buttons: Clean & Discrete */}
                            <div className="d-flex flex-column gap-1">
                                <button 
                                    onClick={() => { setSelectedVisit(visit); setShowModal(true); }} 
                                    className="btn btn-light btn-sm border-0 rounded-circle text-primary"
                                    style={{ width: '32px', height: '32px', backgroundColor: '#f0f4ff' }}
                                >
                                    <i className="bi bi-pencil-square"></i>
                                </button>
                                <button 
                                    onClick={() => handleDelete(visit.id)} 
                                    className="btn btn-light btn-sm border-0 rounded-circle text-danger"
                                    style={{ width: '32px', height: '32px', backgroundColor: '#fff5f5' }}
                                >
                                    <i className="bi bi-trash3"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            );
        })}
    </div>
</div>
            )}

            <SiteVisitModal 
                show={showModal} 
                onClose={() => setShowModal(false)} 
                visitData={selectedVisit}
                leadId={leadId}
                onSuccess={() => { setShowModal(false); fetchVisits(); }}
            />
        </div>
    );
};

export default SiteVisitsTab;