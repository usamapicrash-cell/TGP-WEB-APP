import React, { useState, useEffect, useRef } from 'react';
import api from '../../../api/axios';
import { alert, notify } from '../../../utils/notifier';

const CreateLeadModal = ({ show, onClose, onLeadCreated }) => {
    const [loading, setLoading] = useState(false);
    const [leadTypes, setLeadTypes] = useState([]);
    const [sameAddress, setSameAddress] = useState(false);
    
    // Refs for Google Autocomplete
    const addressInputRef = useRef(null);
    const jobAddressInputRef = useRef(null);
    const GOOGLE_API_KEY = "AIzaSyApsT1aMOwmUMM2aHhr5MDfHYLk6b9mAhM";

    // Initial State
    const initialFormState = {
        client_name: '',
        company: '',
        phone: '',
        email: '',
        address: '',
        job_address: '',
        source: 'Website',
        type: '', // lead_type_id
        value: '', 
        status: 'lead'
    };

    const [formData, setFormData] = useState(initialFormState);

    // Google Maps Autocomplete Logic
    useEffect(() => {
        if (!show) return;

        const loadGoogleMaps = () => {
            if (window.google) {
                initAutocomplete();
                return;
            }
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_API_KEY}&libraries=places`;
            script.async = true;
            script.onload = () => initAutocomplete();
            document.body.appendChild(script);
        };

        const initAutocomplete = () => {
            if (!addressInputRef.current) return;

            const options = { types: ['address'] };
            
            const autocompleteAddr = new window.google.maps.places.Autocomplete(addressInputRef.current, options);
            autocompleteAddr.addListener('place_changed', () => {
                const place = autocompleteAddr.getPlace();
                const value = place.formatted_address || place.name;
                setFormData(prev => {
                    const newState = { ...prev, address: value };
                    if (sameAddress) newState.job_address = value;
                    return newState;
                });
            });

            const autocompleteJob = new window.google.maps.places.Autocomplete(jobAddressInputRef.current, options);
            autocompleteJob.addListener('place_changed', () => {
                const place = autocompleteJob.getPlace();
                const value = place.formatted_address || place.name;
                setFormData(prev => ({ ...prev, job_address: value }));
            });
        };

        loadGoogleMaps();
    }, [show, sameAddress]);

    useEffect(() => {
        if (show) {
            api.get('/lead-types').then(res => {
                const types = res.data;
                setLeadTypes(types);
                if (types.length > 0 && !formData.type) {
                    setFormData(prev => ({ ...prev, type: types[0].id }));
                }
            }).catch(err => {
                console.error("Error fetching types", err);
                notify.error("Could not load lead types.");
            });
        }
    }, [show]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newState = { ...prev, [name]: value };
            if (sameAddress && name === 'address') newState.job_address = value;
            return newState;
        });
    };

    const handleSameAddressToggle = (e) => {
        const checked = e.target.checked;
        setSameAddress(checked);
        if (checked) setFormData(prev => ({ ...prev, job_address: prev.address }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const submissionData = {
            client_name: formData.client_name,
            phone: formData.phone,
            company: formData.company || null,
            email: formData.email || null,
            address: formData.address || null,
            job_address: formData.job_address || null,
            source: formData.source,
            type: formData.type || null, 
            value: formData.value === '' ? null : formData.value,
            status: 'lead'
        };

        try {
            await api.post('/leads', submissionData);
            notify.success('Lead created successfully! 🎉');
            setFormData(initialFormState);
            setSameAddress(false);
            onLeadCreated(); 
            onClose();
        } catch (err) {
            console.error("Submission Error:", err.response?.data);
            const serverMessage = err.response?.data?.message;
            const validationErrors = err.response?.data?.errors 
                ? Object.values(err.response.data.errors).flat().join('\n') 
                : '';

            alert.error(
                "Submission Failed", 
                validationErrors || serverMessage || "Could not save the lead."
            );
        } finally {
            setLoading(false);
        }
    };

    if (!show) return null;

    return (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <style>{`
                .pac-container { z-index: 10000 !important; }
            `}</style>
            <div className="modal-dialog modal-lg modal-dialog-centered">
                <form onSubmit={handleSubmit} className="modal-content border-0 shadow-lg" style={{ borderRadius: '15px', overflow: 'hidden' }}>
                    
                    <div className="modal-header bg-white border-bottom p-4">
                        <div>
                            <h5 className="modal-title fw-bold">Create New Lead</h5>
                            <p className="text-muted small mb-0">Capture details before converting to a job</p>
                        </div>
                        <button type="button" className="btn-close shadow-none" onClick={onClose}></button>
                    </div>

                    <div className="modal-body p-4" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                        
                        <h6 className="fw-bold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '1px', color: '#34497e' }}>BASIC INFORMATION</h6>
                        <div className="row g-3 mb-4">
                            <div className="col-md-6">
                                <label className="form-label small fw-bold">Full Name *</label>
                                <input required name="client_name" value={formData.client_name} onChange={handleChange} type="text" className="form-control bg-light border-0 py-2 shadow-none" placeholder="e.g John Doe" style={{ fontSize: '0.85rem' }} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold">Company (Optional)</label>
                                <input name="company" value={formData.company} onChange={handleChange} type="text" className="form-control bg-light border-0 py-2 shadow-none" placeholder="Company Name" style={{ fontSize: '0.85rem' }} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold">Phone Number *</label>
                                <input required name="phone" value={formData.phone} onChange={handleChange} type="text" className="form-control bg-light border-0 py-2 shadow-none" placeholder="(000) 999-0000" style={{ fontSize: '0.85rem' }} />
                            </div>
                            <div className="col-md-6">
                                <label className="form-label small fw-bold">Email Address</label>
                                <input name="email" value={formData.email} onChange={handleChange} type="email" className="form-control bg-light border-0 py-2 shadow-none" placeholder="doe@example.com" style={{ fontSize: '0.85rem' }} />
                            </div>
                            <div className="col-md-12">
                                <label className="form-label small fw-bold">Estimated Quote Value ($)</label>
                                <input name="value" value={formData.value} onChange={handleChange} type="number" className="form-control bg-light border-0 py-2 shadow-none" placeholder="Leave empty if unknown" style={{ fontSize: '0.85rem' }} />
                            </div>
                        </div>

                        <h6 className="fw-bold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '1px', color: '#34497e' }}>ADDRESS INFORMATION</h6>
                        <div className="mb-4">
                            <label className="form-label small fw-bold">Primary Address</label>
                            <input 
                                ref={addressInputRef}
                                name="address" 
                                value={formData.address} 
                                onChange={handleChange} 
                                type="text" 
                                className="form-control bg-light border-0 py-2 shadow-none mb-3" 
                                placeholder="Street, City, Zip" 
                                style={{ fontSize: '0.85rem' }} 
                            />
                            
                            <div className="form-check mb-3">
                                <input className="form-check-input shadow-none" type="checkbox" id="sameAddress" checked={sameAddress} onChange={handleSameAddressToggle} />
                                <label className="form-check-label small text-muted" htmlFor="sameAddress">Job Site is the same as Primary Address</label>
                            </div>

                            <label className="form-label small fw-bold">Job Site Address</label>
                            <input 
                                ref={jobAddressInputRef}
                                name="job_address" 
                                value={formData.job_address} 
                                onChange={handleChange} 
                                disabled={sameAddress} 
                                type="text" 
                                className="form-control bg-light border-0 py-2 shadow-none" 
                                placeholder="Actual Work Location" 
                                style={{ fontSize: '0.85rem' }} 
                            />
                        </div>

                        <h6 className="fw-bold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '1px', color: '#34497e' }}>LEAD SOURCE</h6>
                        <div className="d-flex flex-wrap gap-3 mb-4">
                            {['Website', 'Call', 'Email', 'Manual'].map(src => (
                                <div className="form-check" key={src}>
                                    <input className="form-check-input shadow-none" type="radio" name="source" id={src} value={src} checked={formData.source === src} onChange={handleChange} />
                                    <label className="form-check-label small text-muted" htmlFor={src}>{src}</label>
                                </div>
                            ))}
                        </div>

                        <h6 className="fw-bold mb-3" style={{ fontSize: '0.75rem', letterSpacing: '1px', color: '#34497e' }}>WORK TYPES</h6>
                        <div className="d-flex flex-wrap gap-3">
                            {leadTypes.length > 0 ? leadTypes.map(type => (
                                <div className="form-check" key={type.id}>
                                    <input className="form-check-input shadow-none" type="radio" name="type" id={`type-${type.id}`} value={type.id} checked={formData.type == type.id} onChange={handleChange} />
                                    <label className="form-check-label small text-muted" htmlFor={`type-${type.id}`}>{type.name}</label>
                                </div>
                            )) : <p className="text-muted small">No types defined. Go to "Project Types" to add some.</p>}
                        </div>
                    </div>

                    <div className="modal-footer border-0 p-4 pt-0">
                        <button type="button" className="btn btn-light px-4 py-2 fw-semibold" onClick={onClose} style={{ borderRadius: '8px' }}>Cancel</button>
                        <button type="submit" disabled={loading} className="btn text-white px-4 py-2 fw-semibold" style={{ backgroundColor: '#34497e', border: 'none', borderRadius: '8px' }}>
                            {loading ? 'Saving...' : 'Save Lead'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateLeadModal;