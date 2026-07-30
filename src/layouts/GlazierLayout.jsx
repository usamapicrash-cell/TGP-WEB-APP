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
        const interval = setInterval(fetchNotifications, 30000); // 30s Polling
        return () => clearInterval(interval);
    }, []);

    // 3. Mark Single Notification Read
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

    // 4. Mark All as Read
    const markAllRead = async () => {
        try {
            await api.post('/notifications/mark-all-read');
            setNotifications(notifications.map(n => ({ ...n, read: true })));
        } catch (error) {
            console.error("Error marking all read", error);
        }
    };

    // 5. Logout Handler
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

    // Nav items structure matching Admin panel
    const navItems = [
        { label: 'DASHBOARD', icon: 'grid', activeIcon: 'grid-fill', path: '/glazier/dashboard' },
        { label: 'TASKS', icon: 'briefcase', activeIcon: 'briefcase-fill', path: '/glazier/tasks' },
        { label: 'SCHEDULE', icon: 'calendar-event', activeIcon: 'calendar-event-fill', path: '/glazier/schedule' },
        { label: 'DRAWING', icon: 'pencil-square', activeIcon: 'pencil-square', path: '/glazier/drawing' },
    ];

    // Helper for sub-routes and exact match check
    const isLinkActive = (item) => {
        let isActive = location.pathname === item.path;
        if (item.label === 'TASKS') {
            isActive = location.pathname.includes('/glazier/job-details');
        }
        if (!isActive && item.path !== '/glazier/dashboard') {
            isActive = location.pathname.startsWith(item.path);
        }
        return isActive;
    };

    const currentNavItem = navItems.find(item => isLinkActive(item));
    const pageTitle = currentNavItem ? currentNavItem.label : 'DASHBOARD';
    const unreadCount = notifications.filter(n => !n.read).length;

    // Outer click listener to close popups
    useEffect(() => {
        const closeDropdowns = () => {
            setShowNotifications(false);
            setShowUserMenu(false);
        };
        window.addEventListener('click', closeDropdowns);
        return () => window.removeEventListener('click', closeDropdowns);
    }, []);

    return (
        <div className="d-flex" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            
            {/* --- DESKTOP SIDEBAR (Admin Panel Layout Match) --- */}
            <nav className="bg-white shadow-sm d-none d-md-flex flex-column" style={{ width: '260px', minHeight: '100vh', position: 'fixed', zIndex: 1000 }}>
                <div className="p-3 border-bottom">
                    <h5 className="fw-bold mb-1" style={{ color: '#34497e' }}>The Glass People</h5>
                </div>
                
                <div className="flex-grow-1 px-3 mt-3 overflow-auto">
                    {navItems.map((item) => {
                        const isActive = isLinkActive(item);
                        return (
                            <Link 
                                key={item.path} 
                                to={item.path} 
                                className={`nav-link mb-2 d-flex align-items-center rounded ${isActive ? 'active' : ''}`}
                                style={{
                                    padding: '12px 15px', 
                                    fontSize: '0.8rem', 
                                    fontWeight: '600',
                                    color: isActive ? '#fff' : '#6c757d',
                                    backgroundColor: isActive ? '#34497e' : 'transparent',
                                    transition: '0.3s'
                                }}
                            >
                                <i className={`bi bi-${isActive ? item.activeIcon : item.icon} me-3 fs-5`}></i>
                                {item.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Bottom User Profile Section */}
                <div className="p-3 border-top mt-auto bg-light-subtle">
                    <Link to="/glazier/profile" className="d-flex align-items-center mb-3 px-2 text-decoration-none" style={{ color: 'inherit' }}>
                        <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold me-2" style={{ width: '35px', height: '35px', fontSize: '0.8rem', backgroundColor: '#e9ecef', color: '#34497e' }}>
                            {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'G'}
                        </div>
                        <div className="flex-grow-1 overflow-hidden">
                            <h6 className="mb-0 text-truncate" style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{user?.name || 'Glazier Worker'}</h6>
                            <small className="text-muted d-block" style={{ fontSize: '0.7rem' }}>Glazier</small>
                        </div>
                    </Link>
                    
                    <button onClick={handleLogout} className="btn btn-primary w-100 py-2 fw-semibold d-flex align-items-center justify-content-center" style={{ backgroundColor: '#34497e', border: 'none', borderRadius: '8px', fontSize: '0.85rem' }}>
                        <i className="bi bi-box-arrow-right me-2"></i> Logout
                    </button>
                </div>
            </nav>

            {/* --- MAIN CONTENT & HEADER CONTAINER --- */}
            <main className="flex-grow-1 layout-main-wrapper">
                
                {/* Header Navbar */}
                <header className="d-flex justify-content-between align-items-center border-bottom shadow-sm bg-white app-header-sticky" style={{ padding: '10px 20px' }}>
                    
                    {/* Page Title (Desktop) / App Title (Mobile) */}
                    <div>
                        <h5 className="fw-bold mb-0 text-dark d-none d-md-block">{pageTitle}</h5>
                        <span className="fw-bold fs-6 text-dark d-md-none" style={{ color: '#34497e' }}>The Glass People</span>
                    </div>

                    <div className="d-flex align-items-center gap-3">
                        {/* Notifications Menu */}
                        <div className="position-relative" onClick={(e) => e.stopPropagation()}>
                            <div 
                                className="bg-light rounded-circle cursor-pointer position-relative d-flex align-items-center justify-content-center" 
                                style={{ cursor: 'pointer', transition: '0.3s', width: '40px', height: '40px' }} 
                                onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
                            >
                                <i className="bi bi-bell fs-5 text-muted"></i>
                                {unreadCount > 0 && (
                                    <span className="position-absolute translate-middle badge rounded-pill bg-danger border border-light" style={{ top: '5px', right: '-8px', fontSize: '0.65rem' }}>
                                        {unreadCount}
                                    </span>
                                )}
                            </div>

                            {/* Notifications Dropdown Container */}
                            {showNotifications && (
                                <div className="position-absolute end-0 mt-2 shadow-lg border rounded bg-white overflow-hidden dropdown-popover" style={{ width: '320px', zIndex: 1100, top: '100%' }}>
                                    <div className="p-3 border-bottom d-flex justify-content-between align-items-center bg-light">
                                        <h6 className="mb-0 fw-bold">Notifications</h6>
                                        {unreadCount > 0 && (
                                            <span className="text-primary small fw-semibold cursor-pointer" style={{ cursor: 'pointer' }} onClick={markAllRead}>Mark all as read</span>
                                        )}
                                    </div>

                                    <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                        {notifications.length > 0 ? (
                                            notifications.map((n) => (
                                                <div 
                                                    key={n.id} 
                                                    onClick={() => handleNotificationClick(n)}
                                                    className={`p-3 border-bottom d-flex gap-3 transition-all ${!n.read ? 'bg-light' : ''}`}
                                                    style={{ transition: '0.2s', cursor: 'pointer' }}
                                                >
                                                    <div className={`rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 ${!n.read ? 'bg-primary text-white' : 'bg-secondary-subtle text-muted'}`} style={{ width: '36px', height: '36px' }}>
                                                        <i className="bi bi-bell-fill"></i>
                                                    </div>
                                                    <div className="flex-grow-1">
                                                        <div className="d-flex justify-content-between align-items-center">
                                                            <p className={`mb-0 small ${!n.read ? 'fw-bold text-dark' : 'text-muted'}`}>{n.title}</p>
                                                            <span className="text-muted" style={{ fontSize: '0.7rem' }}>{n.time || ''}</span>
                                                        </div>
                                                        <p className="mb-0 text-muted small" style={{ maxWidth: '200px', fontSize: '0.75rem' }}>{n.msg}</p>
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

                        {/* Mobile User Profile Avatar Popover */}
                        <div className="position-relative d-md-none" onClick={(e) => e.stopPropagation()}>
                            <div 
                                className="rounded-circle d-flex align-items-center justify-content-center fw-bold cursor-pointer" 
                                style={{ width: '36px', height: '36px', backgroundColor: '#e9ecef', color: '#34497e', cursor: 'pointer' }}
                                onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
                            >
                                {user?.name ? user.name.charAt(0).toUpperCase() : 'G'}
                            </div>

                            {showUserMenu && (
                                <div className="position-absolute end-0 mt-2 p-3 shadow-lg border rounded bg-white dropdown-popover" style={{ width: '180px', zIndex: 1100, top: '100%' }}>
                                    <Link to="/glazier/profile" className="text-decoration-none text-dark" onClick={() => setShowUserMenu(false)}>
                                        <h6 className="mb-0 fw-bold small text-truncate">{user?.name || 'Glazier Worker'}</h6>
                                        <p className="text-muted small mb-2" style={{ fontSize: '0.7rem' }}>Glazier</p>
                                    </Link>
                                    <button onClick={handleLogout} className="btn btn-sm w-100 text-white d-flex align-items-center justify-content-center gap-2" style={{ backgroundColor: '#34497e' }}>
                                        <i className="bi bi-box-arrow-right"></i> Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Main Content Area */}
                <div className="p-3 p-md-4">
                    <Outlet />
                </div>
            </main>

            {/* --- MOBILE BOTTOM NAVIGATION BAR (Only visible on small screens) --- */}
            <nav className="mobile-bottom-nav d-md-none fixed-bottom bg-white border-top shadow-lg d-flex justify-content-around align-items-center">
                {navItems.map((item) => {
                    const isActive = isLinkActive(item);
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
                /* Responsive Content Offsets */
                @media (min-width: 768px) {
                    .layout-main-wrapper {
                        margin-left: 260px;
                        width: calc(100% - 260px);
                    }
                    .app-header-sticky {
                        position: sticky;
                        top: 0;
                        z-index: 999;
                    }
                }

                @media (max-width: 767.98px) {
                    .layout-main-wrapper {
                        margin-left: 0;
                        width: 100%;
                        padding-bottom: 70px;
                    }
                    .app-header-sticky {
                        position: sticky;
                        top: 0;
                        z-index: 999;
                    }
                }

                /* Mobile Navigation Bar Styling */
                .mobile-bottom-nav {
                    height: 65px;
                    padding-bottom: env(safe-area-inset-bottom);
                    z-index: 1030;
                }
                .nav-tab {
                    color: #a0a0a0;
                    transition: all 0.2s ease;
                    flex: 1;
                }
                .nav-tab.active {
                    color: #34497e;
                }
                .nav-tab.active .tab-label {
                    font-weight: 800;
                }
                .tab-label {
                    font-size: 0.65rem;
                    margin-top: 2px;
                    font-weight: 600;
                }
            `}</style>
        </div>
    );
};

export default GlazierLayout;