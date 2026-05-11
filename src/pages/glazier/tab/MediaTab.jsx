import React, { useState, useRef, useEffect } from 'react';
import api from '../../../api/axios';
import { toast } from 'react-hot-toast';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

const MediaTab = ({ lead, onRefresh }) => {
    const [uploading, setUploading] = useState(false);
    const [mediaItems, setMediaItems] = useState([]);
    const [openLightbox, setOpenLightbox] = useState(false);
    const [currentImage, setCurrentImage] = useState("");
    const fileInputRef = useRef(null);
    const [activeSectionType, setActiveSectionType] = useState(null);

    const gjob = lead?.gjob;
    const STORAGE_BASE = import.meta.env.VITE_STORAGE_URL;

    const loadMedia = async () => {
        if (!gjob?.id) return;
        try {
            const response = await api.get(`/jobs/${gjob.id}/media`);
            console.log(response);
            setMediaItems(response.data);
        } catch (err) { console.error("Fetch error:", err); }
    };

    useEffect(() => {
        if (gjob?.media) setMediaItems(gjob.media);
        else loadMedia();
    }, [lead?.id, gjob?.id]);

    const handleUploadClick = (type) => {
        setActiveSectionType(type);
        fileInputRef.current.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file || !gjob?.id) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', activeSectionType);

        const toastId = toast.loading(`Uploading to ${activeSectionType}...`);
        setUploading(true);

        try {
            await api.post(`/jobs/${gjob.id}/media`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            toast.success("Uploaded successfully", { id: toastId });
            await loadMedia();
            if (onRefresh) onRefresh();
        } catch (err) {
            toast.error("Upload failed", { id: toastId });
        } finally {
            setUploading(false);
            e.target.value = null;
        }
    };

    // Extension check karne ke liye helper
    const isPDF = (path) => path?.toLowerCase().endsWith('.pdf');

    const sections = [
        { title: "Before Work", type: "before", description: "Initial site condition", items: mediaItems.filter(m => m.work_stage === 'before') },
        { title: "During Work", type: "during", description: "Progress updates", items: mediaItems.filter(m => m.work_stage === 'during') }
    ];

    return (
        <div className="card border-0 shadow-sm p-4 mb-4 animate__animated animate__fadeIn">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="d-none" accept="image/*,.pdf" />

            {sections.map((section, index) => (
                <div key={index} className="mb-5">
                    <div className="mb-3">
                        <h6 className="fw-bold mb-1">{section.title}</h6>
                        <p className="text-muted small mb-0">{section.description}</p>
                    </div>

                    <div className="d-flex flex-wrap gap-3">
                        {/* Upload Button */}
                        <div className="add-photo d-flex flex-column align-items-center justify-content-center border border-2 border-dashed rounded"
                            onClick={() => handleUploadClick(section.type)}
                            style={{ width: '120px', height: '120px', cursor: uploading ? 'not-allowed' : 'pointer', backgroundColor: '#fdfdfd', borderColor: '#e0e0e0' }}>
                            {uploading && activeSectionType === section.type ? <div className="spinner-border spinner-border-sm text-primary"></div> : <><i className="bi bi-plus fs-4"></i><span style={{ fontSize: '10px' }}>Add Media</span></>}
                        </div>

                        {/* Items Loop */}
                        {section.items.map((item, idx) => {
                            const fileUrl = `${STORAGE_BASE}/${item.file_path}`;
                            const isFilePdf = isPDF(item.file_path);

                            return (
                                <div key={idx} className="rounded bg-light d-flex align-items-center justify-content-center border overflow-hidden position-relative group shadow-sm" style={{ width: '120px', height: '120px' }}>
                                    {isFilePdf ? (
                                        <div className="text-center">
                                            <i className="bi bi-file-earmark-pdf text-danger fs-1"></i>
                                            <div className="small text-muted" style={{fontSize: '10px'}}>PDF Doc</div>
                                        </div>
                                    ) : (
                                        <img src={fileUrl} className="w-100 h-100 object-fit-cover" alt="work" 
                                             onClick={() => { setCurrentImage(fileUrl); setOpenLightbox(true); }}
                                             style={{cursor: 'zoom-in'}} />
                                    )}
                                    
                                    <div className="position-absolute top-0 end-0 p-1 opacity-0 group-hover-1" style={{transition: '0.2s'}}>
                                        <a href={fileUrl} target="_blank" rel="noreferrer" className="btn btn-dark btn-sm p-0 px-1 shadow">
                                            <i className={isFilePdf ? "bi bi-download" : "bi bi-eye"}></i>
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Image Viewer Lightbox */}
            <Lightbox
                open={openLightbox}
                close={() => setOpenLightbox(false)}
                slides={[{ src: currentImage }]}
            />

            <style>{`.group:hover .group-hover-1 { opacity: 1 !important; }`}</style>
        </div>
    );
};

export default MediaTab;