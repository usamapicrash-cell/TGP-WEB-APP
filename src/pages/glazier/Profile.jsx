import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { notify } from '../../utils/notifier';

const GlazierProfile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [passLoading, setPassLoading] = useState(false);
    
    const [profileData, setProfileData] = useState({ name: '', email: '', role: 'Glazier' });
    const [passwordData, setPasswordData] = useState({ current_password: '', new_password: '', confirm_password: '' });

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/user');
            setProfileData({ 
                name: res.data.name, 
                email: res.data.email,
                role: res.data.role || 'Lead Glazier'
            });
        } catch (err) {
            notify.error("Failed to load profile data");
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.put('/user/profile-update', { name: profileData.name });
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
            notify.success("Password updated!");
            setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        } catch (err) {
            notify.error(err.response?.data?.message || "Failed to update password");
        } finally {
            setPassLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('token'); // Ya aapka jo bhi logout logic hai
        navigate('/login');
    };

    return (
        <div className="animate__animated animate__fadeIn pb-5" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            {/* Header Section */}
            <div className="p-4 text-white text-center shadow-sm" style={{ backgroundColor: '#2b3a67', borderRadius: '0 0 35px 35px' }}>
                

                <div className="position-relative d-inline-block mt-2">
                    <div className="rounded-circle border border-4 border-white shadow bg-light d-flex align-items-center justify-content-center mx-auto" 
                         style={{ width: '100px', height: '100px' }}>
                        <h1 className="text-primary mb-0 fw-bold">{profileData.name ? profileData.name.charAt(0).toUpperCase() : 'TGP'}</h1>
                    </div>
                </div>
                <h5 className="mt-3 fw-bold mb-0">{profileData.name || 'Loading...'}</h5>
                <p className="small opacity-75 mb-3">{profileData.role}</p>
            </div>

            <div className="px-3 mt-4">
                {/* Personal Information Form */}
                <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '20px' }}>
                    <div className="card-body p-4">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <div className="bg-primary bg-opacity-10 p-2 rounded-3">
                                <i className="bi bi-user text-primary fs-5"></i>
                            </div>
                            <h6 className="fw-bold mb-0">Personal Details</h6>
                        </div>
                        <form onSubmit={handleProfileUpdate}>
                            <div className="mb-3">
                                <label className="form-label small fw-bold text-muted">FULL NAME</label>
                                <input type="text" className="form-control bg-light border-0 py-2 shadow-none" 
                                    value={profileData.name}
                                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                                    style={{ borderRadius: '10px' }} required />
                            </div>
                            <div className="mb-4">
                                <label className="form-label small fw-bold text-muted">EMAIL ADDRESS</label>
                                <input type="email" className="form-control bg-light border-0 py-2 opacity-75" 
                                    value={profileData.email} disabled style={{ borderRadius: '10px' }} />
                            </div>
                            <button className="btn btn-primary w-100 fw-bold py-2 shadow-sm" 
                                style={{ backgroundColor: '#2b3a67', borderRadius: '10px', border: 'none' }} disabled={loading}>
                                {loading ? <span className="spinner-border spinner-border-sm"></span> : 'Update Profile'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Security Section */}
                <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '20px' }}>
                    <div className="card-body p-4">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <div className="bg-danger bg-opacity-10 p-2 rounded-3">
                                <i className="bi bi-shield-lock text-danger fs-5"></i>
                            </div>
                            <h6 className="fw-bold mb-0">Security Settings</h6>
                        </div>
                        <form onSubmit={handlePasswordChange}>
                            <div className="mb-3">
                                <input type="password" placeholder="Current Password" 
                                    className="form-control bg-light border-0 py-2 shadow-none"
                                    value={passwordData.current_password}
                                    onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                                    style={{ borderRadius: '10px' }} required />
                            </div>
                            <div className="mb-3">
                                <input type="password" placeholder="New Password" 
                                    className="form-control bg-light border-0 py-2 shadow-none"
                                    value={passwordData.new_password}
                                    onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                                    style={{ borderRadius: '10px' }} required />
                            </div>
                            <div className="mb-3">
                                <input type="password" placeholder="Confirm New Password" 
                                    className="form-control bg-light border-0 py-2 shadow-none"
                                    value={passwordData.confirm_password}
                                    onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                                    style={{ borderRadius: '10px' }} required />
                            </div>
                            <button className="btn btn-outline-danger w-100 fw-bold py-2" 
                                style={{ borderRadius: '10px' }} disabled={passLoading}>
                                {passLoading ? <span className="spinner-border spinner-border-sm"></span> : 'Change Password'}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Logout Action */}
                <button 
                    onClick={handleLogout}
                    className="btn btn-white w-100 py-3 text-danger fw-bold border-0 shadow-sm d-flex align-items-center justify-content-center gap-2" 
                    style={{ borderRadius: '15px', backgroundColor: '#fff' }}>
                    <i className="bi bi-box-arrow-right"></i> Log Out
                </button>
            </div>
        </div>
    );
};

export default GlazierProfile;