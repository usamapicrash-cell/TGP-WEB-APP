import React, { useState, useEffect } from 'react';
import {
    AreaChart, Area, ResponsiveContainer, BarChart, Bar,
    PieChart, Pie, Cell, Tooltip, XAxis, YAxis, CartesianGrid,
    LineChart, Line
} from 'recharts';
import api from '../../api/axios'; // Aapka axios instance

const QB_COLORS = {
    green: '#2ca01c',
    blue: '#0077c5',
    orange: '#ed6a10',
    grey: '#d1d1d1',
    dark: '#393a3d',
    red: '#d52b1e',
    purple: '#8d10ee'
};

// Dummy data for visual charts (Backend doesn't provide historical months data yet)
const statsData = [{ v: 40 }, { v: 70 }, { v: 50 }, { v: 90 }, { v: 60 }, { v: 80 }, { v: 100 }];
const invoiceChartData = [ { month: 'Jan', invoices: 1200 }, { month: 'Feb', invoices: 1800 }, { month: 'Mar', invoices: 1400 }, { month: 'Apr', invoices: 2200 }, { month: 'May', invoices: 2600 } ];
const poChartData = [ { month: 'Jan', po: 800 }, { month: 'Feb', po: 1100 }, { month: 'Mar', po: 1500 }, { month: 'Apr', po: 1300 }, { month: 'May', po: 1800 } ];

// --- Skeleton Loaders ---
const SkeletonBase = ({ style }) => (
    <div className="skeleton-loader" style={{ backgroundColor: '#e2e8f0', borderRadius: '8px', ...style }} />
);

