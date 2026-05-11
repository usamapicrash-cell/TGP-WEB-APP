import React from 'react';
import { Modal } from 'react-bootstrap';

const InvoicePreviewModal = ({ show, onClose, invoiceData }) => {
    if (!invoiceData) return null;

    const data = {
        poNumber: invoiceData.po_number || "N/A",
        supplier: invoiceData.supplier?.name || "N/A",
        supplierEmail: invoiceData.supplier?.email || "N/A",
        receiver: invoiceData.lead?.client_name || "N/A", 
        address: invoiceData.lead?.address || "N/A",
        receiverPhone: invoiceData.lead?.phone || "N/A",
        notes: invoiceData.notes || "No extra notes.",
        status: invoiceData.status || "Pending",
        date: invoiceData.created_at ? new Date(invoiceData.created_at).toLocaleDateString() : "N/A",
        totalAmount: `$${parseFloat(invoiceData.total || 0).toLocaleString()}`,
        items: invoiceData.items || [] 
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <>
            {/* Inline CSS for Print Styling */}
            <style>
                {`
                @media print {
                    /* Poori body aur background components hide karo */
                    body * {
                        visibility: hidden;
                    }
                    /* Sirf Modal aur uske bachon ko show karo */
                    .modal-content, .modal-content * {
                        visibility: visible;
                    }
                    /* Modal ko page ke top left par set karo */
                    .modal-content {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                        border: none !important;
                        box-shadow: none !important;
                    }
                    /* Buttons ko print se hide karo */
                    .d-print-none {
                        display: none !important;
                    }
                    /* Modal ke overlay/backdrop ko hide karo */
                    .modal-backdrop {
                        display: none !important;
                    }
                    /* Screen par jo scrollbars ya extra margin hai unhe fix karo */
                    body {
                        background: none !important;
                        padding: 0 !important;
                        margin: 0 !important;
                    }
                }
                `}
            </style>

            <Modal show={show} onHide={onClose} centered size="lg" className="invoice-modal">
                <Modal.Body className="p-5" id="printable-invoice">
                    {/* Header */}
                    <div className="d-flex justify-content-between align-items-start mb-4">
                        <div>
                            <h4 className="fw-bold mb-0 text-uppercase" style={{ letterSpacing: '1px' }}>Invoice</h4>
                            <p className="text-muted small">PO Number: <span className="text-dark fw-semibold">{data.poNumber}</span></p>
                        </div>
                        <div className="text-end d-print-none">
                            <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                        </div>
                    </div>

                    <hr />

                    {/* Info Section */}
                    <div className="row g-4 mb-5" style={{ fontSize: '0.95rem' }}>
                        <div className="col-6">
                            <p className="mb-2 fw-bold text-muted text-uppercase small">From:</p>
                            <h6 className="fw-bold mb-1">{data.supplier}</h6>
                            <p className="mb-1 text-muted">{data.supplierEmail}</p>
                        </div>
                        <div className="col-6 text-end">
                            <p className="mb-2 fw-bold text-muted text-uppercase small">Ship To:</p>
                            <h6 className="fw-bold mb-1">{data.receiver}</h6>
                            <p className="mb-1 text-muted small">{data.address}</p>
                            <p className="mb-0 text-muted small">{data.receiverPhone}</p>
                        </div>
                    </div>

                    {/* Items Table */}
                    <div className="table-responsive mb-4">
                        <table className="table table-bordered align-middle">
                            <thead className="bg-light">
                                <tr className="small text-uppercase fw-bold">
                                    <th className="" style={{ width: '50%' }}>Item Description</th>
                                    <th className=" text-center">Qty</th>
                                    <th className=" text-center">Price</th>
                                    <th className=" text-end">Total</th>
                                </tr>
                            </thead>
                            <tbody style={{ fontSize: '0.9rem' }}>
                                {data.items.length > 0 ? (
                                    data.items.map((item, index) => (
                                        <tr key={index}>
                                            <td className="">
                                                <div className="fw-bold">{item.item_name || 'Product Item'}</div>
                                            </td>
                                            <td className="text-center">{item.qty || 1}</td>
                                            <td className="text-center">${parseFloat(item.price || 0).toLocaleString()}</td>
                                            <td className="text-end fw-bold">${parseFloat(item.subtotal || item.price || 0).toLocaleString()}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td className="">
                                            <div className="fw-bold">General Procurement</div>
                                            <small className="text-muted">{data.notes}</small>
                                        </td>
                                        <td className="text-center">1</td>
                                        <td className="text-center">{data.totalAmount}</td>
                                        <td className="text-end fw-bold">{data.totalAmount}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Totals & Notes */}
                    <div className="row g-3 mb-4">
                        <div className="col-7">
                            <div className="p-3 rounded-3 bg-light" style={{ fontSize: '0.9rem' }}>
                                <p className="fw-bold mb-1 text-uppercase small text-muted">Notes:</p>
                                <p className="mb-0 text-dark">{data.notes}</p>
                            </div>
                        </div>
                        <div className="col-5">
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Status:</span>
                                <span className="text-success fw-bold">{data.status.toUpperCase()}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Date:</span>
                                <span className="fw-semibold">{data.date}</span>
                            </div>
                            <div className="d-flex justify-content-between border-top pt-2">
                                <span className="fw-bold h5">Total:</span>
                                <span className="fw-bold h5 text-primary">{data.totalAmount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Print Button */}
                    <div className="d-print-none pt-3 border-top">
                        <button 
                            className="btn btn-primary w-100 fw-bold py-2 shadow-sm" 
                            onClick={handlePrint}
                            style={{ backgroundColor: '#2b3a67', border: 'none' }}
                        >
                            <i className="bi bi-printer me-2"></i> PRINT INVOICE
                        </button>
                    </div>
                </Modal.Body>
            </Modal>
        </>
    );
};

export default InvoicePreviewModal;