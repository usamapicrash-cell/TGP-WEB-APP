import React, { useState, useRef, useEffect } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';

const CreatePOModal = ({ show, onClose, lead, leadId, onSuccess, editingPO }) => {
    const canvasRef = useRef(null);
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Form States
    const [supplierId, setSupplierId] = useState('');
    const [notes, setNotes] = useState('');
    const [items, setItems] = useState([{ description: '', quantity: 1, cost: 0 }]);
    
    // --- NEW STATES FOR EMAIL ---
    const [sendEmail, setSendEmail] = useState(false);
    const [emailSubject, setEmailSubject] = useState('');
    const [emailBody, setEmailBody] = useState('');

    // Canvas & Files States
    const [strokeColor, setStrokeColor] = useState("#2b3a67");
    const [strokeWidth, setStrokeWidth] = useState(4);
    const [drawings, setDrawings] = useState([]); 
    const [manualFiles, setManualFiles] = useState([]); 

    // --- EXISTING FILES STATES ---
    const [existingDrawings, setExistingDrawings] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]);
    const [deletedFiles, setDeletedFiles] = useState([]);

    // --- AUTO-GENERATE EMAIL TEMPLATE ---
    // --- AUTO-GENERATE EMAIL TEMPLATE ---
    useEffect(() => {
        if (sendEmail) {
            const selectedSupplier = suppliers.find(s => s.id == supplierId);
            
            // Define the subject line
            setEmailSubject(`Purchase Order for Lead #${lead?.order_no || 'N/A'}`);

            // Construct the body text
            const itemsText = items
                .map(i => `• ${i.description || 'No Description'} (Qty: ${i.quantity})`)
                .join('\n');

            const supplierNotesSection = notes 
                ? `Special Instructions/Notes:\n${notes}\n\n` 
                : '';

            const body = 
                `Good Afternoon ${selectedSupplier ? selectedSupplier.name : 'Supplier'},\n\n` +
                `Please find the purchase order attached for our upcoming project.\n\n` +
                `Items Summary:\n` +
                `${itemsText}\n\n` +
                `Total Amount: $${calculateGrandTotal()}\n\n` +
                `${supplierNotesSection}` +
                `Please let us know if you have any questions.\n\n` +
                `Best regards,\n` +
                `The Glass People`;

            setEmailBody(body);
        }
    }, [sendEmail, supplierId, items, suppliers, notes]); // Added 'notes' to dependency array

    const handleDirectDelete = async (path, type) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this file permanently?");
        if (!confirmDelete) return;

        try {
            setLoading(true);
            await api.delete(`/purchase-orders/delete-file`, {
                data: { 
                    po_id: editingPO.id,
                    file_path: path,
                    type: type 
                }
            });

            if (type === 'drawing') {
                setExistingDrawings(prev => prev.filter(p => p !== path));
            } else {
                setExistingAttachments(prev => prev.filter(p => p !== path));
            }
            
            toast.success("File deleted successfully");
        } catch (error) {
            console.error("Delete Error:", error);
            toast.error("Failed to delete file");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (show) {
            fetchSuppliers();
            if (editingPO) {
                setSupplierId(editingPO.supplier_id || '');
                setNotes(editingPO.notes || '');
                if (editingPO.items && editingPO.items.length > 0) {
                    setItems(editingPO.items.map(item => ({
                        description: item.item_name, 
                        quantity: item.qty,
                        cost: item.price || item.cost || 0 
                    })));
                }
                setExistingDrawings(editingPO.drawing_data || []);
                setExistingAttachments(editingPO.attachments || []);
                setDrawings([]); 
                setManualFiles([]); 
            } else {
                setSupplierId('');
                setNotes('');
                setItems([{ description: '', quantity: 1, cost: 0 }]);
                setDrawings([]);
                setManualFiles([]);
                setExistingDrawings([]);
                setExistingAttachments([]);
                setSendEmail(false);
            }
        }
    }, [show, editingPO]);

    const calculateGrandTotal = () => {
        return items.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.cost)), 0).toFixed(2);
    };

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/suppliers');
            setSuppliers(res.data);
        } catch (err) { console.error("Error fetching suppliers"); }
    };

    const handleSaveSketch = async () => {
        const image = await canvasRef.current.exportImage("png");
        setDrawings([...drawings, image]);
        canvasRef.current.clearCanvas();
        toast.success("Sketch added to list");
    };

    const handleFileChange = (e) => {
        const selectedFiles = Array.from(e.target.files);
        setManualFiles(selectedFiles); 
    };

    const handleActionPO = async () => {
        if (!supplierId) return toast.error("Please select a supplier");
        setLoading(true);
        
        try {
            const formData = new FormData();
            formData.append('lead_id', leadId);
            formData.append('supplier_id', supplierId);
            formData.append('notes', notes);
            formData.append('items', JSON.stringify(items));
            formData.append('grand_total', calculateGrandTotal());
            
            // --- ADD EMAIL DATA TO API ---
            formData.append('send_email', sendEmail ? 1 : 0);
            if (sendEmail) {
                formData.append('email_subject', emailSubject);
                formData.append('email_body', emailBody);
            }

            if (editingPO) {
                formData.append('_method', 'PATCH');
            }

            for (let i = 0; i < drawings.length; i++) {
                const res = await fetch(drawings[i]);
                const blob = await res.blob();
                formData.append('drawings[]', blob, `sketch_${i}.png`);
            }

            manualFiles.forEach((file) => {
                formData.append('attachments[]', file);
            });

            const url = editingPO ? `/purchase-orders/${editingPO.id}/update` : '/purchase-orders';

            await api.post(url, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success(editingPO ? "PO Updated Successfully!" : "PO Created Successfully!");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Full Error:", error.response?.data);
            toast.error(error.response?.data?.message || "Error processing PO");
        } finally { setLoading(false); }
    };

    if (!show) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <div className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                    
                    <div className="modal-header bg-white border-bottom p-4">
                        <div>
                            <h5 className="modal-title fw-bold">
                                {editingPO ? `Edit Purchase Order #${editingPO.po_number}` : 'Create New Purchase Order'}
                            </h5>
                            <p className="text-muted small mb-0">Fill details and sketches</p>
                        </div>
                        <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        {/* Supplier Section */}
                        <div className="mb-4">
                            <label className="form-label small fw-bold">Supplier *</label>
                            <select className="form-control bg-light border-0 py-2 shadow-none" 
                                value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
                                <option value="">Select Supplier</option>
                                {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                         {/* EXISTING ATTACHMENTS SECTION */}
                        {editingPO && (existingDrawings.length > 0 || existingAttachments.length > 0) && (
                            <div className="mb-4 p-3 border rounded-3 bg-light">
                                <h6 className="fw-bold small mb-2 text-primary">CURRENT ATTACHMENTS</h6>
                                <div className="d-flex gap-2 flex-wrap">
                                    {existingDrawings.map((path, i) => (
                                        <div key={`ex-d-${i}`} className="position-relative border bg-white rounded p-1">
                                            <img 
                                                src={`${import.meta.env.VITE_STORAGE_URL}/${path}`} 
                                                alt="sketch" 
                                                style={{ height: '50px', width: '70px', objectFit: 'contain' }} 
                                            />
                                            <span className="badge bg-info position-absolute bottom-0 start-0" style={{fontSize: '8px'}}>Sketch</span>
                                            <span onClick={() => handleDirectDelete(path, 'drawing')} 
                                              className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" 
                                              style={{ cursor: 'pointer', fontSize: '12px' }}>×</span>
                                        </div>
                                    ))}
                                    {existingAttachments.map((path, i) => {
                                        const fileUrl = `${import.meta.env.VITE_STORAGE_URL}/${path}`;
                                        const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(path);

                                        return isImage ? (
                                            <div key={`ex-f-${i}`} className="position-relative border bg-white rounded p-1 shadow-sm">
                                                <img 
                                                    src={fileUrl} 
                                                    alt="attachment" 
                                                    style={{ height: '50px', width: '70px', objectFit: 'cover' }} 
                                                />
                                                <span className="badge bg-success position-absolute bottom-0 start-0" style={{fontSize: '8px'}}>File</span>
                                                <span onClick={() => handleDirectDelete(path, 'attachment')} 
                                                  className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" 
                                                  style={{ cursor: 'pointer', fontSize: '12px' }}>×</span>
                                            </div>
                                        ) : (
                                            <a key={`ex-f-${i}`} href={fileUrl} target="_blank" rel="noopener noreferrer" className="p-2 border bg-white rounded small d-flex align-items-center text-decoration-none shadow-sm">
                                                <i className="bi bi-paperclip me-1"></i> View File
                                            </a>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Items Table */}
                        <h6 className="fw-bold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '1px', color: '#2b3a67' }}>PURCHASE ITEMS</h6>
                        <div className="border rounded-3 overflow-hidden mb-4 shadow-sm">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr style={{ fontSize: '0.75rem' }}>
                                        <th className="ps-3 py-2">Description</th>
                                        <th style={{ width: '100px' }}>Qty</th>
                                        <th style={{ width: '120px' }}>Unit Cost</th>
                                        <th style={{ width: '100px' }}>Total</th>
                                        <th style={{ width: '40px' }}></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, index) => (
                                        <tr key={index} className="border-top">
                                            <td className="ps-3">
                                                <input type="text" className="form-control form-control-sm border-0 bg-transparent shadow-none" 
                                                    placeholder="Item description..." 
                                                    value={item.description} 
                                                    onChange={(e) => { const newItems = [...items]; newItems[index].description = e.target.value; setItems(newItems); }} 
                                                />
                                            </td>
                                            <td>
                                                <input type="number" className="form-control form-control-sm border-0 bg-light text-center fw-bold shadow-none" 
                                                    value={item.quantity} 
                                                    onChange={(e) => { const newItems = [...items]; newItems[index].quantity = e.target.value; setItems(newItems); }} 
                                                />
                                            </td>
                                            <td>
                                                <input type="number" className="form-control form-control-sm border-0 bg-light text-center fw-bold shadow-none" 
                                                    placeholder="0.00"
                                                    value={item.cost} 
                                                    onChange={(e) => { const newItems = [...items]; newItems[index].cost = e.target.value; setItems(newItems); }} 
                                                />
                                            </td>
                                            <td className="text-center fw-bold small">
                                                ${(Number(item.quantity) * Number(item.cost)).toFixed(2)}
                                            </td>
                                            <td>
                                                <button type="button" className="btn btn-link btn-sm text-danger shadow-none" 
                                                    onClick={() => setItems(items.filter((_, i) => i !== index))}>
                                                    <i className="bi bi-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <div className="p-3 border-top bg-light d-flex justify-content-between align-items-center">
                                <button type="button" className="btn btn-link btn-sm fw-bold text-decoration-none shadow-none p-0" 
                                    onClick={() => setItems([...items, { description: '', quantity: 1, cost: 0 }])}>
                                    <i className="bi bi-plus-circle me-1"></i> ADD ITEM
                                </button>
                                <div className="fw-bold text-dark">
                                    Grand Total: <span className="text-primary ms-2" style={{fontSize: '1.1rem'}}>${calculateGrandTotal()}</span>
                                </div>
                            </div>
                        </div>

                        {/* SITE SKETCH SECTION */}
                        <h6 className="fw-bold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '1px', color: '#2b3a67' }}>SITE SKETCH MODE</h6>
                        <div className="border rounded-3 overflow-hidden bg-white shadow-sm mb-2">
                            <div className="d-flex align-items-center justify-content-between p-2 border-bottom bg-light">
                                <div className="d-flex align-items-center gap-3">
                                    <div className="d-flex align-items-center gap-2">
                                        {['#2b3a67', '#198754', '#dc3545', '#000000'].map(c => (
                                            <div key={c} onClick={() => setStrokeColor(c)} style={{ width: '18px', height: '18px', backgroundColor: c, borderRadius: '50%', cursor: 'pointer', border: strokeColor === c ? '2px solid #fff' : 'none', outline: strokeColor === c ? '1px solid #2b3a67' : 'none' }} />
                                        ))}
                                    </div>
                                    <input type="range" className="form-range" min="1" max="10" value={strokeWidth} onChange={(e) => setStrokeWidth(parseInt(e.target.value))} style={{ width: '70px' }} />
                                </div>
                                <div className="d-flex gap-1">
                                    <button type="button" onClick={() => canvasRef.current.undo()} className="btn btn-outline-secondary btn-sm border-0"><i className="bi bi-arrow-counterclockwise"></i></button>
                                    <button type="button" onClick={() => canvasRef.current.clearCanvas()} className="btn btn-outline-danger btn-sm border-0"><i className="bi bi-trash"></i></button>
                                    <button type="button" onClick={handleSaveSketch} className="btn btn-primary btn-sm ms-2 fw-bold" style={{ fontSize: '0.65rem' }}>ADD SKETCH</button>
                                </div>
                            </div>
                            <div style={{ height: '250px' }}>
                                <ReactSketchCanvas ref={canvasRef} strokeWidth={strokeWidth} strokeColor={strokeColor} canvasColor="#ffffff" style={{ border: 'none' }} />
                            </div>
                        </div>

                        {/* SKETCHES PREVIEW */}
                        {drawings.length > 0 && (
                            <div className="mb-4">
                                <label className="form-label smaller fw-bold text-muted">NEW SKETCHES TO ADD</label>
                                <div className="d-flex gap-2 flex-wrap border rounded p-2 bg-light shadow-inner">
                                    {drawings.map((src, i) => (
                                        <div key={i} className="position-relative border bg-white rounded p-1 shadow-sm">
                                            <img src={src} alt="sketch" style={{ height: '50px', width: '70px', objectFit: 'contain' }} />
                                            <span onClick={() => setDrawings(drawings.filter((_, idx) => idx !== i))} className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style={{ cursor: 'pointer', fontSize: '10px' }}>×</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* MANUAL FILE UPLOAD */}
                        <div className="mb-4">
                            <label className="form-label small fw-bold">Upload Files (Manual)</label>
                            <input type="file" multiple className="form-control form-control-sm bg-light border-0 shadow-none" onChange={handleFileChange} />
                            {manualFiles.length > 0 && <p className="smaller text-success mt-1 fw-bold">{manualFiles.length} files selected.</p>}
                        </div>

                        <div className="mb-2 mt-4">
                            <label className="form-label small fw-bold">Notes To Supplier</label>
                            <textarea className="form-control bg-light border-0 shadow-none" rows="2" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions..."></textarea>
                        </div>

                        {/* --- NEW EMAIL SECTION --- */}
                        <div className="mb-3 mt-4 p-3 border rounded-3 bg-light">
                            <div className="form-check form-switch d-flex align-items-center gap-2">
                                <input 
                                    className="form-check-input shadow-none" 
                                    type="checkbox" 
                                    id="sendEmailCheck"
                                    checked={sendEmail}
                                    onChange={(e) => setSendEmail(e.target.checked)}
                                    style={{ cursor: 'pointer', width: '40px', height: '20px' }}
                                />
                                <label className="form-check-label small fw-bold mt-1" htmlFor="sendEmailCheck" style={{ cursor: 'pointer' }}>
                                    SEND EMAIL TO SUPPLIER
                                </label>
                            </div>

                            {sendEmail && (
                                <div className="mt-3 animate__animated animate__fadeIn">
                                    <div className="bg-white border rounded shadow-sm overflow-hidden">
                                        <div className="p-2 border-bottom bg-light">
                                            <input 
                                                type="text" 
                                                className="form-control form-control-sm border-0 bg-transparent fw-bold shadow-none"
                                                placeholder="Subject"
                                                value={emailSubject}
                                                onChange={(e) => setEmailSubject(e.target.value)}
                                            />
                                        </div>
                                        <textarea 
                                            className="form-control border-0 shadow-none p-3 small" 
                                            rows="8"
                                            style={{ resize: 'none', fontSize: '13px', lineHeight: '1.6' }}
                                            value={emailBody}
                                            onChange={(e) => setEmailBody(e.target.value)}
                                        ></textarea>
                                        <div className="p-2 bordesubr-top bg-light text-muted smaller">
                                            <i className="bi bi-paperclip me-1"></i> 
                                            Purchase Order PDF and sketches will be automatically attached.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="modal-footer border-0 p-4 pt-0">
                        <button type="button" className="btn btn-light px-4 py-2 fw-semibold" onClick={onClose} style={{ borderRadius: '8px' }}>Cancel</button>
                        <button type="button" className="btn text-white px-4 py-2 fw-semibold" style={{ backgroundColor: '#2b3a67', borderRadius: '8px' }} onClick={handleActionPO} disabled={loading}>
                            {loading ? (editingPO ? 'Updating...' : 'Creating...') : (editingPO ? 'Update Purchase Order' : 'Create Purchase Order')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreatePOModal;