import React, { useState, useEffect, useMemo } from 'react';
import api from '../../../../api/axios';
import StatusHandler from '../../../../components/StatusHandler';
import ManualPaymentModal from '../../modal/ManualPaymentModal';
import HelcimLinkModal from '../../modal/HelcimLinkModal';
import HelcimIframeModal from '../../modal/HelcimIframeModal';
import { toast } from 'react-hot-toast';

const PaymentsTab = ({ leadId, leadValue }) => {
    const [isHelcimModalOpen, setIsHelcimModalOpen] = useState(false);
    const [isIframeModalOpen, setIsIframeModalOpen] = useState(false);
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
                api.get(`/leads/${leadId}`)
            ]);

            setInvoices(invoicesRes.data || []);

            const leadData = leadRes.data;
            if (leadData && leadData.value) {
                setCurrentLeadValue(leadData.value);
            } else if (leadData && leadData.data && leadData.data.value) {
                setCurrentLeadValue(leadData.data.value);
            }
            
            setError(null);
        } catch (err) {
            console.error("Error fetching data:", err);
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchInvoices(); }, [leadId]);
    useEffect(() => {
        if (leadValue) {
            setCurrentLeadValue(leadValue);
        }
    }, [leadValue]);

    // --- Calculation Logic ---
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
            } else {
                toast.error("Link not found", { id: toastId });
            }
        } catch (err) {
            toast.error("Failed to fetch link", { id: toastId });
        }
    };

    const handleViewInvoicePdf = async (id) => {
        const toastId = toast.loading("Generating Invoice PDF...");
        try {
            const response = await api.get(`/invoice/${id}/pdf`, { responseType: 'blob' });
            
            const file = new Blob([response.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            
            window.open(fileURL);
            
            toast.success("Invoice PDF Opened", { id: toastId });
            
            setTimeout(() => URL.revokeObjectURL(fileURL), 10000);
        } catch (err) {
            console.error("PDF Error:", err);
            toast.error("Could not generate Invoice PDF", { id: toastId });
        }
    };

    return (
        <div className="animate__animated animate__fadeIn px-1 px-sm-0">
            {/* Summary Cards */}
            <div className="row g-2 g-sm-3 mb-3 mb-sm-4">
                <SummaryCard title="Contract Total" amount={stats.total} color="#2b3a67" icon="bi-file-earmark-medical" type="primary" />
                <SummaryCard title="Total Collected" amount={stats.paid} color="#198754" icon="bi-cash-stack" type="success" />
                <SummaryCard title="Remaining Balance" amount={stats.balance} color="#dc3545" icon="bi-clock-history" type="danger" />
            </div>

            {/* Action Buttons */}
            <div className="row g-2 g-sm-3 mb-3 mb-sm-4">
                <div className="col-12 col-sm-6">
                    <button 
                        onClick={() => setIsHelcimModalOpen(true)} 
                        className="btn btn-primary w-100 py-2 py-sm-2 shadow-sm border-0 fw-bold d-flex align-items-center justify-content-center" 
                        style={{ backgroundColor: '#2b3a67', borderRadius: '8px', fontSize: '0.75rem', letterSpacing: '0.5px' }}
                    >
                        <i className="bi bi-send me-2"></i> SEND HELCIM PAYMENT LINK
                    </button>
                </div>

                <div className="col-12 col-sm-6">
                    <button 
                        onClick={() => setIsModalOpen(true)} 
                        className="btn btn-outline-dark w-100 py-2 py-sm-2 fw-bold d-flex align-items-center justify-content-center" 
                        style={{ borderRadius: '8px', fontSize: '0.75rem', letterSpacing: '0.5px' }}
                    >
                        <i className="bi bi-plus-circle me-2"></i> RECORD MANUAL PAYMENT
                    </button>
                </div>
            </div>

            {/* Invoices Table */}
            <StatusHandler loading={loading} error={error} data={invoices}>
                <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: '12px', overflow: 'hidden' }}>
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0 text-nowrap">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-3 ps-sm-4 text-muted small fw-bold bg-transparent">INVOICE #</th>
                                    <th className="text-muted small fw-bold bg-transparent">STATUS</th>
                                    <th className="text-muted small fw-bold bg-transparent">AMOUNT</th>
                                    <th className="text-muted small fw-bold bg-transparent">PAID</th>
                                    <th className="text-muted small fw-bold bg-transparent">DATE</th>
                                    <th className="text-end pe-3 pe-sm-4 text-muted small fw-bold bg-transparent">ACTIONS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {invoices.length > 0 ? invoices.map((inv) => (
                                    <tr key={inv.id}>
                                        <td className="ps-3 ps-sm-4 fw-bold text-dark">{inv.invoice_number}</td>
                                        <td>
                                            <span className={`badge rounded-pill px-2 px-sm-3 py-1 ${
                                                inv.status === 'PAID' ? 'text-success bg-success-subtle' : 
                                                inv.status === 'PARTIAL' ? 'text-warning bg-warning-subtle' : 'text-danger bg-danger-subtle'
                                            }`} style={{ fontSize: '10px' }}>
                                                {inv.status}
                                            </span>
                                        </td>
                                        <td className="fw-semibold">${parseFloat(inv.total_amount).toLocaleString()}</td>
                                        <td className="text-success fw-medium">${parseFloat(inv.paid_amount).toLocaleString()}</td>
                                        <td className="text-muted small">{new Date(inv.created_at).toLocaleDateString()}</td>
                                        <td className="text-end pe-3 pe-sm-4">
                                            {/* 1. VIEW & PDF ACTION */}
                                            <button 
                                                onClick={() => handleViewInvoicePdf(inv.id)}
                                                className="btn btn-light btn-sm rounded-circle me-1 me-sm-2 text-danger border-0" 
                                                title="Download PDF"
                                                style={{ width: '32px', height: '32px' }}
                                            >
                                                <i className="bi bi-file-earmark-pdf"></i>
                                            </button>

                                            {/* 2. SMART RESEND (Only for Helcim & Unpaid) */}
                                            {(inv.status === 'DUE') && (
                                                <button 
                                                    onClick={() => handleResendLink(inv.id)}
                                                    className="btn btn-light btn-sm rounded-circle text-primary border-0" 
                                                    title="Resend Helcim Link"
                                                    style={{ width: '32px', height: '32px' }}
                                                >
                                                    <i className="bi bi-arrow-clockwise"></i>
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr>
                                        <td colSpan="6" className="text-center py-4 py-sm-5">
                                            <i className="bi bi-receipt text-muted opacity-25" style={{ fontSize: '2.5rem' }}></i>
                                            <p className="text-muted small mt-2 mb-0">No invoices have been generated for this lead yet.</p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </StatusHandler>

            {/* Modals */}
            <HelcimLinkModal 
                isOpen={isHelcimModalOpen}
                onClose={() => setIsHelcimModalOpen(false)}
                leadId={leadId}
                remainingBalance={stats.balance}
                onSuccess={fetchInvoices}
            />

            <HelcimIframeModal 
                isOpen={isIframeModalOpen}
                onClose={() => setIsIframeModalOpen(false)}
                leadId={leadId}
                remainingBalance={stats.balance}
                onSuccess={fetchInvoices}
            />

            <ManualPaymentModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                leadId={leadId}
                onPaymentSuccess={fetchInvoices} 
            />
        </div>
    );
};

// --- Reusable Summary Card ---
const SummaryCard = ({ title, amount, color, icon, type }) => (
    <div className="col-12 col-sm-4">
        <div className="card border-0 shadow-sm p-3 h-100" style={{ borderRadius: '12px', borderLeft: `5px solid ${color}` }}>
            <div className="d-flex justify-content-between align-items-center align-items-sm-start">
                <div>
                    <label className="text-muted small fw-bold mb-1" style={{ fontSize: '0.65rem', letterSpacing: '0.5px' }}>
                        {title.toUpperCase()}
                    </label>
                    <h4 className={`fw-bold mb-0 text-${type} fs-4 fs-sm-3`} style={{ letterSpacing: '-0.5px' }}>
                        ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h4>
                </div>
                <div className={`bg-${type}-subtle rounded-3 p-2 text-${type} d-flex align-items-center justify-content-center flex-shrink-0`} style={{ width: '38px', height: '38px' }}>
                    <i className={`bi ${icon}`} style={{ fontSize: '1.1rem' }}></i>
                </div>
            </div>
        </div>
    </div>
);

export default PaymentsTab;