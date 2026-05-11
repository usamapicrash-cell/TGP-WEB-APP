import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import api from '../../../api/axios';
import { notify } from '../../../utils/notifier';

const ConvertToJobModal = ({ show, onClose, lead, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: lead?.gjob ? lead.gjob.title : '',
        description: lead?.gjob ? lead.gjob.description : '',
        start_date: '', // Today's date
        end_date: ''
    });

   const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.post(`/leads/${lead.id}/convert-to-job`, formData);
            if (onSuccess) {
                onSuccess(res.data); 
            }
            
            onClose(); // Modal band karein
            
        } catch (err) {
            if (err.response?.status === 409) {
                notify.error("This lead has already been converted to a job!");
            } else {
                const errorMsg = err.response?.data?.message || "Failed to convert lead to job";
                notify.error(errorMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal show={show} onHide={onClose} centered size="md" className="border-0">
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold fs-5">Convert Lead to Job</Modal.Title>
            </Modal.Header>
            
            <Form onSubmit={handleSubmit}>
                <Modal.Body className="py-4">
                    <p className="text-muted small mb-4">This action will create a new Work Order for <strong>{lead?.client_name}</strong>.</p>
                    
                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold text-muted text-uppercase">Job Title</Form.Label>
                        <Form.Control 
                            type="text" 
                            required 
                            className="shadow-none border-light-subtle py-2"
                            style={{ borderRadius: '8px' }}
                            value={formData.title}
                            onChange={(e) => setFormData({...formData, title: e.target.value})}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label className="small fw-bold text-muted text-uppercase">Description</Form.Label>
                        <Form.Control 
                            as="textarea" 
                            rows={3}
                            className="shadow-none border-light-subtle"
                            style={{ borderRadius: '8px' }}
                            value={formData.description}
                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                        />
                    </Form.Group>

                    <div className="row">
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-muted text-uppercase">Start Date</Form.Label>
                                <Form.Control 
                                    type="date" 
                                    required 
                                    className="shadow-none border-light-subtle"
                                    style={{ borderRadius: '8px' }}
                                    value={formData.start_date}
                                    onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                                />
                            </Form.Group>
                        </div>
                        <div className="col-md-6">
                            <Form.Group className="mb-3">
                                <Form.Label className="small fw-bold text-muted text-uppercase">End Date (Expected)</Form.Label>
                                <Form.Control 
                                    type="date" 
                                    className="shadow-none border-light-subtle"
                                    style={{ borderRadius: '8px' }}
                                    value={formData.end_date}
                                    onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                                />
                            </Form.Group>
                        </div>
                    </div>
                </Modal.Body>
                
                <Modal.Footer className="border-0 pt-0 pb-4 justify-content-center">
                    <Button variant="light" onClick={onClose} className="px-4 fw-bold text-muted shadow-none border-0 mr-2" style={{ borderRadius: '8px' }}>
                        Cancel
                    </Button>
                    <Button 
                        type="submit" 
                        disabled={loading}
                        className="px-5 fw-bold shadow-none border-0" 
                        style={{ backgroundColor: '#2b3a67', borderRadius: '8px' }}
                    >
                        {loading ? 'Converting...' : 'Create Job'}
                    </Button>
                </Modal.Footer>
            </Form>
        </Modal>
    );
};

export default ConvertToJobModal;