const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip shadow-sm" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '10px 12px' }}>
                {label && <p className="mb-1 fw-bold small">{label}</p>}
                <p className="mb-0 small" style={{ color: payload[0].color || payload[0].fill }}>
                    {payload[0].name}: {payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

const AdminDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            setError(null);
            try {
                // Apna correct endpoint yahan verify kar lein
                const response = await api.get('/dashboard-data'); 
                if (response.data.success) {
                    setDashboardData(response.data.data);
                } else {
                    throw new Error(response.data.message || "Something went wrong");
                }
            } catch (err) {
                setError(err.message || "Failed to connect to server");
            } finally {
                setLoading(false);
            }
        };

        fetchDashboardData();
    }, []);

    const MiniStatsCard = ({ title, amount, subtext, color, chartType = "bar" }) => (
        <div className="card border-0 shadow-sm bg-white h-100 overflow-hidden stats-card-hover">
            <div className="p-3 pb-1">
                <p className="text-muted small fw-bold mb-1 text-uppercase">{title}</p>
                <div className="d-flex justify-content-between align-items-center">
                    <div>
                        <h3 className="fw-bold mb-0" style={{ color: QB_COLORS.dark }}>{amount}</h3>
                        <span className="text-muted x-small">{subtext}</span>
                    </div>
                    <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '42px', height: '42px', background: `${color}15` }}>
                        <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color }}></div>
                    </div>
                </div>
            </div>
            <div style={{ width: '100%', height: '75px', marginTop: '5px' }}>
                <ResponsiveContainer width="100%" height="100%">
                    {chartType === "bar" ? (
                        <BarChart data={statsData}>
                            <Bar dataKey="v" fill={color} radius={[6, 6, 0, 0]} barSize={14} />
                        </BarChart>
                    ) : (
                        <AreaChart data={statsData}>
                            <defs>
                                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor={color} stopOpacity={0.4} />
                                    <stop offset="95%" stopColor={color} stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <Area type="monotone" dataKey="v" stroke={color} fill={`url(#gradient-${title})`} strokeWidth={3} dot={false} />
                        </AreaChart>
                    )}
                </ResponsiveContainer>
            </div>
        </div>
    );

    const DataDonut = ({ title, data, totalTitle, totalValue }) => (
        <div className="card border shadow-sm h-100 bg-white">
            <div className="card-body p-3">
                <h6 className="text-muted small fw-bold text-uppercase mb-3">{title}</h6>
                <div className="d-flex align-items-center mb-3">
                    <div style={{ width: '110px', height: '110px' }}>
                        <ResponsiveContainer>
                            <PieChart>
                                <Tooltip content={<CustomTooltip />} />
                                <Pie data={data} innerRadius={35} outerRadius={50} paddingAngle={3} dataKey="value">
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="ms-3">
                        <h3 className="fw-bold mb-0">{totalValue}</h3>
                        <p className="text-muted x-small mb-0">{totalTitle}</p>
                    </div>
                </div>
                {data.map((item, i) => (
                    <div key={i} className="d-flex justify-content-between align-items-center mb-2">
                        <span className="x-small text-muted">
                            <i className="bi bi-circle-fill me-1" style={{ color: item.color, fontSize: '7px' }}></i>
                            {item.name}
                        </span>
                        <span className="x-small fw-bold">{item.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );

    if (error) {
        return (
            <div className="d-flex flex-column justify-content-center align-items-center" style={{ height: '80vh' }}>
                <div className="text-center p-5 bg-white shadow-sm rounded-4" style={{ maxWidth: '400px' }}>
                    <i className="bi bi-exclamation-octagon text-danger display-4"></i>
                    <h5 className="mt-3 fw-bold">Connection Error</h5>
                    <p className="text-muted small mb-4">{error}</p>
                    <button className="btn btn-primary px-4 rounded-pill" onClick={() => window.location.reload()}>
                        <i className="bi bi-arrow-clockwise me-1"></i> Retry
                    </button>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container-fluid p-4">
                <SkeletonBase style={{ width: '200px', height: '30px', marginBottom: '30px' }} />
                <div className="row g-3 mb-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="col-md-3">
                            <SkeletonBase style={{ width: '100%', height: '140px' }} />
                        </div>
                    ))}
                </div>
                <div className="row g-3 mb-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="col-md-4">
                            <SkeletonBase style={{ width: '100%', height: '250px' }} />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    // --- Data Mapping from API ---
    const stats = dashboardData?.stats || {};
    
    // Format Lead Source Data
    const leadData = dashboardData?.regionData?.map(item => ({
        name: item.name,
        value: parseInt(item.value),
        color: item.color
    })) || [];
    const totalLeads = leadData.reduce((acc, curr) => acc + curr.value, 0);

    // Format Work Order Stages Data
    const woColors = [QB_COLORS.orange, QB_COLORS.purple, QB_COLORS.blue, QB_COLORS.green];
    const workOrderData = dashboardData?.woStages?.map((stage, idx) => ({
        name: stage.stage,
        value: parseInt(stage.count),
        color: woColors[idx % woColors.length]
    })) || [];
    const totalWO = workOrderData.reduce((acc, curr) => acc + curr.value, 0);

    const recentInvoices = dashboardData?.recentInvoices || [];
    const latestPO = dashboardData?.latestPO ? [dashboardData.latestPO] : []; // Array to match mapping logic
    const appointments = dashboardData?.appointments || [];

    return (
        <div className="container-fluid p-4" style={{ minHeight: '100vh', backgroundColor: '#f8f9fa' }}>
            <div className="mb-4 border-bottom pb-3">
                <h3 className="fw-bold mb-0" style={{ color: QB_COLORS.dark }}>Business Overview</h3>
                <p className="text-muted small">Real-time Financial & Operational Insights</p>
            </div>

            {/* Stats Cards */}
            <div className="row g-3 mb-4">
                <div className="col-md-3">
                    <MiniStatsCard
                        title="Invoiced"
                        amount={`$${stats.contract_total || '0.00'}`}
                        subtext="Total Contracts"
                        color={QB_COLORS.blue}
                        chartType="bar"
                    />
                </div>
                <div className="col-md-3">
                    <MiniStatsCard
                        title="Received"
                        amount={`$${stats.total_collected || '0.00'}`}
                        subtext="Collected Amount"
                        color={QB_COLORS.green}
                        chartType="area"
                    />
                </div>
                <div className="col-md-3">
                    <MiniStatsCard
                        title="Outstanding"
                        amount={`$${stats.remaining_balance || '0.00'}`}
                        subtext="Pending Balance"
                        color={QB_COLORS.red}
                        chartType="bar"
                    />
                </div>
                <div className="col-md-3">
                    <MiniStatsCard
                        title="Collection Rate"
                        amount={`${stats.collected_percentage || 0}%`}
                        subtext="Success Margin"
                        color={QB_COLORS.dark}
                        chartType="area"
                    />
                </div>
            </div>

            {/* Middle Donut Cards */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <DataDonut
                        title="Lead Sources"
                        totalTitle="Total Leads"
                        totalValue={totalLeads}
                        data={leadData}
                    />
                </div>
                <div className="col-md-4">
                    <DataDonut
                        title="Work Order Stages"
                        totalTitle="Active Jobs"
                        totalValue={totalWO}
                        data={workOrderData}
                    />
                </div>
                <div className="col-md-4">
                    <div className="card border shadow-sm p-3 bg-white h-100">
                        <h6 className="text-muted small fw-bold text-uppercase mb-3">Top Products</h6>
                        {dashboardData?.topProducts?.map((product, i) => (
                            <div key={i} className="mb-3">
                                <div className="d-flex justify-content-between x-small fw-bold mb-1">
                                    <span>{product.name}</span>
                                    <span>{product.sales} sold</span>
                                </div>
                                <div className="progress" style={{ height: '8px' }}>
                                    <div
                                        className="progress-bar rounded-pill"
                                        style={{ width: `${Math.min(100, product.sales * 10)}%`, backgroundColor: QB_COLORS.blue }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>


            {/* Schedule Section */}
           <div className="row g-3 mb-4">
                <div className="col-12">
                    <div className="card border-0 shadow-sm bg-white" style={{ borderRadius: '12px' }}>
                        <div className="card-body p-4">
                            {/* Header Section */}
                            <div className="d-flex justify-content-between align-items-center mb-4">
                                <div>
                                    <h6 className="fw-bold text-dark mb-1">
                                        <i className="bi bi-calendar3 text-primary me-2"></i>
                                        Upcoming Schedule
                                    </h6>
                                    <p className="text-muted small mb-0">Next 7 days overview</p>
                                </div>
                                <span className="badge bg-primary-light text-primary px-3 py-2" style={{ backgroundColor: '#e3f2fd' }}>
                                    {appointments.length} Planned Events
                                </span>
                            </div>

                            <div className="table-responsive">
                                <table className="table align-middle mb-0">
                                    <thead>
                                        <tr style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            <th className="border-0 text-muted ps-0">Date & Time</th>
                                            <th className="border-0 text-muted">Client / Project</th>
                                            <th className="border-0 text-muted">Assigned Glazier</th>
                                            <th className="border-0 text-muted">Type</th>
                                            <th className="border-0 text-muted text-end pe-0">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {appointments.length > 0 ? appointments.map((app, i) => (
                                            <tr key={i} className="border-bottom-0">
                                                <td className="ps-0 py-3">
                                                    <div className="d-flex align-items-center">
                                                        <div className={`rounded-3 text-center me-3 d-flex flex-column justify-content-center ${app.is_today ? 'bg-primary text-white' : 'bg-light text-muted'}`} 
                                                             style={{ width: '45px', height: '45px' }}>
                                                            <span className="fw-bold small mb-0" style={{ fontSize: '10px' }}>
                                                                {app.is_today ? 'TOD' : app.date.split(' ')[1] || '---'}
                                                            </span>
                                                            <span className="fw-bold" style={{ fontSize: '14px', marginTop: '-4px' }}>
                                                                {app.is_today ? '★' : app.date.split(' ')[0]}
                                                            </span>
                                                        </div>
                                                        <div className="d-flex flex-column">
                                                            <span className={`fw-bold small ${app.is_today ? 'text-primary' : 'text-dark'}`}>
                                                                {app.is_today ? 'Today' : app.date}
                                                            </span>
                                                            <span className="text-muted" style={{ fontSize: '11px' }}>
                                                                <i className="bi bi-clock me-1"></i>{app.time}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="d-flex flex-column">
                                                        <span className="small fw-bold text-dark">{app.client}</span>
                                                        <span className="text-muted truncate-text" style={{ fontSize: '11px', maxWidth: '180px' }}>
                                                            {app.title}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <div className="d-flex align-items-center">
                                                        <div className="avatar-xs me-2 d-flex align-items-center justify-content-center rounded-circle bg-soft-info text-info fw-bold" 
                                                             style={{ width: '28px', height: '28px', fontSize: '10px', backgroundColor: '#e0f7fa' }}>
                                                            {app.glazier ? app.glazier.split(' ').map(n => n[0]).join('') : 'UN'}
                                                        </div>
                                                        <span className="small text-dark fw-medium">{app.glazier || 'Not Assigned'}</span>
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge rounded-pill ${app.type === 'site_visit' ? 'bg-info-light text-info' : 'bg-primary-light text-primary'}`} 
                                                          style={{ padding: '5px 12px', fontSize: '10px', fontWeight: '600', letterSpacing: '0.3px', 
                                                                   backgroundColor: app.type === 'site_visit' ? '#e1f5fe' : '#e8eaf6' }}>
                                                        <i className={`bi ${app.type === 'site_visit' ? 'bi-geo-alt' : 'bi-tools'} me-1`}></i>
                                                        {app.type === 'site_visit' ? 'SITE VISIT' : 'INSTALL'}
                                                    </span>
                                                </td>
                                                <td className="text-end pe-0">
                                                    <span className={`fw-bold ${app.status === 'pending' ? 'text-warning' : 'text-success'}`} style={{ fontSize: '11px' }}>
                                                        <i className="bi bi-circle-fill me-1" style={{ fontSize: '8px' }}></i>
                                                        {app.status.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        )) : (
                                            <tr>
                                                <td colSpan="5" className="text-center py-5">
                                                    <img src="/assets/images/empty-calendar.svg" alt="" style={{ width: '50px', opacity: '0.5' }} className="mb-2" />
                                                    <p className="text-muted small">No upcoming tasks for the next 7 days.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Section */}
            <div className="row g-3">
                {/* Recent Invoices */}
                <div className="col-lg-7">
                    <div className="card border shadow-sm bg-white h-100">
                        <div className="card-body p-3">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="text-muted small fw-bold text-uppercase mb-0">Recent Invoices (DUE)</h6>
                            </div>
                            <div className="d-flex align-items-center mb-3">
                                <div style={{ width: '60%', height: '180px' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <AreaChart data={dashboardData?.chartData}>
                                            <defs>
                                                <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor={QB_COLORS.blue} stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor={QB_COLORS.blue} stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="month" hide />
                                            <YAxis hide />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="invoices" stroke={QB_COLORS.blue} fill="url(#invGrad)" strokeWidth={3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="ms-3 flex-grow-1">
                                    <h3 className="fw-bold mb-0">{recentInvoices.length}</h3>
                                    <p className="text-muted x-small mb-0">Unpaid Invoices</p>
                                </div>
                            </div>

                            {recentInvoices.map((inv, i) => (
                                <div key={i} className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-1">
                                    <span className="x-small text-muted">
                                        <i className="bi bi-receipt me-2" style={{color: QB_COLORS.blue}}></i>
                                        {inv.lead?.client_name || 'Unknown Client'} ({inv.invoice_number})
                                    </span>
                                    <div className="text-end">
                                        <span className="x-small fw-bold d-block">${inv.total_amount || '0.00'}</span>
                                        <span className="x-small text-warning" style={{fontSize: '9px'}}>{inv.status}</span>
                                    </div>
                                </div>
                            ))}
                            {recentInvoices.length === 0 && <p className="text-center text-muted small mt-2">No due invoices</p>}
                        </div>
                    </div>
                </div>

                {/* Purchase Orders */}
                <div className="col-lg-5">
                    <div className="card border shadow-sm bg-white h-100">
                        <div className="card-body p-3">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <h6 className="text-muted small fw-bold text-uppercase mb-0">Latest Purchase Orders</h6>
                            </div>
                            
                            {/* Mini Trend Chart */}
                            <div className="d-flex align-items-center mb-3">
                                <div style={{ width: '100%', height: '100px' }}> {/* Height thori kam ki hai list space ke liye */}
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={dashboardData?.chartData}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                            <XAxis dataKey="month" hide />
                                            <YAxis hide />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="po" stroke="#ed6a10" strokeWidth={2} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* PO List */}
                            <div className="mt-2">
                                {dashboardData?.latestPO?.length > 0 ? (
                                    dashboardData.latestPO.map((po, i) => (
                                        <div key={i} className="d-flex justify-content-between align-items-center mb-2 border-bottom pb-2">
                                            <div className="d-flex flex-column">
                                                <span className="small fw-bold text-dark">
                                                    {po.supplier?.name || 'Unknown Supplier'}
                                                </span>
                                                <span className="text-muted" style={{ fontSize: '10px' }}>
                                                    #{po.po_number}
                                                </span>
                                            </div>
                                            <div className="text-end">
                                                <span className="small fw-bold d-block">${po.total}</span>
                                                <span className={`badge ${po.payment_status === 'PENDING' ? 'bg-light-warning text-warning' : 'text-danger'}`} 
                                                      style={{ fontSize: '9px', padding: '2px 5px' }}>
                                                    {po.payment_status}
                                                </span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-4">
                                        <p className="text-muted small mb-0">No pending POs found</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                .x-small { font-size: 11px; }
                .card { border-radius: 12px; border: 1px solid #e5e7eb; transition: all 0.25s ease; }
                .card:hover { transform: translateY(-3px); box-shadow: 0 8px 24px rgba(0,0,0,0.06) !important; }
                .progress { background-color: #eef2f7; border-radius: 20px; }
                .stats-card-hover:hover { cursor: pointer; }
                .custom-tooltip { animation: fadeIn 0.2s ease; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
                .skeleton-loader {
                    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                    background-size: 200% 100%;
                    animation: shimmer 1.5s infinite;
                }
                @keyframes shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
            `}</style>
        </div>
    );
};

export default AdminDashboard;