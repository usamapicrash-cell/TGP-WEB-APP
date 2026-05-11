import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logOut } from '../store';
import api from '../api/axios';

const GlazierLayout = () => {
    const { user } = useSelector((state) => state.auth);
    const location = useLocation();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    // State Management
    const [showNotifications, setShowNotifications] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [notifications, setNotifications] = useState([]);

    // Theme Colors
    const themeBlue = '#34497e';
    const inactiveGrey = '#a0a0a0';

    // 1. Fetch Notifications
    const fetchNotifications = async () => {
        try {
            const response = await api.get('/notifications');
            setNotifications(response.data);
        } catch (error) {
            console.error("Failed to fetch notifications", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    // 2. Handlers
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
        setShowNotifications(false);
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

    const unreadCount = notifications.filter(n => !n.read).length;

    // Bottom Navigation Items
    const navItems = [
        { label: 'Dashboard', icon: 'grid', activeIcon: 'grid-fill', path: '/glazier/dashboard' },
        { label: 'Tasks', icon: 'briefcase', activeIcon: 'briefcase-fill', path: '/glazier/tasks' },
        { label: 'Schedule', icon: 'calendar-event', activeIcon: 'calendar-event-fill', path: '/glazier/schedule' },
        { label: 'Drawing', icon: 'pencil-square', activeIcon: 'pencil-square', path: '/glazier/drawing' },
        // { label: 'Files', icon: 'files', activeIcon: 'files', path: '/glazier/files' },
    ];

    return (
        <div className="mobile-app-wrapper" onClick={() => { setShowNotifications(false); setShowUserMenu(false); }}>
            {/* --- MOBILE HEADER --- */}
            <header className="mobile-header fixed-top bg-white px-3 d-flex align-items-center justify-content-between border-bottom shadow-sm">
                <div>
                    <span className="fw-bold fs-6 text-dark">The Glass People</span>
                </div>
                
                <div className="d-flex align-items-center gap-3">
                    {/* Notification Icon */}
                    <div className="position-relative cursor-pointer" onClick={(e) => { e.stopPropagation(); setShowNotifications(!showNotifications); setShowUserMenu(false); }}>
                        <i className="bi bi-bell fs-5 text-muted"></i>
                        {unreadCount > 0 && <span className="notification-dot"></span>}
                        
                        {/* Notification Dropdown */}
                        {showNotifications && (
                            <div className="position-absolute end-0 mt-3 shadow-lg border rounded bg-white overflow-hidden" style={{ width: '280px', zIndex: 1100 }}>
                                <div className="p-2 border-bottom bg-light fw-bold small">Notifications</div>
                                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                                    {notifications.length > 0 ? (
                                        notifications.map((n) => (
                                            <div key={n.id} onClick={() => handleNotificationClick(n)} className={`p-2 border-bottom small ${!n.read ? 'bg-light' : ''}`}>
                                                <div className="fw-bold">{n.title}</div>
                                                <div className="text-muted" style={{ fontSize: '0.7rem' }}>{n.msg}</div>
                                            </div>
                                        ))
                                    ) : <div className="p-3 text-center text-muted small">No notifications</div>}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* User Profile Avatar */}
                    <div className="position-relative" onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); setShowNotifications(false); }}>
                        <div className="user-avatar-sm cursor-pointer">
                            {user?.name ? user.name.charAt(0).toUpperCase() : 'JD'}
                        </div>

                        {/* Logout Popup (Figma Style) */}
                        {showUserMenu && (
                            <div className="position-absolute end-0 mt-3 p-3 shadow-lg border rounded bg-white" style={{ width: '180px', zIndex: 1100 }}>
                                {/* Profile Link added here */}
                                <Link to="/glazier/profile" className="text-decoration-none text-dark" onClick={() => setShowUserMenu(false)}>
                                    <h6 className="mb-0 fw-bold small">{user?.name || 'Joe Doe'}</h6>
                                    <p className="text-muted small mb-2" style={{ fontSize: '0.7rem' }}>Glazier</p>
                                </Link>
                                
                                <button onClick={handleLogout} className="btn btn-sm w-100 text-white d-flex align-items-center justify-content-center gap-2" style={{ backgroundColor: themeBlue }}>
                                    <i className="bi bi-box-arrow-right"></i> Logout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* --- MAIN CONTENT AREA --- */}
            <main className="mobile-main-content">
                <div className="container-fluid pb-5 mb-5 pt-3">
                    <Outlet />
                </div>
            </main>

            {/* --- BOTTOM NAVIGATION BAR --- */}
            <nav className="mobile-bottom-nav fixed-bottom bg-white border-top shadow-lg d-flex justify-content-around align-items-center">
                {navItems.map((item) => {
                    // 1. Exact match check karein
                    let isActive = location.pathname === item.path;

                    // 2. Tasks/Jobs ke liye special check: 
                    // Agar path 'job-details' ya 'drawing' se start ho raha hai, toh use "Tasks" tab active rakho
                    if (item.label === 'Tasks') { // 'Tasks' ki jagah wo label likhein jo aapne navItems mein diya hai
                        isActive = location.pathname.includes('/glazier/job-details');
                    }

                    // 3. Baqi general sub-routes ke liye (agar koi aur tab ho)
                    if (!isActive && item.path !== '/glazier/dashboard') {
                        isActive = location.pathname.startsWith(item.path);
                    }

                    return (
                        <Link 
                            key={item.path} 
                            to={item.path} 
                            className={`nav-tab d-flex flex-column align-items-center text-decoration-none ${isActive ? 'active' : ''}`}
                        >
                            <i className={`bi bi-${isActive ? item.activeIcon : item.icon} fs-5`}></i>
                            <span className="tab-label">{item.label}</span>
                        </Link>
                    );
                })}
            </nav>

            <style>{`
                .mobile-app-wrapper {
                    background-color: #f8f9fa;
                    min-height: 100vh;
                    font-family: 'Inter', sans-serif;
                }
                .mobile-header {
                    height: 60px;
                    z-index: 1030;
                }
                .mobile-main-content {
                    margin-top: 60px;
                    padding-bottom: 80px;
                }
                .user-avatar-sm {
                    width: 35px;
                    height: 35px;
                    background: #e9ecef;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: 700;
                    font-size: 0.75rem;
                    color: ${themeBlue};
                }
                .notification-dot {
                    position: absolute;
                    top: 2px;
                    right: -2px;
                    width: 8px;
                    height: 8px;
                    background: #dc3545;
                    border-radius: 50%;
                    border: 2px solid white;
                }
                .cursor-pointer { cursor: pointer; }

                /* Bottom Navigation Styles */
                .mobile-bottom-nav {
                    height: 70px;
                    padding-bottom: env(safe-area-inset-bottom);
                    z-index: 1030;
                }
                .nav-tab {
                    color: ${inactiveGrey};
                    transition: all 0.2s ease;
                    flex: 1;
                }
                .nav-tab.active {
                    color: ${themeBlue};
                }
                .nav-tab.active .tab-label {
                    font-weight: 800;
                }
                .nav-tab i {
                    font-size: 1.3rem !important;
                }
                .tab-label {
                    font-size: 0.65rem;
                    margin-top: 4px;
                    font-weight: 500;
                }
            `}</style>
        </div>
    );
};

export default GlazierLayout;