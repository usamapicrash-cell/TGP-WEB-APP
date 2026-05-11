import React, { useState, useEffect, useCallback } from 'react';
import api from '../../../../api/axios';
import SiteVisitModal from '../../modal/SiteVisitModal';
import AdminCalendar from '../../calendarAttach'; 
import { toast } from 'react-hot-toast';

const SiteVisitsTab = ({ leadId }) => {
    const [showModal, setShowModal] = useState(false);
    const [selectedVisit, setSelectedVisit] = useState(null);
    const [visits, setVisits] = useState([]);
    const [loading, setLoading] = useState(true);

    // --- Helper: Convert 24h to 12h AM/PM ---
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
            console.error("Error deleting visit:", error);
            toast.error("Failed to delete visit.");
        }
    };

    const handleEdit = (visit) => {
        setSelectedVisit(visit);
        setShowModal(true);
    };

    const handleAddNew = () => {
        setSelectedVisit(null);
        setShowModal(true);
    };

    const getStatusClass = (status) => {
        switch (status?.toLowerCase()) {
            case 'completed': return 'text-success bg-success-subtle border-success-subtle';
            case 'pending': return 'text-danger bg-danger-subtle border-danger-subtle';
            default: return 'text-primary bg-primary-subtle border-primary-subtle';
        }
    };

    return (
        <div className="animate__animated animate__fadeIn">
            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div>
                    <h6 className="fw-bold mb-1">Visit History</h6>
                    <p className="text-muted small mb-0">Timeline of site visits and appointments</p>
                </div>
                <button 
                    onClick={handleAddNew} 
                    className="btn btn-primary d-flex align-items-center gap-2 px-3 py-2" 
                    style={{ backgroundColor: '#2b3a67', border: 'none', borderRadius: '6px', fontSize: '0.85rem' }}
                >
                    <i className="bi bi-plus-lg"></i>
                    <span>Log New Visit</span>
                </button>
            </div>

            {/* Visits List */}
            {loading ? (
                <div className="text-center p-4">
                    <div className="spinner-border text-primary" role="status"></div>
                </div>
            ) : visits.length === 0 ? (
                <div className="text-center p-4 text-muted border rounded-3 bg-light">No visits logged yet.</div>
            ) : (
                <div className="d-flex flex-column gap-3">
                    {visits.map((visit) => (
                        <div key={visit.id} className="card border-0 shadow-sm" style={{ borderRadius: '12px' }}>
                            <div className="card-body p-3">
                                <div className="d-flex justify-content-between align-items-start">
                                    <div className="d-flex gap-3">
                                        <div className="bg-light rounded-3 d-flex align-items-center justify-content-center" style={{ width: '45px', height: '45px' }}>
                                            <i className={`bi ${visit.icon || 'bi-calendar-event'} text-muted fs-5`}></i>
                                        </div>
                                        
                                        <div>
                                            <div className="d-flex align-items-center gap-2 mb-1">
                                                <span className="fw-bold small text-uppercase">{visit.type?.replace('_', ' ')}</span>
                                                <span className={`badge border fw-bold ${getStatusClass(visit.status)}`} style={{ fontSize: '0.65rem', padding: '0.4em 0.7em', textTransform: 'uppercase' }}>
                                                    {visit.status || 'SCHEDULED'}
                                                </span>
                                            </div>
                                            
                                            <div className="d-flex align-items-center gap-3 mb-1">
                                                <p className="mb-0 small fw-semibold text-dark">{visit.title}</p>
                                                <p className="mb-0 small text-muted">
                                                    <i className="bi bi-calendar3 me-1"></i>{visit.date}
                                                </p>
                                                <p className="mb-0 small text-muted">
                                                    <i className="bi bi-clock me-1"></i>
                                                    {formatTime12h(visit.time)} 
                                                    {visit.end_time ? ` - ${formatTime12h(visit.end_time)}` : ''}
                                                </p>
                                            </div>
                                            
                                            {visit.description && (
                                                <p className="mb-0 smaller text-muted fst-italic" style={{ fontSize: '0.8rem' }}>
                                                    [ {visit.description} ]
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="d-flex gap-1">
                                        <button onClick={() => handleEdit(visit)} className="btn btn-light btn-sm border text-muted px-2 py-1">
                                            <i className="bi bi-pencil"></i>
                                        </button>
                                        <button onClick={() => handleDelete(visit.id)} className="btn btn-light btn-sm border text-muted px-2 py-1">
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- AVAILABILITY OVERVIEW SECTION ADDED --- */}
            <div className="col-12 mt-5">
                <hr className="my-4 text-muted opacity-25" />
                <div className="d-flex align-items-center gap-2 mb-3">
                    <i className="bi bi-calendar-range text-muted"></i>
                    <h6 className="fw-bold small mb-0 text-uppercase text-muted" style={{ letterSpacing: '0.5px' }}>
                        Availability Overview
                    </h6>
                </div>
                <div className="rounded-4 overflow-hidden border shadow-sm bg-white">
                    <AdminCalendar isCompact={true} /> 
                </div>
            </div>

            <SiteVisitModal 
                show={showModal} 
                onClose={() => setShowModal(false)} 
                visitData={selectedVisit}
                leadId={leadId}
                onSuccess={() => {
                    setShowModal(false);
                    fetchVisits();
                }}
            />
        </div>
    );
};

export default SiteVisitsTab;