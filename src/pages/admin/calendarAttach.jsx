import React, { useState, useRef, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import ScheduleJobModal from './modal/ScheduleJobModal';
import api from '../../api/axios';

const calendarStyles = `
  .fc .fc-toolbar { display: none; } 
  .fc .fc-view-harness { background: #fff; border-radius: 0 0 15px 15px; min-height: 600px; }
  .fc-theme-standard td, .fc-theme-standard th { border: 1px solid #f8f9fa !important; }
  .fc .fc-col-header-cell { padding: 10px 0; background: #fff; font-weight: 700; color: #2b3a67; font-size: 13px; }
  
  /* Half-hour slot height adjusted for better visibility on small screens */
  .fc .fc-timegrid-slot { height: 45px !important; border-bottom: 1px solid #f8f9fa !important; }
  .fc .fc-timegrid-slot-label { vertical-align: middle; color: #adb5bd; font-size: 11px; border: none !important; }
  
  .fc-v-event { border: none !important; box-shadow: 0 2px 4px rgba(0,0,0,0.05) !important; background: transparent !important; }
  
  @keyframes spin { 100% { transform:rotate(360deg); } }
  .spin-icon { animation: spin 1s linear infinite; }
  
  .refresh-btn { transition: all 0.2s ease; border: 1px solid #eee !important; width: 32px; height: 32px; }
  .refresh-btn:hover { background-color: #f8f9fa !important; transform: rotate(15deg); }

  /* Custom Scrollbar for cleaner look */
  .fc-scroller::-webkit-scrollbar { width: 4px; }
  .fc-scroller::-webkit-scrollbar-thumb { background: #e9ecef; border-radius: 10px; }
`;

const AdminCalendar = () => {
    const [showModal, setShowModal] = useState(false);
    const calendarRef = useRef(null);
    const [viewType, setViewType] = useState('timeGridWeek');
    const [currentDateTitle, setCurrentDateTitle] = useState('');
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchAllVisits = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/appointments'); 
            const mappedEvents = response.data.map(visit => ({
                id: visit.id,
                title: visit.title || 'No Name',
                start: `${visit.date}T${visit.time}`,
                end: visit.end_time ? `${visit.date}T${visit.end_time}` : `${visit.date}T${visit.time}`,
                backgroundColor: visit.status === 'completed' ? '#e8f5e9' : '#ffffff',
                borderColor: visit.status === 'completed' ? '#4caf50' : '#2b3a67',
                extendedProps: {
                    clientName: visit.lead?.client_name || 'No Name',
                    leadId: visit.lead?.gjob?.job_number || visit.lead?.lead_number || 'N/A',
                    glazier: visit.lead?.gjob?.glazier?.name || visit.tech_name || 'Unassigned',
                    location: visit.lead?.address || 'No Address',
                    status: visit.status,
                }
            }));
            setEvents(mappedEvents);
        } catch (error) {
            console.error("Error fetching calendar:", error);
        } finally {
            setTimeout(() => setLoading(false), 500);
        }
    }, []);

    const updateTitle = () => {
        if (calendarRef.current) setCurrentDateTitle(calendarRef.current.getApi().view.title);
    };

    useEffect(() => {
        fetchAllVisits();
        updateTitle();
    }, [fetchAllVisits]);

    const handleNav = (action) => {
        const api = calendarRef.current.getApi();
        if (action === 'prev') api.prev();
        else if (action === 'next') api.next();
        else api.today();
        updateTitle();
    };

    const handleViewChange = (view) => {
        const api = calendarRef.current.getApi();
        api.changeView(view);
        setViewType(view);
        updateTitle();
    };

    return (
        <div className="p-3 bg-light min-vh-100">
            <style>{calendarStyles}</style>
            
            {/* Minimal Header */}

            <div className="card border-0 shadow-sm overflow-hidden" style={{ borderRadius: '12px' }}>
                {/* Custom Compact Toolbar */}
                <div className="d-flex flex-wrap justify-content-between align-items-center p-2 gap-2 border-bottom bg-white">
                    <div className="d-flex align-items-center gap-1">
                        <button className="btn btn-xs btn-outline-light text-dark border-0" onClick={() => handleNav('prev')}><i className="bi bi-chevron-left"></i></button>
                        <button className="btn btn-xs btn-outline-light text-dark border-0" onClick={() => handleNav('next')}><i className="bi bi-chevron-right"></i></button>
                        <button className="btn btn-sm fw-bold px-2 border-0 text-primary" onClick={() => handleNav('today')} style={{ fontSize: '12px' }}>Today</button>
                    </div>

                    <span className="fw-bold text-dark text-center" style={{ fontSize: '14px', flex: 1 }}>{currentDateTitle}</span>

                    <div className="d-flex align-items-center gap-2">
                        <div className="btn-group bg-light p-1 rounded-2 d-none d-md-flex">
                            {['Week', 'Day', 'List'].map((label) => {
                                const viewMap = { Week: 'timeGridWeek', Day: 'timeGridDay', List: 'listWeek' };
                                const isActive = viewType === viewMap[label];
                                return (
                                    <button 
                                        key={label}
                                        className={`btn btn-sm border-0 px-2 py-0 ${isActive ? 'bg-white shadow-sm fw-bold text-dark' : 'text-muted'}`}
                                        style={{ fontSize: '11px' }}
                                        onClick={() => handleViewChange(viewMap[label])}
                                    >
                                        {label}
                                    </button>
                                );
                            })}
                        </div>
                        <button onClick={fetchAllVisits} disabled={loading} className="btn btn-sm bg-white refresh-btn rounded-circle d-flex align-items-center justify-content-center">
                            <i className={`bi bi-arrow-clockwise ${loading ? 'spin-icon text-primary' : 'text-muted'}`}></i>
                        </button>
                    </div>
                </div>

                <FullCalendar
                    ref={calendarRef}
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
                    initialView="timeGridWeek"
                    allDaySlot={false}
                    slotMinTime="08:00:00"
                    slotMaxTime="20:00:00"
                    slotDuration="00:30:00" // 30 Minutes Space
                    headerToolbar={false}
                    events={events}
                    eventContent={(info) => (
                        <div className="h-100 p-1 border-start border-3 rounded shadow-sm bg-white overflow-hidden" 
                             style={{ borderColor: info.event.borderColor }}>
                            
                            <div className="d-flex justify-content-between align-items-start border-bottom pb-1 mb-1">
                                <span className="text-primary fw-bold" style={{ fontSize: '9px' }}>#{info.event.extendedProps.leadId}</span>
                                {info.event.extendedProps.status === 'completed' && <i className="bi bi-check-circle-fill text-success" style={{ fontSize: '9px' }}></i>}
                            </div>

                            <div className="fw-bold text-dark text-truncate lh-1" style={{ fontSize: '11px' }}>
                                {info.event.title}
                            </div>

                            <div className="text-dark text-truncate lh-1 mt-2" style={{ fontSize: '11px' }}>
                                {info.event.extendedProps.clientName}
                            </div>

                            <div className="mt-1">
                                <div className="text-muted text-truncate lh-sm" style={{ fontSize: '10px' }}>
                                    <i className="bi bi-person me-1"></i>{info.event.extendedProps.glazier}
                                </div>
                                <div className="text-muted text-truncate lh-sm" style={{ fontSize: '10px' }}>
                                    <i className="bi bi-geo-alt me-1"></i>{info.event.extendedProps.location}
                                </div>
                            </div>
                        </div>
                    )}
                />
            </div>

            <ScheduleJobModal show={showModal} onClose={() => setShowModal(false)} onSuccess={fetchAllVisits} />
        </div>
    );
};

export default AdminCalendar;