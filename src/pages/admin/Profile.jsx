import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { notify } from '../../utils/notifier';

const AdminProfile = () => {
    const [loading, setLoading] = useState(false);
    const [passLoading, setPassLoading] = useState(false); // Password ke liye alag loader
    const [stats, setStats] = useState({ totalLeads: 0, wonLeads: 0, completedJobs: 0 });
    
    const [profileData, setProfileData] = useState({ name: '', email: '' });
    const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });

    useEffect(() => {
        fetchProfileAndStats();
    }, []);

    const fetchProfileAndStats = async () => {
        try {
            const [profileRes, statsRes] = await Promise.all([
                api.get('/user'),
                api.get('/admin/dashboard-stats') 
            ]);
            setProfileData({ name: profileRes.data.name, email: profileRes.data.email });
            setStats(statsRes.data);
        } catch (err) {
            notify.error("Failed to load profile data");
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/user/profile-update', profileData);
            notify.success("Profile updated successfully!");
        } catch (err) {
            notify.error(err.response?.data?.message || "Update failed");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.new_password !== passwordData.confirm_password) {
            return notify.error("Passwords do not match!");
        }
        setPassLoading(true);
        try {
            await api.put('/user/password-update', passwordData);
            notify.success("Password changed successfully!");
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            notify.error(err.response?.data?.message || "Password update failed");
        } finally {
            setPassLoading(false);
        }
    };

    return (
        <div className="p-4">
            <div className="mb-4">
                <h4 className="fw-bold mb-1">My Profile</h4>
                <p className="text-muted small">Manage your account settings and view your performance.</p>
            </div>

            {/* Stats Row */}
            <div className="row g-3 mb-5">
                {[
                    { label: 'TOTAL LEADS', value: stats.totalLeads, icon: 'bi-funnel', color: '#34497e' },
                    { label: 'WON LEADS', value: stats.wonLeads, icon: 'bi-trophy', color: '#198754' },
                    { label: 'JOBS COMPLETED', value: stats.completedJobs, icon: 'bi-check2-circle', color: '#0dcaf0' }
                ].map((item, idx) => (
                    <div className="col-md-4" key={idx}>
                        <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '15px' }}>
                            <div className="d-flex align-items-center justify-content-between">
                                <div>
                                    <span className="small fw-bold text-muted d-block mb-1">{item.label}</span>
                                    <h3 className="fw-bold mb-0">{item.value}</h3>
                                </div>
                                <div className="rounded-circle d-flex align-items-center justify-content-center" 
                                     style={{ width: '45px', height: '45px', backgroundColor: `${item.color}15`, color: item.color }}>
                                    <i className={`bi ${item.icon} fs-4`}></i>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="row g-4">
                {/* Profile Information */}
                <div className="col-lg-6">
                    <div className="card border-0 shadow-sm p-4" style={{ borderRadius: '15px' }}>
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <i className="bi bi-person-circle text-primary fs-5"></i>
                            <h5 className="fw-bold mb-0">Personal Information</h5>
                        </div>
                        <form onSubmit={handleProfileUpdate}>
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">FULL NAME</label>
                                <input 
                                    type="text" 
                                    className="form-control bg-light border-0 py-2" 
                                    value={profileData.name}
                                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="mb-4">
                                <label className="form-label small fw-bold text-muted">EMAIL ADDRESS</label>
                                <input 
                                    type="email" 
                                    className="form-control bg-light border-0 py-2" 
                                    value={profileData.email}
                                    disabled 
                                />
                            </div>
                            <button 
                                className="btn btn-primary w-100 fw-semibold py-2 d-flex align-items-center justify-content-center" 
                                style={{ backgroundColor: '#34497e', border: 'none', borderRadius: '8px' }}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                ) : 'Update Name'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Change Password */}
                <div className="col-lg-6">
                    <div className="card border-0 shadow-sm p-4" style={{ borderRadius: '15px' }}>
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <i className="bi bi-shield-lock text-danger fs-5"></i>
                            <h5 className="fw-bold mb-0">Security Settings</h5>
                        </div>
                        <form onSubmit={handlePasswordChange}>
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">CURRENT PASSWORD</label>
                                <input 
                                    type="password" 
                                    className="form-control bg-light border-0 py-2" 
                                    value={passwordData.current_password}
                                    onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                                    required
                                />
                            </div>
                            <div className="row g-3 mb-4">
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted">NEW PASSWORD</label>
                                    <input 
                                        type="password" 
                                        className="form-control bg-light border-0 py-2" 
                                        value={passwordData.new_password}
                                        onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="col-md-6">
                                    <label className="form-label small fw-bold text-muted">CONFIRM NEW</label>
                                    <input 
                                        type="password" 
                                        className="form-control bg-light border-0 py-2" 
                                        value={passwordData.confirm_password}
                                        onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                                        required
                                    />
                                </div>
                            </div>
                            <button 
                                className="btn btn-danger w-100 fw-semibold py-2 d-flex align-items-center justify-content-center" 
                                style={{ borderRadius: '8px' }}
                                disabled={passLoading}
                            >
                                {passLoading ? (
                                    <span className="spinner-border spinner-border-sm me-2"></span>
                                ) : 'Update Password'}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminProfile;