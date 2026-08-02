import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import api from '../../../../api/axios';
import { notify } from '../../../../utils/notifier';
import { toast } from 'react-hot-toast';
import StatusHandler from '../../../../components/StatusHandler';

// --- Custom QuickBooks Searchable Dropdown Component ---
const QBItemSelector = ({ value, onSelect, qbItems, onOpenCreateModal }) => {
    const [searchTerm, setSearchTerm] = useState(value?.item_name || '');
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        setSearchTerm(value?.item_name || '');
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredItems = useMemo(() => {
        if (!searchTerm) return qbItems;
        return qbItems.filter(i => i.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [qbItems, searchTerm]);

    return (
        <div className="position-relative" ref={wrapperRef}>
            <input
                type="text"
                className="form-control quote-input-custom py-2 px-3 rounded-3"
                placeholder="Search QB item..."
                value={searchTerm}
                onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                }}
                onFocus={() => setIsOpen(true)}
            />
            {isOpen && (
                <div
                    className="position-absolute start-0 top-100 w-100 bg-white shadow-lg border rounded-3 mt-1 overflow-auto custom-dropdown-menu"
                    style={{ maxHeight: '240px', zIndex: 1050, minWidth: '220px' }}
                >
                    {/* Fixed Top Option to Create New Item */}
                    <button
                        type="button"
                        className="dropdown-item py-2 px-3 text-primary fw-bold bg-light border-bottom d-flex align-items-center"
                        onClick={() => {
                            setIsOpen(false);
                            onOpenCreateModal(searchTerm);
                        }}
                    >
                        <i className="bi bi-plus-circle-fill me-2"></i>
                        + Create New QB Item
                    </button>

                    {filteredItems.length > 0 ? (
                        filteredItems.map(item => (
                            <button
                                key={item.id}
                                type="button"
                                className="dropdown-item py-2 px-3 text-wrap text-start border-bottom-subtle hover-bg-light"
                                onClick={() => {
                                    onSelect(item);
                                    setSearchTerm(item.name);
                                    setIsOpen(false);
                                }}
                            >
                                <div className="fw-semibold text-dark small">{item.name}</div>
                                {item.unit_price > 0 && <small className="text-muted d-block">${item.unit_price}</small>}
                            </button>
                        ))
                    ) : (
                        <div className="p-3 text-muted small text-center">No matching QB items</div>
                    )}
                </div>
            )}
        </div>
    );
};

