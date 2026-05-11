import React, { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import CreateLeadModal from './modal/CreateLeadModal';
import LeadDetailView from './lead/LeadDetailView';
import LeadTypeModal from './modal/LeadTypeModal';
import Pagination from '../../components/Pagination';

const AdminLeads = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState({});
    const [stats, setStats] = useState({ website: 0, call: 0, email: 0, manual: 0 });
    
    // Filter & Page States
    const [search, setSearch] = useState('');
    const [status, setStatus] = useState('');
    const [source, setSource] = useState('');
    const [page, setPage] = useState(1);

    const [showModal, setShowModal] = useState(false);    
    const [selectedLead, setSelectedLead] = useState(null);
    const [showTypeModal, setShowTypeModal] = useState(false);       

    // --- Fetch Leads with Params ---
    const fetchLeads = useCallback(async () => {
        try {
            setLoading(true);
            const response = await api.get('/leads', {
                params: { 
                    page, 
                    search, 
                    status, 
                    source,
                    _t: Date.now() // Yeh line naya data forced fetch karwayegi
                }
            });
            // Assuming Laravel returns LengthAwarePaginator
            setLeads(response.data.data); 
            setPagination(response.data);
            console.log(response);
            // If your API returns counts in the same response or separate meta:
            if(response.data.stats) setStats(response.data.stats);
        } catch (err) {
            console.error("Error fetching leads:", err);
        } finally {
            setLoading(false);
        }
    }, [page, search, status, source]);

    useEffect(() => {
        fetchLeads();
    }, [fetchLeads]);

    // Handle search debounce or instant
    const handleSearch = (e) => {
        setSearch(e.target.value);
        setPage(1); // Reset to page 1 on new search
    };

    

    const getSourceBadge = (source) => {
        switch (source?.toLowerCase()) {
            case 'website': return { bg: '#e1f5fe', text: '#0288d1' };
            case 'call': return { bg: '#fff3e0', text: '#ef6c00' };
            case 'email': return { bg: '#f3e5f5', text: '#7b1fa2' };
            default: return { bg: '#f5f5f5', text: '#616161' };
        }
    };


    const TableSkeleton = () => {
        return (
            <>
                {[...Array(5)].map((_, i) => (
                    <tr key={i} className="skeleton-row">
                        <td className="ps-4">
                            <div className="skeleton-box" style={{ width: '60px', height: '20px', borderRadius: '4px' }}></div>
                        </td>
                        <td>
                            <div className="d-flex flex-column">
                                {/* Top line (Client Name) */}
                                <div className="skeleton-box mb-2" style={{ width: '120px', height: '16px' }}></div>
                                {/* Bottom line (Company) */}
                                <div className="skeleton-box" style={{ width: '80px', height: '10px' }}></div>
                            </div>
                        </td>
                        <td><div className="skeleton-box" style={{ width: '90px', height: '20px' }}></div></td>
                        <td><div className="skeleton-box" style={{ width: '70px', height: '20px' }}></div></td>
                        <td><div className="skeleton-box" style={{ width: '60px', height: '20px' }}></div></td>
                        <td><div className="skeleton-box" style={{ width: '100px', height: '20px' }}></div></td>
                        <td><div className="skeleton-box" style={{ width: '80px', height: '20px' }}></div></td>
                        <td><div className="skeleton-box" style={{ width: '70px', height: '25px', borderRadius: '15px' }}></div></td>
                        <td><div className="skeleton-box" style={{ width: '80px', height: '20px' }}></div></td>
                    </tr>
                ))}
            </>
        );
    };
    return (
        <div className="p-3">

        {/* Lead Detail View (only shows if selectedLead exists) */}
        {selectedLead ? (
                <LeadDetailView
                    key={selectedLead.id} 
                    lead={selectedLead}
                    onBack={() => {
                        setSelectedLead(null);
                        fetchLeads();
                    }}
                    onJobCreated={() => { // <--- Is spelling ko check karein
                        console.log("SUCCESS: AdminLeads is refreshing!");
                        setSelectedLead(null);
                        fetchLeads();
                    }}
                />
            ) : (
            <>
            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-4">
                {/* Left Side: Title and Subtext */}
                <div>
                    <h4 className="fw-bold mb-0">Leads & Quotes</h4>
                    <p className="text-muted small mb-0">Manage incoming leads and convert them to active jobs</p>
                </div>

                {/* Right Side: Grouped Buttons */}
                <div className="d-flex gap-2"> 
                    <button 
                        className="btn btn-outline-secondary px-3" 
                        style={{ borderRadius: '8px' }}
                        onClick={() => setShowTypeModal(true)}
                    >
                        <i className="bi bi-gear me-2"></i>Project Types
                    </button>
                    
                    <button 
                        className="btn btn-primary px-4 py-2" 
                        style={{ backgroundColor: 'var(--primary-blue)', borderRadius: '8px', border: 'none' }}
                        onClick={() => setShowModal(true)}
                    >
                        <i className="bi bi-plus-lg me-2"></i>Create Lead
                    </button>
                </div>
            </div>

            {/* Summary Stats Cards */}
            <div className="row g-3 mb-4">
                {[
                    { label: 'Website Forms', count: stats.website, icon: 'globe' },
                    { label: 'Leads from Calls', count: stats.call, icon: 'telephone' },
                    { label: 'Email Inquiries', count: stats.email, icon: 'envelope' },
                    { label: 'Manual Inquiries', count: stats.manual, icon: 'person-plus' }
                ].map((stat, idx) => (
                    <div key={idx} className="col-md-3">
                        <div className="card border-0 shadow-sm p-3" style={{ borderRadius: '12px' }}>
                            <div className="d-flex align-items-center">
                                <div className="bg-light p-2 rounded-3 me-3">
                                    <i className={`bi bi-${stat.icon} fs-5`} style={{ color: 'var(--primary-blue)' }}></i>
                                </div>
                                <div>
                                    <h5 className="fw-bold mb-0">{stat.count}</h5>
                                    <small className="text-muted">{stat.label}</small>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Search and Filters */}
            <div className="card border-0 shadow-sm p-3 mb-4" style={{ borderRadius: '15px' }}>
                <div className="row g-2">
                    <div className="col-md-6">
                        <div className="input-group border rounded-3 shadow-none">
                            <span className="input-group-text bg-transparent border-0"><i className="bi bi-search text-muted"></i></span>
                            <input 
                                type="text" 
                                className="form-control bg-transparent border-0 small" 
                                placeholder="Search leads..." 
                                value={search}
                                onChange={handleSearch}
                            />
                        </div>
                    </div>
                    <div className="col-md-3">
                        <select className="form-control border-0 bg-light small shadow-none" onChange={(e) => {setStatus(e.target.value); setPage(1)}}>
                            <option value="">All Statuses</option>
                            <option value="lead">Lead</option>
                            <option value="quote">Quote</option>
                            <option value="won">Won</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <select className="form-control border-0 bg-light small shadow-none" onChange={(e) => {setSource(e.target.value); setPage(1)}}>
                            <option value="">All Sources</option>
                            <option value="Website">Website</option>
                            <option value="Call">Call</option>
                            <option value="Email">Email</option>
                            <option value="Manual">Manual</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Active Leads Table */}
            <div className="card border-0 shadow-sm" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                <div className="p-4 bg-white">
                    <h6 className="fw-bold mb-0">Active Leads & Quotes</h6>
                    <small className="text-muted">Scheduling and details managed per-record</small>
                </div>
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light border-bottom">
                            <tr>
                                <th className="ps-4 border-0 text-muted fw-semibold">Lead</th>
                                <th className="ps-4 border-0 text-muted fw-semibold">Clients</th>
                                <th className="border-0 text-muted fw-semibold">Project Type</th>
                                <th className="border-0 text-muted fw-semibold">Status</th>
                                <th className="border-0 text-muted fw-semibold">Value</th>
                                <th className="border-0 text-muted fw-semibold">Phone</th>
                                <th className="border-0 text-muted fw-semibold">Date</th>
                                <th className="border-0 text-muted fw-semibold">Source</th>
                                <th className="border-0 text-muted fw-semibold">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <TableSkeleton />
                            ) : leads.length === 0 ? (
                                <tr><td colSpan="9" className="text-center py-5 text-muted">No leads found.</td></tr>
                            ) : (
                                leads.map((lead) => (
                                    <tr key={lead.id}>
                                        <td className="ps-4">
                                            <span className="fw-bold text-primary" style={{ letterSpacing: '0.5px' }}>
                                                {lead.lead_number}
                                            </span>
                                        </td>
                                        <td className="ps-4">
                                            <div className="fw-bold text-dark">{lead.client_name}</div>
                                            <small className="">{lead.company || 'No Company'}</small>
                                        </td>
                                        <td>{lead.lead_type?.name || 'General'}</td>
                                        <td>
                                            <span className={`badge rounded-pill ${lead.status === 'quote' ? 'text-primary' : 'text-success'}`} style={{ textTransform: 'capitalize' }}>
                                                {lead.status}
                                            </span>
                                        </td>
                                        <td className="">{lead.value ? `$${parseFloat(lead.value).toLocaleString()}` : '-'}</td>
                                        <td>{lead.phone}</td>
                                        <td className="">{lead.date}</td>
                                        <td className="">
                                            {(() => {
                                                const colors = getSourceBadge(lead.source);
                                                return (
                                                    <span className="badge rounded-pill px-3 py-2 fw-bold" 
                                                          style={{ 
                                                              backgroundColor: colors.bg, 
                                                              color: colors.text,
                                                              fontSize: '0.7rem',
                                                              textTransform: 'uppercase'
                                                          }}>
                                                        {lead.source || 'Manual'}
                                                    </span>
                                                );
                                            })()}
                                        </td>                                         
                                        <td className="">
                                            <button className="btn btn-link btn-sm text-decoration-none" style={{ color: 'var(--primary-blue)' }}
                                                 onClick={() => setSelectedLead(lead)}>
                                                View Detail <i className="bi bi-arrow-right ms-1"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Pagination 
                pagination={pagination} 
                currentPage={page} 
                onPageChange={(newPage) => setPage(newPage)} 
            />

            {/* --- CREATE LEAD MODAL --- */}
            <CreateLeadModal 
                show={showModal} 
                onClose={() => setShowModal(false)} 
                onLeadCreated={fetchLeads} // Now this will actually refresh the list!
            />


            <LeadTypeModal 
                show={showTypeModal} 
                onClose={() => setShowTypeModal(false)} 
            />

          </>
        )}

        </div>
    );
};

export default AdminLeads;