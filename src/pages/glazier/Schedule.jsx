import React, { useState, useRef, useEffect, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import api from '../../api/axios';

const calendarStyles = `
  /* Global Calendar Overrides */
  .fc .fc-toolbar { display: none; } 
  .fc .fc-view-harness { background: #f8f9fa; border: none; }
  .fc-theme-standard td, .fc-theme-standard th { border: none !important; }
  
  /* Timeline Slot Styling */
  .fc .fc-timegrid-slot { height: 90px !important; border-bottom: 1px dashed #e9ecef !important; }
  .fc .fc-timegrid-slot-label { vertical-align: top; color: #adb5bd; font-size: 11px; padding-top: 10px; border: none !important; }
  .fc-timegrid-axis-cbox, .fc-timegrid-slot-axis { border: none !important; }

  /* Day Header Styling */
  .fc .fc-col-header-cell { background: #f8f9fa; padding: 15px 0; border: none !important; }
  .fc .fc-col-header-cell-cushion { color: #4facfe; font-weight: 600; text-decoration: none; font-size: 13px; }

  /* Event Container Styling */
  .fc-v-event { 
    background: transparent !important; 
    border: none !important; 
    box-shadow: none !important;
    padding: 0 4px !important;
  }
  
  .custom-event-card {
    border-radius: 12px;
    padding: 12px;
    height: 100%;
    border-left: 5px solid;
    box-shadow: 0 4px 12px rgba(0,0,0,0.05);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }

  .event-time-badge {
    font-size: 10px;
    font-weight: 700;
    margin-bottom: 4px;
    display: block;
  }

  .event-title-text {
    font-size: 12px;
    font-weight: 700;
    line-height: 1.3;
    color: #2d3436;
    margin-bottom: 8px;
  }

  .event-footer {
    border-top: 1px solid rgba(0,0,0,0.05);
    padding-top: 8px;
    margin-top: auto;
  }

  .client-name {
    font-size: 11px;
    color: #636e72;
    display: flex;
    align-items: center;
  }

  .lead-number {
    font-size: 10px;
    color: #4facfe;
    font-weight: 700;
    margin-top: 2px;
    display: block;
  }

  /* Hide the "Now" indicator line if needed */
  .fc-timegrid-now-indicator-line { border-color: #ff7675 !important; }
  
  .sticky-top {
    top: 60px !important;
    }

`;

const GlazierSchedule = () => {
    const calendarRef = useRef(null);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentTitle, setCurrentTitle] = useState('');
    const [viewType, setViewType] = useState('timeGridDay');

    const fetchAppointments = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/glazier/appointments');
            const rawData = response.data.data || {}; 
            console.log(rawData);
            const formatted = Object.values(rawData).flat().map(item => ({
                id: item.id,
                title: item.title,
                start: `${item.date}T${item.time}`,
                end: item.end_time ? `${item.date}T${item.end_time}` : `${item.date}T${item.time}`,
                extendedProps: {
                    type: item.type,
                    description: item.description,
                    client: item.lead?.client_name || 'Walking Customer',
                    lead_number: item.lead?.lead_number,
                    job_number: item.lead?.gjob?.job_number || item.lead?.lead_number, // Site visit ke liye
                    icon: item.icon || (item.type === 'site_visit' ? 'bi-geo-alt' : 'bi-calendar-event')
                }
            }));

            setEvents(formatted);
        } catch (error) {
            console.error("Fetch error:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAppointments();
        // Set initial title after small delay to ensure calendar is rendered
        setTimeout(() => {
            if (calendarRef.current) setCurrentTitle(calendarRef.current.getApi().view.title);
        }, 100);
    }, [fetchAppointments]);

    const handleViewChange = (view) => {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.changeView(view);
        setViewType(view);
        setCurrentTitle(calendarApi.view.title);
    };

    return (
         <div className="container-fluid px-3 pb-5" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <div className="pt-4 mb-4 px-1">
                <h4 className="fw-bold m-0">My Schedule</h4>
                <p className="text-muted small">Your assigned site visits and appointments</p>
            </div>
            <style>{calendarStyles}</style>

            {/* Header Section */}
            <div className="p-3 bg-white shadow-sm mb-2 sticky-top">
                {/* Date Navigator */}
                <div className="d-flex justify-content-between align-items-center mb-3 px-1">
                    <button className="btn btn-sm border-0" onClick={() => { calendarRef.current.getApi().prev(); setCurrentTitle(calendarRef.current.getApi().view.title); }}>
                        <i className="bi bi-chevron-left text-muted"></i>
                    </button>
                    <span className="fw-bold" style={{ fontSize: '14px', color: '#2d3436' }}>{currentTitle}</span>
                    <button className="btn btn-sm border-0" onClick={() => { calendarRef.current.getApi().next(); setCurrentTitle(calendarRef.current.getApi().view.title); }}>
                        <i className="bi bi-chevron-right text-muted"></i>
                    </button>
                </div>

                {/* View Tabs */}
                <div className="d-flex bg-light p-1 rounded-3">
                    {[
                        // { label: 'Week', view: 'timeGridWeek' },
                        { label: 'Days', view: 'timeGridDay' }
                    ].map((tab) => (
                        <button 
                            key={tab.label}
                            className={`btn btn-sm flex-fill border-0 py-2 transition-all ${viewType === tab.view ? 'bg-white shadow-sm fw-bold rounded-2' : 'text-muted'}`}
                            onClick={() => handleViewChange(tab.view)}
                            style={{ fontSize: '13px' }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Calendar Body */}
            <div className="">
                <FullCalendar
    ref={calendarRef}
    plugins={[timeGridPlugin, interactionPlugin, listPlugin]}
    initialView="timeGridDay"
    headerToolbar={false}
    events={events}
    allDaySlot={false}
    slotMinTime="08:00:00"
    slotMaxTime="21:00:00"
    nowIndicator={true}
    height="auto"
    eventContent={(info) => {
        const { type, client, lead_number, job_number, description, icon } = info.event.extendedProps;
        const isSiteVisit = type === 'site_visit';
        
        // Figma Specific Colors
        const themeColor = isSiteVisit ? '#2ecc71' : '#4facfe'; // Green for Site Visit, Blue for Appointment
        const bgColor = isSiteVisit ? '#f0fdf4' : '#f0f9ff';

        return (
            <div className="custom-event-card h-100 shadow-sm" 
                 style={{ 
                    borderColor: themeColor, 
                    backgroundColor: bgColor,
                    borderLeft: `5px solid ${themeColor}`,
                    borderRadius: '8px',
                    padding: '8px'
                 }}>
                
                {/* Header: Time & Type Icon */}
                <div className="d-flex justify-content-between align-items-start mb-1">
                    <span className="event-time-badge fw-bold" style={{ color: themeColor, fontSize: '10px' }}>
                        {info.timeText}
                    </span>
                    <i className={`bi ${icon}`} style={{ color: themeColor, fontSize: '12px' }}></i>
                </div>

                {/* Title & Type Label */}
                <div className="mb-1">
                    <div className="fw-bold text-dark text-truncate" style={{ fontSize: '12px', lineHeight: '1.2' }}>
                        {info.event.title}
                    </div>
                    <small className="text-uppercase fw-bold" style={{ fontSize: '9px', color: themeColor, opacity: 0.8 }}>
                        {type.replace('_', ' ')}
                    </small>
                </div>

                {/* Description (Agar ho to) */}
                {description && (
                    <div className="text-muted text-truncate-2 mb-2" style={{ fontSize: '10px', fontStyle: 'italic' }}>
                        {description}
                    </div>
                )}

                {/* Footer: Client & ID (Figma Style) */}
                <div className="event-footer mt-auto pt-2" style={{ borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                    <div className="client-name text-truncate d-flex align-items-center mb-1" style={{ fontSize: '11px', color: '#444' }}>
                        <i className="bi bi-person-fill me-1" style={{ fontSize: '10px' }}></i>
                        {client}
                    </div>
                    <div className="fw-bold" style={{ fontSize: '10px', color: themeColor }}>
                        {isSiteVisit ? (
                            <span><i className="bi bi-briefcase me-1"></i>{job_number}</span>
                        ) : (
                            <span><i className="bi bi-hash me-1"></i>{lead_number}</span>
                        )}
                    </div>
                </div>
            </div>
        );
    }}
/>
            </div>
        </div>
    );
};

export default GlazierSchedule;