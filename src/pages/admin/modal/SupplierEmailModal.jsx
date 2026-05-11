import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';

const SupplierEmailModal = ({ show, onClose, leadId, lead }) => {
    const [suppliers, setSuppliers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState('');
    const [files, setFiles] = useState([]);
    const [emailData, setEmailData] = useState({
        subject: `Pricing Inquiry: Order/Lead #${lead.order_no}`,
        message: `Hi,\n\nPlease provide pricing for the following items regarding Job #${lead.order_no}.\n\nRegards,`
    });

    useEffect(() => {
        if (show) fetchSuppliers();
    }, [show]);

    const fetchSuppliers = async () => {
        try {
            const res = await api.get('/suppliers');
            setSuppliers(res.data);
        } catch (e) { toast.error("Could not fetch suppliers"); }
    };

    const handleSend = async () => {
        if (!selectedSupplier) return toast.error("Select a supplier");
        
        // Check karein ke leadId aur message empty to nahi
        if (!leadId) return toast.error("Lead ID is missing");
        if (!emailData.message) return toast.error("Message body is required");

        setLoading(true);
        const formData = new FormData();
        const supplier = suppliers.find(s => s.id == selectedSupplier);

        // Backend validation keys ke sath match karein
        formData.append('lead_id', leadId);
        formData.append('to', supplier.email);
        formData.append('subject', emailData.subject);
        formData.append('body', emailData.message); // Ensure this is not empty

        // Files append karein
        if (files.length > 0) {
            files.forEach(f => {
                formData.append('files[]', f);
            });
        }

        try {
            const response = await api.post('/emails/send', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            toast.success("Pricing request sent successfully");
            onClose();
        } catch (e) {
            // Agar 422 error aaye to details console mein dikhayein
            if (e.response && e.response.status === 422) {
                console.log("Validation Errors:", e.response.data.errors);
                toast.error("Please fill all required fields correctly");
            } else {
                toast.error("Failed to send email");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onClose} size="lg" centered>
            <Modal.Header closeButton className="bg-light">
                <Modal.Title className="fs-6 fw-bold">Request Pricing from Supplier</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="mb-3">
                    <label className="small fw-bold">Select Supplier</label>
                    <select 
                        className="form-select shadow-none" 
                        onChange={(e) => setSelectedSupplier(e.target.value)}
                    >
                        <option value="">Choose Supplier...</option>
                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                    </select>
                </div>
                <div className="mb-3">
                    <label className="small fw-bold">Subject</label>
                    <input 
                        type="text" className="form-control shadow-none" 
                        value={emailData.subject}
                        onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                    />
                </div>
                <div className="mb-3">
                    <label className="small fw-bold">Message / Item Details</label>
                    <textarea 
                        rows="6" className="form-control shadow-none"
                        value={emailData.message}
                        onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                    ></textarea>
                </div>
                <div className="mb-3">
                    <label className="small fw-bold">Attachments</label>
                    <input 
                        type="file" multiple className="form-control shadow-none" 
                        onChange={(e) => setFiles(Array.from(e.target.files))}
                    />
                </div>
            </Modal.Body>
            <Modal.Footer>
                <button className="btn btn-light" onClick={onClose}>Cancel</button>
                <button 
                    className="btn text-white px-4" 
                    style={{backgroundColor: '#2b3a67'}}
                    onClick={handleSend}
                    disabled={loading}
                >
                    {loading ? 'Sending...' : 'Send Inquiry'}
                </button>
            </Modal.Footer>
        </Modal>
    );
};

export default SupplierEmailModal;