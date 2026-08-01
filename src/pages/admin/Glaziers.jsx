import React, { useState, useEffect } from 'react';
import api from '../../api/axios';
import { notify } from '../../utils/notifier';
import CreateGlazierModal from './modal/CreateGlazierModal';

const Glaziers = () => {
    const [glaziers, setGlaziers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedGlazier, setSelectedGlazier] = useState(null);

    const fetchGlaziers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/users?role=glazier');
            setGlaziers(res.data);
        } catch (err) {
            notify.error("Failed to load glaziers");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGlaziers();
    }, []);

    const handleEditClick = (glazier) => {
        setSelectedGlazier(glazier);
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setSelectedGlazier(null);
        setShowModal(false);
    };

    const handleSuspend = async (id, name) => {
        if (window.confirm(`Are you sure you want to suspend/delete ${name}?`)) {
            try {
                await api.delete(`/users/${id}`);
                notify.success(`${name} suspended successfully`);
                fetchGlaziers();
            } catch (err) {
                notify.error("Action failed");
            }
        }
    };

    const filteredGlaziers = glaziers.filter(g => 
        g.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        g.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-2 p-md-3">
            {/* Header Section */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-3 mb-4">
                <div>
                    <h4 className="fw-bold mb-0">Glaziers Management</h4>
                    <p className="text-muted small mb-0">Manage your field workers and technicians</p>
                </div>
                <div>
                    <button 
                        className="btn btn-primary px-4 d-inline-flex align-items-center justify-content-center gap-2"
                        style={{ 
                            backgroundColor: '#34497e', 
                            border: 'none', 
                            borderRadius: '8px', 
                            height: '40px',
                            whiteSpace: 'nowrap'
                        }}
                        onClick={() => setShowModal(true)}
                    >
                        <i className="bi bi-plus-lg"></i> Add New Glazier
                    </button>
                </div>
            </div>

            {/* Stats & Search Row */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-md-8">
                    <div className="position-relative">
                        <input 
                            type="text" 
                            className="form-control ps-4 border-0 shadow-sm" 
                            placeholder="Search by name or email..." 
                            style={{ borderRadius: '10px', height: '45px' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
                <div className="col-12 col-md-4">
                    <div className="bg-white p-2 px-3 shadow-sm rounded-3 d-flex align-items-center justify-content-between" style={{ height: '45px' }}>
                        <span className="small fw-bold text-muted">TOTAL GLAZIERS</span>
                        <span className="badge bg-primary-subtle text-primary rounded-pill px-3">{glaziers.length}</span>
                    </div>
                </div>
            </div>

            {/* Content Section */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '15px' }}>
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light d-none d-md-table-header-group">
                                <tr>
                                    <th className="ps-4 py-3 border-0 small fw-bold text-muted">NAME</th>
                                    <th className="py-3 border-0 small fw-bold text-muted">EMAIL</th>
                                    <th className="py-3 border-0 small fw-bold text-muted">JOINED DATE</th>
                                    <th className="py-3 border-0 text-end pe-4 small fw-bold text-muted">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan="4" className="text-center py-5">
                                            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
                                            <span className="text-muted">Loading glaziers...</span>
                                        </td>
                                    </tr>
                                ) : filteredGlaziers.length > 0 ? (
                                    filteredGlaziers.map((glazier) => (
                                        <tr key={glazier.id} className="d-flex flex-column d-md-table-row p-3 p-md-0 border-bottom border-md-0">
                                            {/* Name & Avatar */}
                                            <td className="ps-0 ps-md-4 border-0 border-md-bottom py-2 py-md-3">
                                                <div className="d-flex align-items-center justify-content-between justify-content-md-start">
                                                    <div className="d-flex align-items-center">
                                                        <div className="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center fw-bold me-3 flex-shrink-0" style={{ width: '38px', height: '38px', fontSize: '0.8rem' }}>
                                                            {glazier.name.split(' ').map(n => n[0]).join('')}
                                                        </div>
                                                        <span className="fw-semibold text-dark">{glazier.name}</span>
                                                    </div>

                                                    {/* Mobile Dropdown Menu inside name row */}
                                                    <div className="dropdown d-md-none">
                                                        <button className="btn btn-link text-muted p-0 shadow-none" data-bs-toggle="dropdown">
                                                            <i className="bi bi-three-dots-vertical fs-5"></i>
                                                        </button>
                                                        <ul className="dropdown-menu dropdown-menu-end border-0 shadow p-2" style={{ borderRadius: '10px' }}>
                                                            <li>
                                                                <button className="dropdown-item rounded-2 py-2 small d-flex align-items-center gap-2" onClick={() => handleEditClick(glazier)}>
                                                                    <i className="bi bi-pencil text-primary"></i> Edit Glazier
                                                                </button>
                                                            </li>
                                                            <li><hr className="dropdown-divider" /></li>
                                                            <li>
                                                                <button className="dropdown-item rounded-2 py-2 small d-flex align-items-center gap-2 text-danger" onClick={() => handleSuspend(glazier.id, glazier.name)}>
                                                                    <i className="bi bi-trash"></i> Suspend Access
                                                                </button>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Email */}
                                            <td className="text-muted border-0 border-md-bottom py-1 py-md-3 small ps-0 ps-md-2">
                                                <span className="d-md-none fw-bold me-2 text-dark">Email:</span>
                                                {glazier.email}
                                            </td>

                                            {/* Joined Date */}
                                            <td className="text-muted border-0 border-md-bottom py-1 py-md-3 small ps-0 ps-md-2">
                                                <span className="d-md-none fw-bold me-2 text-dark">Joined:</span>
                                                {new Date(glazier.created_at).toLocaleDateString('en-GB')}
                                            </td>

                                            {/* Desktop Actions */}
                                            <td className="text-end pe-4 d-none d-md-table-cell border-0 border-md-bottom">
                                                <div className="dropdown">
                                                    <button className="btn btn-link text-muted p-0 shadow-none" data-bs-toggle="dropdown">
                                                        <i className="bi bi-three-dots-vertical fs-5"></i>
                                                    </button>
                                                    <ul className="dropdown-menu dropdown-menu-end border-0 shadow-sm p-2" style={{ borderRadius: '10px' }}>
                                                        <li>
                                                            <button className="dropdown-item rounded-2 py-2 small d-flex align-items-center gap-2" onClick={() => handleEditClick(glazier)}>
                                                                <i className="bi bi-pencil text-primary"></i> Edit Glazier
                                                            </button>
                                                        </li>
                                                        <li><hr className="dropdown-divider" /></li>
                                                        <li>
                                                            <button className="dropdown-item rounded-2 py-2 small d-flex align-items-center gap-2 text-danger" onClick={() => handleSuspend(glazier.id, glazier.name)}>
                                                                <i className="bi bi-trash"></i> Suspend Access
                                                            </button>
                                                        </li>
                                                    </ul>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="4" className="text-center py-5 text-muted">
                                            <i className="bi bi-people fs-2 d-block mb-2"></i>
                                            No glaziers found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <CreateGlazierModal 
                show={showModal} 
                onClose={handleCloseModal} 
                onGlazierCreated={fetchGlaziers} 
                selectedData={selectedGlazier} 
            />
        </div>
    );
};

export default Glaziers;