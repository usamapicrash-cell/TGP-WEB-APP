import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../api/axios';
import StatusHandler from '../../../components/StatusHandler';
import ManualPaymentModal from '../../admin/modal/ManualPaymentModal';
import HelcimLinkModal from '../../admin/modal/HelcimLinkModal';
import { toast } from 'react-hot-toast';

const PaymentsTab = ({ leadId, leadValue }) => {
    const [isHelcimModalOpen, setIsHelcimModalOpen] = useState(false);
    const [invoices, setInvoices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentLeadValue, setCurrentLeadValue] = useState(leadValue || 0);

    const fetchInvoices = async () => {
        if (!leadId) return;
        setLoading(true);
        try {
            const [invoicesRes, leadRes] = await Promise.all([
                api.get(`/leads/${leadId}/invoices`),
                api.get(`/lead/${leadId}`)
            ]);
            setInvoices(invoicesRes.data || []);
            const leadData = leadRes.data;
            if (leadData && leadData.value) {
                setCurrentLeadValue(leadData.value);
            }
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInvoices(); }, [leadId]);

    const stats = useMemo(() => {
        const totalContract = parseFloat(currentLeadValue || 0);
        const totalPaid = invoices.reduce((acc, inv) => acc + parseFloat(inv.paid_amount || 0), 0);
        return {
            total: totalContract,
            paid: totalPaid,
            balance: Math.max(0, totalContract - totalPaid)
        };
    }, [invoices, currentLeadValue]);

    const handleResendLink = async (id) => {
        const toastId = toast.loading("Fetching payment link...");
        try {
            const { data } = await api.post(`/invoice/${id}/resend-link`);
            if (data.checkout_url) {
                window.open(data.checkout_url, '_blank');
                toast.success("Payment link opened!", { id: toastId });
            }
        } catch (err) {
            toast.error("Failed to fetch link", { id: toastId });
        }
    };

    const handleViewInvoicePdf = async (id) => {
        const toastId = toast.loading("Opening PDF...");
        try {
            const response = await api.get(`/invoice/${id}/pdf`, { responseType: 'blob' });
            const file = new Blob([response.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            window.open(fileURL);
            toast.success("Invoice PDF Opened", { id: toastId });
            setTimeout(() => URL.revokeObjectURL(fileURL), 10000);
        } catch (err) {
            toast.error("Could not generate PDF", { id: toastId });
        }
    };

    return (
        <div className="animate__animated animate__fadeIn">
            {/* Summary Cards - Mobile optimized spacing */}
            <div className="row g-2 g-md-3 mb-4">
                <SummaryCard title="Contract" amount={stats.total} color="#2b3a67" icon="bi-file-earmark-text" type="primary" />
                <SummaryCard title="Collected" amount={stats.paid} color="#198754" icon="bi-cash-stack" type="success" />
                <SummaryCard title="Balance" amount={stats.balance} color="#dc3545" icon="bi-clock-history" type="danger" />
            </div>

            {/* Action Buttons - Stacked on mobile */}
            <div className="row g-2 mb-4">
                <div className="col-12 col-md-6">
                    <button onClick={() => setIsHelcimModalOpen(true)} className="btn btn-primary w-100 py-3 shadow-sm border-0 fw-bold d-flex align-items-center justify-content-center" 
                        style={{ backgroundColor: '#2b3a67', borderRadius: '12px', fontSize: '0.7rem' }}>
                        <i className="bi bi-send-fill me-2"></i> SEND HELCIM LINK
                    </button>
                </div>
                <div className="col-12 col-md-6">
                    <button onClick={() => setIsModalOpen(true)} className="btn btn-outline-dark w-100 py-3 fw-bold d-flex align-items-center justify-content-center" 
                        style={{ borderRadius: '12px', fontSize: '0.7rem' }}>
                        <i className="bi bi-plus-circle-fill me-2"></i> RECORD MANUAL
                    </button>
                </div>
            </div>

            {/* Invoices Section */}
            <StatusHandler loading={loading} error={error} data={invoices}>
                <div className="mb-4">
                    <h6 className="fw-bold mb-3 d-md-block d-none">Recent Invoices</h6>
                    
                    {/* Desktop Table View */}
                    <div className="card border-0 shadow-sm d-none d-md-block" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        <th className="ps-4 text-muted small fw-bold bg-transparent">INVOICE #</th>
                                        <th className="text-muted small fw-bold bg-transparent">STATUS</th>
                                        <th className="text-muted small fw-bold bg-transparent">AMOUNT</th>
                                        <th className="text-muted small fw-bold bg-transparent">PAID</th>
                                        <th className="text-end pe-4 text-muted small fw-bold bg-transparent">ACTIONS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {invoices.map((inv) => (
                                        <tr key={inv.id}>
                                            <td className="ps-4 fw-bold">{inv.invoice_number}</td>
                                            <td><Badge status={inv.status} /></td>
                                            <td className="fw-semibold">${parseFloat(inv.total_amount).toLocaleString()}</td>
                                            <td className="text-success fw-medium">${parseFloat(inv.paid_amount).toLocaleString()}</td>
                                            <td className="text-end pe-4">
                                                <ActionButtons inv={inv} onPdf={handleViewInvoicePdf} onResend={handleResendLink} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Mobile Card View - Behtreen for Glazier/Mobile users */}
                    <div className="d-md-none">
                        {invoices.length > 0 ? invoices.map((inv) => (
                            <div key={inv.id} className="card border-0 shadow-sm mb-3 p-3" style={{ borderRadius: '15px' }}>
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="fw-bold text-dark">{inv.invoice_number}</span>
                                    <Badge status={inv.status} />
                                </div>
                                <div className="d-flex justify-content-between mb-3">
                                    <div>
                                        <small className="text-muted d-block small-label">AMOUNT</small>
                                        <span className="fw-bold">${parseFloat(inv.total_amount).toLocaleString()}</span>
                                    </div>
                                    <div className="text-end">
                                        <small className="text-muted d-block small-label">PAID</small>
                                        <span className="text-success fw-bold">${parseFloat(inv.paid_amount).toLocaleString()}</span>
                                    </div>
                                </div>
                                <div className="d-flex justify-content-between align-items-center pt-2 border-top">
                                    <small className="text-muted">{new Date(inv.created_at).toLocaleDateString()}</small>
                                    <div className="d-flex">
                                        <ActionButtons inv={inv} onPdf={handleViewInvoicePdf} onResend={handleResendLink} mobile />
                                    </div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-5 bg-white rounded-4 shadow-sm">
                                <i className="bi bi-receipt text-muted opacity-25" style={{ fontSize: '2rem' }}></i>
                                <p className="text-muted small mt-2">No invoices yet.</p>
                            </div>
                        )}
                    </div>
                </div>
            </StatusHandler>

            <HelcimLinkModal isOpen={isHelcimModalOpen} onClose={() => setIsHelcimModalOpen(false)} leadId={leadId} remainingBalance={stats.balance} onSuccess={fetchInvoices} />
            <ManualPaymentModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} leadId={leadId} onPaymentSuccess={fetchInvoices} />
        </div>
    );
};

// --- Sub-Components for Clean Code ---

const Badge = ({ status }) => (
    <span className={`badge rounded-pill px-3 py-1 ${
        status === 'PAID' ? 'text-success bg-success-subtle' : 
        status === 'PARTIAL' ? 'text-warning bg-warning-subtle' : 'text-danger bg-danger-subtle'
    }`} style={{ fontSize: '9px', fontWeight: '800' }}>
        {status}
    </span>
);

const ActionButtons = ({ inv, onPdf, onResend, mobile = false }) => (
    <>
        <button onClick={() => onPdf(inv.id)} className={`btn btn-light rounded-circle me-2 text-danger border-0 ${mobile ? 'p-2' : 'btn-sm'}`} title="PDF">
            <i className="bi bi-file-earmark-pdf-fill"></i>
        </button>
        {inv.status !== 'PAID' && (
            <button onClick={() => onResend(inv.id)} className={`btn btn-light rounded-circle text-primary border-0 ${mobile ? 'p-2' : 'btn-sm'}`} title="Resend Link">
                <i className="bi bi-arrow-repeat"></i>
            </button>
        )}
    </>
);

const SummaryCard = ({ title, amount, color, icon, type }) => (
    <div className="col-4 col-md-4">
        <div className="card border-0 shadow-sm p-2 p-md-3 h-100 text-center text-md-start" style={{ borderRadius: '12px', borderBottom: `4px solid ${color}` }}>
            <div className="d-md-flex justify-content-between align-items-center">
                <div className="mb-2 mb-md-0">
                    <label className="text-muted fw-bold d-block mb-1" style={{ fontSize: '0.55rem', letterSpacing: '0.5px' }}>{title.toUpperCase()}</label>
                    <h6 className={`fw-bold mb-0 text-${type}`} style={{ fontSize: '0.9rem' }}>
                        ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </h6>
                </div>
                <div className={`d-none d-md-flex bg-${type}-subtle rounded-3 p-2 text-${type} align-items-center justify-content-center`} style={{ width: '35px', height: '35px' }}>
                    <i className={`bi ${icon}`} style={{ fontSize: '1rem' }}></i>
                </div>
            </div>
        </div>
    </div>
);

export default PaymentsTab;