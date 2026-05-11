import React, { useState, useRef, useEffect } from 'react';
import { ReactSketchCanvas } from 'react-sketch-canvas';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios'; 
import { Spinner } from 'react-bootstrap';
import { toast } from 'react-hot-toast';

const GlazierDrawing = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const canvasRef = useRef(null);
    
    const [assignedJobs, setAssignedJobs] = useState([]);
    const [selectedJobId, setSelectedJobId] = useState(jobId || "");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [activeTool, setActiveTool] = useState('Pen');
    const [activeColor, setActiveColor] = useState('#212529'); // Default Black
    const [strokeWidth, setStrokeWidth] = useState(3);

    const tools = ['Panel', 'Pen', 'Dim', 'Erase'];
    const colors = ['#212529', '#0d6efd', '#198754', '#dc3545'];

    useEffect(() => {
        const fetchJobs = async () => {
            try {
                // Adjust endpoint based on your API
                const res = await api.post('/jobs/glazier/all'); 
                const jobs = res.data.jobs || res.data;
                setAssignedJobs(jobs);
                
                // Agar URL mein ID nahi hai par jobs hain, to pehli job select karlo
                if (!jobId && jobs.length > 0) {
                    // setSelectedJobId(jobs[0].id); // Optional: auto select
                }
            } catch (err) {
                console.error("Failed to fetch jobs");
            } finally {
                setLoading(false);
            }
        };
        fetchJobs();
    }, []);

    useEffect(() => {
        if (canvasRef.current) {
            canvasRef.current.eraseMode(activeTool === 'Erase');
        }
    }, [activeTool]);

    // --- SAVE LOGIC: Save to Media Table (Before Work) ---
    const handleSaveSketch = async () => {
        if (!selectedJobId) return toast.error("Please select a job first");
        
        const toastId = toast.loading("Saving sketch to Before Work...");
        setSaving(true);

        try {
            // 1. Export as Base64
            const base64Image = await canvasRef.current.exportImage("png");
            
            // 2. Convert Base64 to Blob/File (Back-end file handling ke liye)
            const res = await fetch(base64Image);
            const blob = await res.blob();
            const file = new File([blob], `sketch_${selectedJobId}_${Date.now()}.png`, { type: "image/png" });

            // 3. Prepare FormData (Matching your MediaTab logic)
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', 'before'); // Aapne kaha 'before work' me jaye

            await api.post(`/jobs/${selectedJobId}/media`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            toast.success("Sketch saved to Media successfully!", { id: toastId });
            canvasRef.current?.clearCanvas();
        } catch (error) {
            console.error("Error saving sketch", error);
            toast.error("Failed to save sketch", { id: toastId });
        } finally {
            setSaving(false);
        }
    };

    const handleJobSelect = (id) => {
        setSelectedJobId(id);
        navigate(`/glazier/drawing/${id}`, { replace: true });
    };

    if (loading) return <div className="text-center p-5"><Spinner animation="border" variant="primary" /></div>;

    return (
        <div className="container-fluid px-3 pb-5" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <div className="pt-4 mb-3">
                <h4 className="fw-bold m-0 text-dark">Site Sketcher</h4>
                <p className="text-muted small">Draw and save measurements directly to Before Work media.</p>
            </div>

            {/* --- Job Selection List (Alternative to Dropdown) --- */}
            <div className="mb-4">
                <label className="small fw-bold text-muted text-uppercase mb-2 d-block">Select Active Job</label>
                <div className="d-flex gap-2 overflow-auto pb-2 custom-scrollbar" style={{ whiteSpace: 'nowrap' }}>
                    {assignedJobs.map(job => (
                        <div 
                            key={job.id}
                            onClick={() => handleJobSelect(job.id)}
                            className={`p-2 px-3 rounded-3 border cursor-pointer transition-all ${selectedJobId == job.id ? 'bg-primary text-white border-primary shadow' : 'bg-white text-dark border-light shadow-sm'}`}
                            style={{ minWidth: '160px', cursor: 'pointer' }}
                        >
                            <div className={`small fw-bold ${selectedJobId == job.id ? 'text-white-100' : 'text-muted'}`}>
                                {job.job_number || 'JOB'}
                            </div>
                            <div className="fw-bold text-truncate" style={{ maxWidth: '140px' }}>
                                {job.lead?.client_name || job.title || 'No Name'}
                            </div>
                        </div>
                    ))}
                    {assignedJobs.length === 0 && <p className="text-muted small">No assigned jobs found.</p>}
                </div>
            </div>

            {/* Canvas implementation */}
            <div className={!selectedJobId ? "opacity-50 pointer-events-none" : "animate__animated animate__fadeIn"}>
                 {/* Tools Header */}
                 <div className="d-flex align-items-center mb-3 bg-white p-2 rounded-3 shadow-sm border">
                    <div className="d-flex flex-fill justify-content-around">
                        {tools.map(tool => (
                            <button 
                                key={tool}
                                className={`btn btn-sm flex-fill fw-bold ${activeTool === tool ? 'text-primary border-bottom border-primary border-2 rounded-0' : 'text-muted border-0'}`}
                                onClick={() => setActiveTool(tool)}
                            >
                                {tool}
                            </button>
                        ))}
                    </div>
                    <div className="border-start ps-2 ms-1 d-flex gap-1">
                        <button className="btn btn-sm text-muted border-0" onClick={() => canvasRef.current?.undo()}>
                            <i className="bi bi-arrow-counterclockwise fs-5"></i>
                        </button>
                        <button className="btn btn-sm text-danger border-0" onClick={() => canvasRef.current?.clearCanvas()}>
                            <i className="bi bi-trash fs-5"></i>
                        </button>
                    </div>
                </div>

                {/* Color & Stroke Selection */}
                <div className="d-flex justify-content-between align-items-center mb-3 px-1">
                    <div className="d-flex align-items-center gap-2">
                        <span className="text-muted small fw-bold">COLOR:</span>
                        <div className="d-flex gap-2">
                            {colors.map(c => (
                                <div key={c} onClick={() => setActiveColor(c)} style={{ width: '22px', height: '22px', backgroundColor: c, borderRadius: '50%', border: activeColor === c ? '2px solid #fff' : 'none', outline: activeColor === c ? `2px solid ${c}` : 'none', cursor: 'pointer' }} />
                            ))}
                        </div>
                    </div>
                    <div className="d-flex align-items-center gap-2">
                        <i className="bi bi-pencil-fill text-muted small"></i>
                        <input type="range" className="form-range" min="1" max="15" value={strokeWidth} onChange={(e) => setStrokeWidth(parseInt(e.target.value))} style={{ width: '80px' }} />
                    </div>
                </div>

                {/* Main Canvas Area */}
                <div className="bg-white rounded-4 border mb-4 shadow-sm overflow-hidden" style={{ height: '48vh', border: '2px solid #eee' }}>
                    <ReactSketchCanvas 
                        ref={canvasRef} 
                        strokeWidth={strokeWidth} 
                        strokeColor={activeColor} 
                        canvasColor="#ffffff" 
                        allowOnlyPointerType="all" // Touch/Pen support
                        style={{ width: '100%', height: '100%' }} 
                    />
                </div>

                <button 
                    onClick={handleSaveSketch}
                    disabled={!selectedJobId || saving}
                    className="btn w-100 py-3 fw-bold text-white shadow-lg border-0" 
                    style={{ backgroundColor: '#2b3b6c', borderRadius: '12px' }}
                >
                    {saving ? <Spinner size="sm" className="me-2" /> : <i className="bi bi-cloud-arrow-up-fill me-2"></i>}
                    Save to Before Work
                </button>
            </div>

            {!selectedJobId && (
                <div className="text-center mt-4 p-5 border rounded-4 bg-white shadow-sm border-dashed">
                    <i className="bi bi-hand-index-thumb text-primary fs-1 mb-2 d-block"></i>
                    <h6 className="fw-bold text-dark">No Job Selected</h6>
                    <p className="text-muted small">Please tap on a job card above to enable the drawing canvas.</p>
                </div>
            )}

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { height: 4px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #ddd; border-radius: 10px; }
                .cursor-pointer { cursor: pointer; }
                .transition-all { transition: all 0.2s ease-in-out; }
            `}</style>
        </div>
    );
};

export default GlazierDrawing;