// --- Side Drawer Modal Component for Creating QB Item ---
const CreateQBItemDrawer = ({ show, onClose, initialName, onSuccess }) => {
    const [formData, setFormData] = useState({ name: '', description: '', unit_price: 0 });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (show) {
            setFormData({ name: initialName || '', description: '', unit_price: 0 });
        }
    }, [show, initialName]);

    // Close on ESC key
    useEffect(() => {
        const handleEsc = (e) => {
            if (e.key === 'Escape' && show) onClose();
        };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [show, onClose]);

    if (!show) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) return notify.error("Item name is required");

        setSubmitting(true);
        const toastId = toast.loading(`Adding "${formData.name}" to QuickBooks...`);
        try {
            const res = await api.post('/quickbooks/create-item', formData);
            toast.success("Item successfully created in QuickBooks!", { id: toastId });
            onSuccess(res.data.item);
            onClose();
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to create item in QuickBooks", { id: toastId });
        } finally {
            setSubmitting(false);
        }
    };

    return ReactDOM.createPortal(
        <>
            <style>
                {`
                    .qb-drawer-backdrop {
                        position: fixed;
                        inset: 0;
                        background: rgba(15, 23, 42, 0.45);
                        z-index: 1055;
                        animation: qbFadeIn 0.15s ease-out;
                    }
                    .qb-drawer {
                        position: fixed;
                        top: 0;
                        right: 0;
                        height: 100vh;
                        width: 400px;
                        max-width: 92vw;
                        background: #fff;
                        z-index: 1060;
                        display: flex;
                        flex-direction: column;
                        animation: qbSlideIn 0.2s ease-out;
                    }
                    .qb-drawer-header {
                        display: flex;
                        align-items: center;
                        justify-content: space-between;
                        padding: 1.1rem 1.25rem;
                        border-bottom: 1px solid #eef1f5;
                        background: #fafbfc;
                    }
                    .qb-drawer-icon {
                        width: 36px;
                        height: 36px;
                        border-radius: 10px;
                        background: linear-gradient(135deg, #0d6efd, #4f8cff);
                        color: #fff;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 1rem;
                        flex-shrink: 0;
                    }
                    .qb-drawer-body {
                        padding: 1.25rem;
                        overflow-y: auto;
                    }
                    @keyframes qbFadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes qbSlideIn {
                        from { transform: translateX(100%); }
                        to { transform: translateX(0); }
                    }
                `}
            </style>

            <div className="qb-drawer-backdrop" onClick={onClose}></div>
            <div className="qb-drawer shadow-lg">
                <div className="qb-drawer-header">
                    <div className="d-flex align-items-center gap-2">
                        <div className="qb-drawer-icon">
                            <i className="bi bi-box-seam-fill"></i>
                        </div>
                        <div>
                            <h5 className="mb-0 fw-bold text-dark" style={{ fontSize: '1rem' }}>Add QuickBooks Item</h5>
                            <small className="text-muted" style={{ fontSize: '0.75rem' }}>Create a new inventory item</small>
                        </div>
                    </div>
                    <button type="button" className="btn-close" onClick={onClose} aria-label="Close"></button>
                </div>

                <form onSubmit={handleSubmit} className="qb-drawer-body">
                    <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary mb-1">
                            Item Name <span className="text-danger">*</span>
                        </label>
                        <input
                            type="text"
                            className="form-control quote-input-custom"
                            placeholder="e.g. Tempered Glass Panel"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            autoFocus
                            required
                        />
                    </div>

                    <div className="mb-3">
                        <label className="form-label small fw-semibold text-secondary mb-1">Description</label>
                        <textarea
                            className="form-control quote-input-custom"
                            rows="3"
                            placeholder="Item details, specs, etc..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="mb-4">
                        <label className="form-label small fw-semibold text-secondary mb-1">Unit Price ($)</label>
                        <div className="input-group">
                            <span className="input-group-text quote-input-custom border-end-0 bg-white text-muted">$</span>
                            <input
                                type="number"
                                step="0.01"
                                className="form-control quote-input-custom border-start-0 ps-0"
                                placeholder="0.00"
                                value={formData.unit_price}
                                onChange={(e) => setFormData({ ...formData, unit_price: parseFloat(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="d-flex gap-2 pt-3 border-top">
                        <button type="button" className="btn btn-outline-secondary flex-grow-1 py-2 fw-semibold rounded-3" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn btn-primary flex-grow-1 py-2 fw-semibold rounded-3 shadow-sm" disabled={submitting}>
                            {submitting ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                    Saving...
                                </>
                            ) : 'Save & Populate'}
                        </button>
                    </div>
                </form>
            </div>
        </>,
        document.body
    );
};

// --- Main QuoteTab Component ---
const QuoteTab = ({ leadId }) => {
    const [quoteId, setQuoteId] = useState(null);
    const [items, setItems] = useState([]);
    const [labour, setLabour] = useState(0);
    const [status, setStatus] = useState('draft');
    const [saving, setSaving] = useState(false);
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [updatingStatus, setUpdatingStatus] = useState(null);

    // QuickBooks & Drawer State
    const [qbItems, setQbItems] = useState([]);
    const [showDrawer, setShowDrawer] = useState(false);
    const [activeRowIndex, setActiveRowIndex] = useState(null);
    const [initialNameForDrawer, setInitialNameForDrawer] = useState('');

    const fetchQBInventory = async () => {
        try {
            const res = await api.get('/quickbooks/inventory');
            if (res.data.success) {
                setQbItems(res.data.items || []);
            }
        } catch (err) {
            console.error("QB Inventory fetch error", err);
        }
    };

    const subtotal = useMemo(() => {
        return items.reduce((sum, i) => sum + (parseFloat(i.qty || 0) * parseFloat(i.unit_price || 0)), 0);
    }, [items]);

    const total = useMemo(() => {
        return subtotal + parseFloat(labour || 0);
    }, [subtotal, labour]);

    const fetchQuoteData = async () => {
        if (!leadId) return;
        setLoading(true);
        try {
            const [historyRes, leadRes] = await Promise.all([
                api.get(`/leads/${leadId}/quotes`),
                api.get(`/leads/${leadId}`)
            ]);

            setHistory(historyRes.data);
            const activeQuote = leadRes.data.active_quote;

            if (activeQuote) {
                setQuoteId(activeQuote.id);
                setItems(activeQuote.items || []);
                setLabour(activeQuote.labour_total || 0);
                setStatus(activeQuote.status || 'draft');
            } else {
                resetForm();
            }
            setError(null);
        } catch (err) {
            setError(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQuoteData();
        fetchQBInventory();
    }, [leadId]);

    const handleStatusChange = async (id, newStatus) => {
        setUpdatingStatus(id);
        const toastId = toast.loading(`Updating to ${newStatus}...`);
        try {
            await api.patch(`/quotes/${id}/status`, { status: newStatus });
            toast.success(`Quote ${newStatus}`, { id: toastId });
            fetchQuoteData();
        } catch (err) {
            toast.error("Failed to update status", { id: toastId });
        } finally {
            setUpdatingStatus(null);
        }
    };

    const handleSave = async () => {
        if (items.length === 0) return notify.error("Please add at least one item");
        setSaving(true);
        try {
            const payload = {
                items,
                labour_total: labour,
                subtotal,
                total_amount: total,
                status: 'draft'
            };
            await api.post(`/leads/${leadId}/quote`, payload);
            notify.success("New Quote Version Created");
            resetForm();
            fetchQuoteData();
        } catch (err) {
            notify.error("Error saving quote");
        } finally {
            setSaving(false);
        }
    };

    const handleViewPdf = async (id) => {
        const toastId = toast.loading("Generating PDF...");
        try {
            const response = await api.get(`/quotes/${id}/pdf`, { responseType: 'blob' });
            const file = new Blob([response.data], { type: 'application/pdf' });
            const fileURL = URL.createObjectURL(file);
            window.open(fileURL);
            toast.success("PDF Opened", { id: toastId });
            setTimeout(() => URL.revokeObjectURL(fileURL), 10000);
        } catch (err) {
            toast.error("Could not generate PDF", { id: toastId });
        }
    };

    const updateItem = (idx, field, val) => {
        const updated = [...items];
        updated[idx][field] = val;
        setItems(updated);
    };

    const resetForm = () => {
        setItems([]);
        setLabour(0);
        setStatus('draft');
        setQuoteId(null);
    };

    const loadQuoteIntoEditor = (q) => {
        setQuoteId(q.id);
        setItems(q.items || []);
        setLabour(q.labour_total || 0);
        setStatus(q.status);
        notify.info(`Loaded ${q.quote_number || 'Quote'} for editing`);
    };

    const handleOpenCreateModal = (idx, currentSearchTerm) => {
        setActiveRowIndex(idx);
        setInitialNameForDrawer(currentSearchTerm);
        setShowDrawer(true);
    };

    const handleCreatedQBItem = (newItem) => {
        setQbItems(prev => [...prev, newItem]);
        if (activeRowIndex !== null && items[activeRowIndex]) {
            const updated = [...items];
            updated[activeRowIndex].item_name = newItem.name;
            updated[activeRowIndex].description = newItem.description || newItem.name;
            updated[activeRowIndex].unit_price = newItem.unit_price || 0;
            setItems(updated);
        }
    };

    return (
        <div className="row g-4">
            <style>
                {`
                    .quote-input-custom {
                        background-color: #f8fafc;
                        border: 1px solid #e2e8f0;
                        font-size: 0.9rem;
                        transition: all 0.2s ease-in-out;
                    }
                    .quote-input-custom:focus {
                        border-color: #0d6efd;
                        background-color: #ffffff;
                        box-shadow: 0 0 0 0.25rem rgba(13, 110, 253, 0.15);
                    }
                    .custom-dropdown-menu {
                        scrollbar-width: thin;
                    }
                    .table-editor-container {
                        overflow-x: visible !important;
                    }
                    .editor-card {
                        border-radius: 16px;
                    }
                `}
            </style>

            {/* Side Drawer Modal for Adding QB Item */}
            <CreateQBItemDrawer
                show={showDrawer}
                onClose={() => setShowDrawer(false)}
                initialName={initialNameForDrawer}
                onSuccess={handleCreatedQBItem}
            />

            {/* Editor Side */}
            <div className="col-12 col-lg-8">
                <div className="card border-0 shadow-sm p-3 p-sm-4 bg-white editor-card">
                    <div className="d-flex flex-wrap justify-content-between align-items-center mb-4 pb-3 border-bottom gap-2">
                        <div>
                            <h6 className="text-uppercase fw-bold text-primary mb-1" style={{ letterSpacing: '0.6px', fontSize: '0.85rem' }}>Quote Editor</h6>
                            <small className="text-muted">Create or modify pricing structure</small>
                        </div>
                        <button
                            onClick={() => setItems([...items, { item_name: '', description: '', qty: 1, unit_price: 0 }])}
                            className="btn btn-sm btn-primary rounded-pill px-3 py-2 fw-semibold d-inline-flex align-items-center shadow-sm"
                        >
                            <i className="bi bi-plus-lg me-1 fs-6"></i> ADD ITEM
                        </button>
                    </div>

                    {/* Desktop View Table */}
                    <div className="d-none d-md-block table-editor-container">
                        <table className="table table-borderless align-middle mb-0">
                            <thead>
                                <tr className="border-bottom text-muted small text-uppercase">
                                    <th style={{ width: '32%', paddingBottom: '12px' }}>QB ITEM</th>
                                    <th style={{ width: '35%', paddingBottom: '12px' }}>DESCRIPTION</th>
                                    <th className="text-center" style={{ width: '12%', paddingBottom: '12px' }}>QTY</th>
                                    <th className="text-end" style={{ width: '15%', paddingBottom: '12px' }}>PRICE ($)</th>
                                    <th style={{ width: '6%', paddingBottom: '12px' }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={idx} className="border-bottom-subtle">
                                        <td className="py-2 px-1">
                                            <QBItemSelector
                                                value={item}
                                                qbItems={qbItems}
                                                onOpenCreateModal={(searchTerm) => handleOpenCreateModal(idx, searchTerm)}
                                                onSelect={(selectedQbItem) => {
                                                    const updated = [...items];
                                                    updated[idx].item_name = selectedQbItem.name;
                                                    if (!updated[idx].description) {
                                                        updated[idx].description = selectedQbItem.description || selectedQbItem.name;
                                                    }
                                                    if (selectedQbItem.unit_price) {
                                                        updated[idx].unit_price = selectedQbItem.unit_price;
                                                    }
                                                    setItems(updated);
                                                }}
                                            />
                                        </td>
                                        <td className="py-2 px-1">
                                            <input
                                                type="text"
                                                className="form-control quote-input-custom py-2 px-3 rounded-3"
                                                placeholder="Item description details..."
                                                value={item.description}
                                                onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                            />
                                        </td>
                                        <td className="py-2 px-1">
                                            <input
                                                type="number"
                                                className="form-control quote-input-custom text-center py-2 rounded-3"
                                                value={item.qty}
                                                onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                                            />
                                        </td>
                                        <td className="py-2 px-1">
                                            <input
                                                type="number"
                                                className="form-control quote-input-custom text-end py-2 rounded-3"
                                                value={item.unit_price}
                                                onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                                            />
                                        </td>
                                        <td className="text-end py-2 ps-1">
                                            <button
                                                onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                                className="btn btn-light text-danger btn-sm p-2 rounded-circle border-0 shadow-none"
                                                title="Remove Item"
                                            >
                                                <i className="bi bi-trash fs-6"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile View Cards */}
                    <div className="d-block d-md-none">
                        {items.map((item, idx) => (
                            <div key={idx} className="p-3 border rounded-3 mb-3 bg-light-subtle position-relative shadow-sm">
                                <button
                                    onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                    className="btn btn-sm btn-light text-danger p-1 rounded-circle position-absolute top-0 end-0 mt-2 me-2"
                                >
                                    <i className="bi bi-trash fs-6"></i>
                                </button>

                                <div className="mb-3 pe-4">
                                    <label className="form-label small text-muted mb-1 fw-bold">Select QB Item</label>
                                    <QBItemSelector
                                        value={item}
                                        qbItems={qbItems}
                                        onOpenCreateModal={(searchTerm) => handleOpenCreateModal(idx, searchTerm)}
                                        onSelect={(selectedQbItem) => {
                                            const updated = [...items];
                                            updated[idx].item_name = selectedQbItem.name;
                                            if (!updated[idx].description) {
                                                updated[idx].description = selectedQbItem.description || selectedQbItem.name;
                                            }
                                            if (selectedQbItem.unit_price) {
                                                updated[idx].unit_price = selectedQbItem.unit_price;
                                            }
                                            setItems(updated);
                                        }}
                                    />
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small text-muted mb-1 fw-bold">Description</label>
                                    <input
                                        type="text"
                                        className="form-control quote-input-custom"
                                        placeholder="Description"
                                        value={item.description}
                                        onChange={(e) => updateItem(idx, 'description', e.target.value)}
                                    />
                                </div>

                                <div className="row g-2">
                                    <div className="col-6">
                                        <label className="form-label small text-muted mb-1 fw-bold">Quantity</label>
                                        <input
                                            type="number"
                                            className="form-control quote-input-custom text-center"
                                            value={item.qty}
                                            onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                                        />
                                    </div>
                                    <div className="col-6">
                                        <label className="form-label small text-muted mb-1 fw-bold">Price ($)</label>
                                        <input
                                            type="number"
                                            className="form-control quote-input-custom text-end"
                                            value={item.unit_price}
                                            onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Empty State */}
                    {items.length === 0 && (
                        <div className="text-center py-5 border rounded-3 bg-light my-2">
                            <i className="bi bi-receipt text-muted fs-1 mb-2 d-block opacity-50"></i>
                            <span className="text-muted small">No items added to this quote yet.</span>
                        </div>
                    )}

                    {/* Summary Action Footer */}
                    <div className="row mt-4 pt-3 border-top">
                        <div className="col-12 col-md-7 col-lg-6 ms-auto">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                                <span className="fw-semibold text-secondary">TOTAL</span>
                                <span className="fw-bold text-primary fs-3">${total.toLocaleString()}</span>
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-outline-secondary flex-grow-1 rounded-3 py-2 fw-semibold" onClick={resetForm}>
                                    CLEAR
                                </button>
                                <button
                                    className="btn btn-primary flex-grow-1 rounded-3 py-2 fw-semibold shadow-sm"
                                    onClick={handleSave}
                                    disabled={saving}
                                >
                                    {saving ? 'SAVING...' : 'SAVE QUOTE'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* History Sidebar */}
            <div className="col-12 col-lg-4">
                <StatusHandler loading={loading} error={error} data={history} loadingText="Loading Quote History...">
                    <div className="card border-0 rounded-4 p-3 p-sm-4 bg-white shadow-sm h-100">
                        <h6 className="text-muted mb-3 small fw-bold text-uppercase" style={{ letterSpacing: '0.6px' }}>Quote History</h6>

                        <div className="overflow-auto" style={{ maxHeight: '600px', paddingRight: '2px' }}>
                            {history.length > 0 ? history.map((q, index) => (
                                <div key={q.id} className={`p-3 border rounded-3 mb-3 bg-white ${q.status === 'rejected' ? 'opacity-75 bg-light' : 'border-light-subtle shadow-sm'}`}>
                                    <div className="d-flex justify-content-between mb-2 align-items-center">
                                        <span className="fw-bold small text-truncate" style={{ maxWidth: '120px' }}>
                                            {q.quote_number || `Quote #${q.id}`}
                                        </span>

                                        <div className="dropdown">
                                            <button
                                                className={`btn btn-sm ${index === 0 ? 'dropdown-toggle' : ''} rounded-pill px-2 py-1 border-0 ${
                                                    q.status === 'approved' ? 'bg-success text-white' :
                                                    q.status === 'sent' ? 'bg-info text-white' :
                                                    q.status === 'rejected' ? 'bg-danger text-white' : 'bg-warning text-dark'
                                                }`}
                                                type="button"
                                                data-bs-toggle={index === 0 ? "dropdown" : ""}
                                                disabled={updatingStatus === q.id || index !== 0}
                                                style={{ fontSize: '11px', fontWeight: '600', cursor: index === 0 ? 'pointer' : 'default' }}
                                            >
                                                {updatingStatus === q.id ? '...' : q.status.toUpperCase()}
                                            </button>

                                            {index === 0 && (
                                                <ul className="dropdown-menu dropdown-menu-end shadow border-0 small">
                                                    <li><button className="dropdown-item small" onClick={() => handleStatusChange(q.id, 'draft')}>Mark as Draft</button></li>
                                                    <li><button className="dropdown-item small" onClick={() => handleStatusChange(q.id, 'sent')}>Mark as Sent</button></li>
                                                    <li><button className="dropdown-item small text-success fw-bold" onClick={() => handleStatusChange(q.id, 'approved')}>Mark as Approved</button></li>
                                                    <li><hr className="dropdown-divider" /></li>
                                                    <li><button className="dropdown-item small text-danger" onClick={() => handleStatusChange(q.id, 'rejected')}>Reject Quote</button></li>
                                                </ul>
                                            )}
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center my-2">
                                        <span className="fw-bold text-primary fs-5">${parseFloat(q.total_amount).toLocaleString()}</span>
                                        <div className="btn-group shadow-sm bg-light rounded-2 border">
                                            <button onClick={() => handleViewPdf(q.id)} className="btn btn-sm btn-link text-danger p-1 px-2 border-0" title="View PDF">
                                                <i className="bi bi-file-pdf fs-6"></i>
                                            </button>
                                            {index === 0 && q.status !== 'rejected' && (
                                                <button onClick={() => loadQuoteIntoEditor(q)} className="btn btn-sm btn-link text-primary p-1 px-2 border-0" title="Edit Quote">
                                                    <i className="bi bi-pencil-square fs-6"></i>
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="d-flex justify-content-between align-items-center pt-2 border-top mt-2" style={{ fontSize: '11px' }}>
                                        <span className="text-muted">{new Date(q.created_at).toLocaleDateString()}</span>
                                        <div className="d-flex gap-2 align-items-center">
                                            {q.status === 'approved' && <i className="bi bi-patch-check-fill text-success fs-6"></i>}
                                            {index === 0 && <span className="badge bg-primary-subtle text-primary border border-primary-subtle px-2" style={{ fontSize: '9px' }}>LATEST</span>}
                                        </div>
                                    </div>
                                </div>
                            )) : (
                                <div className="text-center py-5 text-muted small">No history found</div>
                            )}
                        </div>
                    </div>
                </StatusHandler>
            </div>
        </div>
    );
};

export default QuoteTab;