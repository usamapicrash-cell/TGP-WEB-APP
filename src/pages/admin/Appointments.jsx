import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import AppointmentJobModal from './modal/AppointmentJobModal';
import { toast } from 'react-hot-toast';

const AppointmentList = () => {
    const [appointments, setAppointments] = useState([]);
    const [glaziers, setGlaziers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [search, setSearch] = useState('');
    const [selectedGlazier, setSelectedGlazier] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');
    const [showModal, setShowModal] = useState(false);

    const fetchGlaziers = async () => {
        try {
            const { data } = await api.get('/users?role=glazier');
            setGlaziers(data || []);
        } catch (err) {
            console.error("Failed to fetch glaziers");
        }
    };

    const fetchAllAppointments = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/appointments', {
                params: { 
                    q: 'appointment', 
                    search: search,
                    glazier_id: selectedGlazier,
                    status: selectedStatus
                }
            });
            setAppointments(data || []);
        } catch (err) {
            setError(err);
            toast.error("Failed to load appointments");
        } finally {
            setLoading(false);
        }
    };

    // --- Action: Change Status ---
    const handleStatusChange = async (appointmentId, newStatus) => {
        try {
            await api.put(`/appointments/${appointmentId}/status`, { status: newStatus });
            toast.success(`Status updated to ${newStatus}`);
            // Update local state instead of refetching everything for better UX
            setAppointments(prev => prev.map(app => 
                app.id === appointmentId ? { ...app, status: newStatus } : app
            ));
        } catch (err) {
            toast.error("Failed to update status");
        }
    };

    useEffect(() => {
        fetchGlaziers();
    }, []);

    useEffect(() => {
        const delayDebounce = setTimeout(() => {
            fetchAllAppointments();
        }, 300);
        return () => clearTimeout(delayDebounce);
    }, [search, selectedGlazier, selectedStatus]);

    const TableSkeleton = () => (
        <>
            {[...Array(6)].map((_, i) => (
                <tr key={i} className="skeleton-row">
                    <td><div className="skeleton-box" style={{ width: '40px', height: '20px' }}></div></td>
                    <td><div className="skeleton-box mb-2" style={{ width: '100px', height: '16px' }}></div></td>
                    <td><div className="skeleton-box" style={{ width: '120px', height: '20px' }}></div></td>
                    <td><div className="skeleton-box mb-2" style={{ width: '130px', height: '16px' }}></div></td>
                    <td><div className="skeleton-box" style={{ width: '150px', height: '20px' }}></div></td>
                    <td><div className="skeleton-box" style={{ width: '70px', height: '20px' }}></div></td>
                    <td><div className="skeleton-box" style={{ width: '90px', height: '28px', borderRadius: '6px' }}></div></td>
                </tr>
            ))}
        </>
    );

    // --- Status Action UI ---
    const StatusDropdown = ({ currentStatus, appointmentId }) => {
        const styles = {
            completed: { bg: '#e8f5e9', color: '#2e7d32' },
            pending: { bg: '#fff3e0', color: '#ef6c00' },
            scheduled: { bg: '#e3f2fd', color: '#1976d2' },
            cancelled: { bg: '#ffebee', color: '#c62828' }
        };
        const style = styles[currentStatus?.toLowerCase()] || styles.pending;

        return (
            <select 
                className="form-select border-0 shadow-none fw-bold"
                style={{ 
                    backgroundColor: style.bg, 
                    color: style.color,
                    fontSize: '0.75rem', 
                    padding: '5px 40px 5px 10px', 
                    borderRadius: '6px',
                    width: 'auto',
                    cursor: 'pointer'
                }}
                value={currentStatus || 'pending'}
                onChange={(e) => handleStatusChange(appointmentId, e.target.value)}
            >
                <option value="pending">Pending</option>
                <option value="scheduled">Scheduled</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
            </select>
        );
    };

    return (
        <div className="p-4" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <AppointmentJobModal 
                show={showModal} 
                onClose={() => setShowModal(false)} 
                onSuccess={fetchAllAppointments} 
            />
            <style>{`
                .table-container { background: white; border-radius: 12px; overflow: hidden; border: 1px solid #edf2f7; }
                .custom-table thead { background-color: #fcfcfd; border-bottom: 1px solid #edf2f7; }
                .custom-table th { color: #64748b; font-size: 0.75rem; text-transform: uppercase; padding: 16px; font-weight: 600; }
                .custom-table td { padding: 16px; font-size: 0.85rem; color: #1e293b; vertical-align: middle; border-bottom: 1px solid #edf2f7; }
                .skeleton-box {
                    background: linear-gradient(110deg, #ececec 8%, #f5f5f5 18%, #ececec 33%);
                    border-radius: 4px;
                    background-size: 200% 100%;
                    animation: shine 1.5s linear infinite;
                }
                @keyframes shine { to { background-position-x: -200%; } }
                .btn-new { background-color: #2b3a67; color: white; border-radius: 6px; padding: 8px 16px; font-size: 0.85rem; border: none; }
            `}</style>

            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h4 className="fw-bold mb-1">Appointments</h4>
                    <p className="text-muted small mb-0">Manage your schedule</p>
                </div>
                <button className="btn-new shadow-sm" onClick={() => setShowModal(true)}>
                    + New Appointment
                </button>
            </div>

            <div className="table-container shadow-sm p-3 bg-white mb-3">
                <div className="row g-2">
                    <div className="col-md-4">
                        <input 
                            type="text" 
                            className="form-control border-0 bg-light shadow-none" 
                            placeholder="Search by name or ID..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="col-md-3">
                        <select 
                            className="form-control form-select-sm bg-light border-0 shadow-none py-2"
                            value={selectedGlazier}
                            onChange={(e) => setSelectedGlazier(e.target.value)}
                        >
                            <option value="">All Glaziers</option>
                            {glaziers.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                        </select>
                    </div>
                    <div className="col-md-3">
                        <select 
                            className="form-control form-select-sm bg-light border-0 shadow-none py-2"
                            value={selectedStatus}
                            onChange={(e) => setSelectedStatus(e.target.value)}
                        >
                            <option value="">All Status</option>
                            <option value="scheduled">Scheduled</option>
                            <option value="pending">Pending</option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="table-container shadow-sm">
                <div className="table-responsive">
                    <table className="table custom-table mb-0">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Date</th>
                                <th>Employee</th>
                                <th>Customer</th>
                                <th>Service</th>
                                <th>Payment</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton />
                            ) : appointments.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-5 text-muted">No appointments found.</td>
                                </tr>
                            ) : (
                                appointments.map((app, idx) => (
                                    <tr key={app.id}>
                                        <td className="fw-bold text-primary">#{String(idx + 1).padStart(2, '0')}</td>
                                        <td>
                                            <div className="fw-bold">{new Date(app.date).toLocaleDateString()}</div>
                                            <small className="text-muted">{app.time}</small>
                                        </td>
                                        <td>{app.lead?.gjob?.glazier?.name || 'Not Assigned'}</td>
                                        <td>
                                            <div className="fw-medium">{app.lead?.client_name}</div>
                                            <small className="text-muted">{app.lead?.lead_number}</small>
                                        </td>
                                        <td>{app.title}</td>
                                        <td className="fw-bold">
                                            $ {app.lead?.payments?.reduce((total, p) => total + parseFloat(p.amount || 0), 0).toFixed(2) || '0.00'}
                                        </td>
                                        <td>
                                            <StatusDropdown 
                                                currentStatus={app.status} 
                                                appointmentId={app.id} 
                                            />
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AppointmentList;