import React from 'react';

const POPreviewModal = ({ show, onClose, poData }) => {
    if (!show || !poData) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px' }}>
                    
                    {/* Header */}
                    <div className="modal-header border-bottom-0 pt-4 px-4">
                        <h5 className="modal-title fw-bold">PO Preview</h5>
                        <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                    </div>

                    {/* Document Body */}
                    <div className="modal-body px-4 py-2">
                        <div className="border rounded-3 p-4 bg-white shadow-sm">
                            <div className="d-flex justify-content-between mb-4">
                                <div>
                                    <h6 className="fw-bold text-primary mb-1">THE GLASS PEOPLE</h6>
                                    <p className="text-muted smaller mb-0">Supplier</p>
                                    {/* FIX 1: Access .name property instead of the whole object */}
                                    <p className="fw-bold small mb-0">{poData.supplier?.name || 'N/A'}</p>
                                    <p className="text-muted smaller">{poData.supplier?.email || 'No Email'}</p>
                                </div>
                                <div className="text-end">
                                    <h6 className="fw-bold mb-1">PURCHASE ORDER</h6>
                                    {/* FIX 2: Use po_number (database column name) */}
                                    <p className="fw-bold text-muted small mb-0">{poData.po_number}</p>
                                    {/* FIX 3: Use created_at or format the date */}
                                    <p className="text-muted smaller mb-0">Date: {new Date(poData.created_at).toLocaleDateString()}</p>
                                    <p className="text-muted smaller">Status: {poData.status?.toUpperCase()}</p>
                                </div>
                            </div>

                            {/* Status Badges */}
                            <div className="row g-2 mb-4">
                                <div className="col-4">
                                    <div className="bg-light p-2 rounded">
                                        <p className="text-muted smaller mb-1">ORDER STATUS</p>
                                        <span className="badge bg-success text-white small">{poData.status}</span>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="bg-light p-2 rounded ">
                                        <p className="text-muted smaller mb-1">PAYMENT</p>
                                        <span className="badge bg-warning text-dark small">{poData.payment_status}</span>
                                    </div>
                                </div>
                                <div className="col-4">
                                    <div className="bg-light p-2 rounded">
                                        <p className="text-muted smaller mb-1">TOTAL COST</p>
                                        <span className="fw-bold small">${poData.total}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Items Table */}
                            <table className="table table-sm mb-4">
                                <thead className="bg-light">
                                    <tr className="smaller text-muted fw-bold">
                                        <th className="ps-2 py-2">DESCRIPTION</th>
                                        <th className="text-center py-2">QTY</th>
                                        <th className="text-end py-2">UNIT COST</th>
                                        <th className="text-end pe-2 py-2">TOTAL</th>
                                    </tr>
                                </thead>
                                <tbody className="small">
                                    {/* FIX 4: Map through real items from database */}
                                    {poData.items && poData.items.length > 0 ? (
                                        poData.items.map((item, index) => (
                                            <tr key={index}>
                                                <td className="ps-2 py-3 fw-semibold">{item.item_name}</td>
                                                <td className="text-center py-3">{item.qty}</td>
                                                <td className="text-end py-3">${item.price}</td>
                                                <td className="text-end pe-2 py-3 fw-bold">${item.total}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan="4" className="text-center py-3 text-muted">No items found</td></tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Sketches Preview (If any) */}
                            {poData.drawing_data && poData.drawing_data.length > 0 && (
                                <div className="mt-4">
                                    <label className="text-muted fw-bold smaller mb-2">SKETCHES</label>
                                    <div className="d-flex gap-2">
                                        {poData.drawing_data.map((path, i) => (
                                            <img 
                                                key={i} 
                                                src={`${import.meta.env.VITE_STORAGE_URL}/${path}`} 
                                                alt="sketch" 
                                                style={{ width: '100px', height: '80px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #ddd' }} 
                                            />
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Attachments Preview (If any) */}
                                {poData.attachments && poData.attachments.length > 0 && (
                                    <div className="mt-4">
                                        <label className="text-muted fw-bold smaller mb-2">ATTACHMENTS</label>
                                        <div className="d-flex flex-wrap gap-2">
                                            {poData.attachments.map((path, i) => {
                                                const fileUrl = `${import.meta.env.VITE_STORAGE_URL}/${path}`;
                                                const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(path);

                                                return isImage ? (
                                                    // 📸 Image Preview
                                                    <img 
                                                        key={i}
                                                        src={fileUrl}
                                                        alt="attachment"
                                                        style={{ 
                                                            width: '100px', 
                                                            height: '80px', 
                                                            objectFit: 'cover', 
                                                            borderRadius: '8px', 
                                                            border: '1px solid #ddd' 
                                                        }}
                                                    />
                                                ) : (
                                                    // 📄 File (PDF, DOC, etc)
                                                    <a 
                                                        key={i}
                                                        href={fileUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="d-flex align-items-center gap-2 px-3 py-2 border rounded text-decoration-none small"
                                                        style={{ background: '#f8f9fa' }}
                                                    >
                                                        <i className="bi bi-paperclip"></i>
                                                        View File
                                                    </a>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                        </div>
                    </div>

                    <div className="modal-footer border-0 p-4 pt-2 d-flex justify-content-center gap-3">
                        <button className="btn btn-outline-secondary px-4 fw-bold" onClick={() => window.print()} style={{ borderRadius: '8px' }}>
                            <i className="bi bi-printer me-2"></i> Print PO
                        </button>
                       {/* <button className="btn text-white px-5 fw-bold" style={{ backgroundColor: '#2b3a67', borderRadius: '8px' }}>
                            Send To Supplier
                        </button>*/}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default POPreviewModal;