import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logOut } from '../store';
import api from '../api/axios';

const AdminLayout = () => {
    const { user } = useSelector((state) => state.auth);
    const location = useLocation();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const [showNotifications, setShowNotifications] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false); // Mobile sidebar state

    // 1. Fetch Notifications from API
    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            setNotifications(response.data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    // 2. Initial load and Polling
    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Check every 30 seconds
        return () => clearInterval(interval);
    }, []);

    // 3. Individual Mark as Read
    const handleNotificationClick = async (n) => {
        if (!n.read) {
            try {
                await api.patch(`/notifications/${n.id}/read`);
                setNotifications(prev => 
                    prev.map(item => item.id === n.id ? { ...item, read: true } : item)
                );
            } catch (error) {
                console.error("Error marking read", error);
            }
        }
        
        // Navigation logic based on type
        if (n.type === 'lead' || n.type === 'web_lead') navigate('/admin/leads');
        if (n.type === 'appointment') navigate('/admin/appointments');
        setShowNotifications(false);
    };

    // 4. Mark All as Read
    const markAllRead = async () => {
        try {
            await api.post('/notifications/mark-all-read');
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error("Error marking all read", error);
        }
    };

    const handleLogout = async () => {
        try {
            await api.post('/logout'); 
        } catch (err) {
            console.error("Server logout failed", err);
        } finally {
            dispatch(logOut());
            navigate('/login');
        }
    };

    const navItems = [
        { label: 'DASHBOARD', icon: 'grid', path: '/admin/dashboard' },
        { label: 'LEADS & QUOTES', icon: 'file-earmark-text', path: '/admin/leads' },
        { label: 'WORK ORDERS', icon: 'briefcase', path: '/admin/work-order' },
        { label: 'CALENDAR', icon: 'calendar3', path: '/admin/calendar' },
        { label: 'MESSAGE', icon: 'chat-dots', path: '/admin/messages' },
        { label: 'PURCHASE ORDER', icon: 'cart-check', path: '/admin/purchase-order' },
        { label: 'GLAZIERS', icon: 'person-badge', path: '/admin/glaziers' },
        { label: 'SUPPLIERS', icon: 'truck', path: '/admin/suppliers' },
        { label: 'PROFILE', icon: 'person-circle', path: '/admin/profile' },
    ];

    const currentNavItem = navItems.find(item => item.path === location.pathname);
    const pageTitle = currentNavItem ? currentNavItem.label : 'DASHBOARD';
    const unreadCount = notifications.filter(n => !n.read).length;

    // Dropdowns aur mobile sidebar close karne ki handling
    useEffect(() => {
        const closeDropdown = () => setShowNotifications(false);
        if (showNotifications) window.addEventListener('click', closeDropdown);
        return () => window.removeEventListener('click', closeDropdown);
    }, [showNotifications]);

    // Route change hone par mobile sidebar auto-close karna
    useEffect(() => {
        setIsMobileSidebarOpen(false);
    }, [location.pathname]);

    return (
        <div className="d-flex" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            
            {/* --- MOBILE OVERLAY BACKDROP --- */}
            {isMobileSidebarOpen && (
                <div 
                    className="mobile-backdrop d-md-none"
                    onClick={() => setIsMobileSidebarOpen(false)}
                />
            )}

            {/* --- SIDEBAR (Desktop Fixed + Mobile Offcanvas) --- */}
            <nav className={`admin-sidebar bg-white shadow-sm d-flex flex-column ${isMobileSidebarOpen ? 'mobile-open' : ''}`}>
                <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
                    <h5 className="fw-bold mb-0" style={{ color: '#34497e' }}>The Glass People</h5>
                    {/* Mobile Close Button */}
                    <button 
                        className="btn btn-sm d-md-none text-muted p-0" 
                        onClick={() => setIsMobileSidebarOpen(false)}
                    >
                        <i className="bi bi-x-lg fs-5"></i>
                    </button>
                </div>

                <div className="flex-grow-1 px-3 mt-3 overflow-auto">
                    {navItems.map((item) => {
                        const isActive = location.pathname === item.path;
                        return (
                            <Link 
                                key={item.path} 
                                to={item.path} 
                                className={`nav-link mb-0 d-flex align-items-center rounded ${isActive ? 'active' : ''}`}
                                style={{
                                    padding: '12px 15px', 
                                    fontSize: '0.8rem', 
                                    fontWeight: '600',
                                    color: isActive ? '#fff' : '#6c757d',
                                    backgroundColor: isActive ? '#34497e' : 'transparent',
                                    transition: '0.3s'
                                }}
                            >
                                <i className={`bi bi-${item.icon} me-3 fs-6`}></i>
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                <div className="p-3 border-top mt-auto bg-light-subtle">
                    <Link to="/admin/profile" className="d-flex align-items-center mb-3 px-2 text-decoration-none" style={{ color: 'inherit' }}>
                        <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold me-2" style={{ width: '35px', height: '35px', fontSize: '0.8rem' }}>
                            {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'A'}
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                            <h6 className="mb-0 text-truncate" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{user?.name || 'Admin Manager'}</h6>
                        </div>
                    </Link>
                    <button onClick={handleLogout} className="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center" style={{ backgroundColor: '#34497e', border: 'none', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <i className="bi bi-box-arrow-right me-2"></i> Logout
                    </button>
                </div>
            </nav>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="admin-main-wrapper flex-grow-1">
                <header className="d-flex justify-content-between align-items-center border-bottom shadow-sm bg-white" style={{ padding: '10px 15px', position: 'sticky', top: 0, zIndex: 999 }}>
                    
                    <div className="d-flex align-items-center gap-2">
                        {/* Mobile Sidebar Toggle Button */}
                        <button 
                            className="btn btn-light d-md-none border-0 p-1 px-2" 
                            onClick={() => setIsMobileSidebarOpen(true)}
                        >
                            <i className="bi bi-list fs-3 text-dark"></i>
                        </button>
                        <h5 className="fw-bold mb-0 text-dark">{pageTitle}</h5>
                    </div>

                    <div className="d-flex align-items-center gap-3">
                        <div className="position-relative" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-light rounded-circle cursor-pointer position-relative d-flex align-items-center justify-content-center" style={{ cursor: 'pointer', transition: '0.3s', width: '38px', height: '38px' }} onClick={() => setShowNotifications(!showNotifications)}>
                                <i className="bi bi-bell fs-5 text-muted"></i>
                                {unreadCount > 0 && (
                                    <span className="position-absolute translate-middle badge rounded-pill bg-danger border border-light" style={{ top: '5px', right: '-8px', fontSize: '0.65rem' }}>
                                        {unreadCount}
                                    </span>
                                )}
                            </div>

                            {/* Notification Dropdown Container */}
                            {showNotifications && (
                                <div className="position-absolute end-0 mt-2 shadow-lg border rounded bg-white overflow-hidden notification-dropdown" style={{ width: '300px', zIndex: 1100, top: '100%' }}>
                                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light">
                                        <h6 className="mb-0 fw-bold">Notifications</h6>
                                        {unreadCount > 0 && (
                                            <span className="text-primary small fw-semibold cursor-pointer" style={{ cursor: 'pointer' }} onClick={markAllRead}>Mark all as read</span>
                                        )}
                                    </div>

                                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                        {notifications.length > 0 ? (
                                            notifications.map((n) => (
                                                <div key={n.id} 
                                                    onClick={() => handleNotificationClick(n)}
                                                    className={`p-3 border-bottom d-flex gap-3 transition-all ${!n.read ? 'bg-light' : ''}`}
                                                    style={{ transition: '0.2s', cursor: 'pointer' }}
                                                >
                                                    <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${!n.read ? 'bg-primary text-white' : 'bg-grey text-muted'}`} style={{ width: '36px', height: '36px' }}>
                                                        <i className={`bi bi-${n.type === 'appointment' ? 'calendar-event' : 'file-earmark-plus'}`}></i>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <p className={`mb-0 small ${!n.read ? 'fw-bold text-dark' : 'text-muted'}`}>{n.title}</p>
                                                            <span className="text-muted" style={{ fontSize: '0.7rem' }}>{n.time}</span>
                                                        </div>
                                                        <p className="mb-0 text-muted small" style={{ maxWidth: '180px', fontSize: '0.75rem' }}>{n.msg}</p>
                                                    </div>
                                                    {!n.read && <div className="bg-primary rounded-circle mt-2" style={{ width: '8px', height: '8px' }}></div>}
                                                </div>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-muted">
                                                <i className="bi bi-bell-slash fs-2 mb-2 d-block opacity-50"></i>
                                                <p className="mb-0 small">No notifications yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                <div className="p-3 p-md-4">
                    <Outlet />
                </div>
            </main>

            {/* --- RESPONSIVE CSS STYLES --- */}
            <style>{`
                .admin-sidebar {
                    width: 260px;
                    min-height: 100vh;
                    position: fixed;
                    top: 0;
                    left: 0;
                    z-index: 1040;
                    transition: transform 0.3s ease-in-out;
                }

                .admin-main-wrapper {
                    margin-left: 260px;
                    width: calc(100% - 260px);
                    transition: all 0.3s ease-in-out;
                }

                .mobile-backdrop {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.4);
                    z-index: 1030;
                }

                /* Mobile View Tweaks */
                @media (max-width: 767.98px) {
                    .admin-sidebar {
                        transform: translateX(-100%);
                    }

                    .admin-sidebar.mobile-open {
                        transform: translateX(0);
                    }

                    .admin-main-wrapper {
                        margin-left: 0;
                        width: 100%;
                    }

                    .notification-dropdown {
                        right: -10px !important;
                        width: 290px !important;
                    }
                }
            `}</style>
        </div>
    );
};

export default AdminLayout;