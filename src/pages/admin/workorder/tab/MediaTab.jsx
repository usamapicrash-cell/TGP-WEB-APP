import React, { useState, useRef, useEffect } from 'react';
import api from '../../../../api/axios';
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
            setMediaItems(response.data);
        } catch (err) { 
            console.error("Fetch error:", err); 
        }
    };

    useEffect(() => {
        if (gjob?.media) setMediaItems(gjob.media);
        else loadMedia();
    }, [lead?.id, gjob?.id]);

    const handleUploadClick = (type) => {
        setActiveSectionType(type);
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
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

    const isPDF = (path) => path?.toLowerCase().endsWith('.pdf');

    const sections = [
        { title: "Before Work", type: "before", description: "Initial site condition", items: mediaItems.filter(m => m.work_stage === 'before') },
        { title: "During Work", type: "during", description: "Progress updates", items: mediaItems.filter(m => m.work_stage === 'during') }
    ];

    return (
        <div className="card border-0 shadow-sm p-3 p-sm-4 mb-4 animate__animated animate__fadeIn">
            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="d-none" 
                accept="image/*,.pdf" 
            />

            {sections.map((section, index) => (
                <div key={index} className="mb-4 mb-sm-5">
                    <div className="mb-3">
                        <h6 className="fw-bold mb-1 fs-6">{section.title}</h6>
                        <p className="text-muted small mb-0">{section.description}</p>
                    </div>

                    {/* Responsive Grid Layout */}
                    <div className="media-grid">
                        {/* Upload Button Tile */}
                        <div 
                            className="add-photo d-flex flex-column align-items-center justify-content-center border border-2 border-dashed rounded cursor-pointer transition-all"
                            onClick={() => !uploading && handleUploadClick(section.type)}
                            style={{ 
                                height: '110px', 
                                cursor: uploading ? 'not-allowed' : 'pointer', 
                                backgroundColor: '#fcfcfc', 
                                borderColor: '#dcdcdc' 
                            }}
                        >
                            {uploading && activeSectionType === section.type ? (
                                <div className="spinner-border spinner-border-sm text-primary"></div>
                            ) : (
                                <>
                                    <i className="bi bi-plus-circle fs-4 text-primary mb-1"></i>
                                    <span className="fw-medium text-secondary" style={{ fontSize: '11px' }}>Add Media</span>
                                </>
                            )}
                        </div>

                        {/* Media Items Tile Loop */}
                        {section.items.map((item, idx) => {
                            const fileUrl = `${STORAGE_BASE}/${item.file_path}`;
                            const isFilePdf = isPDF(item.file_path);

                            return (
                                <div 
                                    key={idx} 
                                    className="rounded bg-light d-flex align-items-center justify-content-center border overflow-hidden position-relative media-item-card shadow-sm" 
                                    style={{ height: '110px' }}
                                >
                                    {isFilePdf ? (
                                        <a 
                                            href={fileUrl} 
                                            target="_blank" 
                                            rel="noreferrer" 
                                            className="text-decoration-none text-center w-100 h-100 d-flex flex-column align-items-center justify-content-center p-2"
                                        >
                                            <i className="bi bi-file-earmark-pdf-fill text-danger fs-2 mb-1"></i>
                                            <div className="text-truncate w-100 px-1 text-dark" style={{ fontSize: '10px', fontWeight: '500' }}>
                                                PDF Document
                                            </div>
                                        </a>
                                    ) : (
                                        <img 
                                            src={fileUrl} 
                                            className="w-100 h-100 object-fit-cover" 
                                            alt="Work media" 
                                            onClick={() => { setCurrentImage(fileUrl); setOpenLightbox(true); }}
                                            style={{ cursor: 'zoom-in' }} 
                                        />
                                    )}

                                    {/* Action Hover Overlay */}
                                    <div className="media-overlay position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center gap-2">
                                        {isFilePdf ? (
                                            <a 
                                                href={fileUrl} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="btn btn-sm btn-light rounded-circle shadow p-0 d-flex align-items-center justify-content-center"
                                                style={{ width: '32px', height: '32px' }}
                                                title="Download PDF"
                                            >
                                                <i className="bi bi-download text-dark"></i>
                                            </a>
                                        ) : (
                                            <button 
                                                className="btn btn-sm btn-light rounded-circle shadow p-0 d-flex align-items-center justify-content-center"
                                                style={{ width: '32px', height: '32px' }}
                                                onClick={() => { setCurrentImage(fileUrl); setOpenLightbox(true); }}
                                                title="View Image"
                                            >
                                                <i className="bi bi-eye-fill text-dark"></i>
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Lightbox Viewer */}
            <Lightbox
                open={openLightbox}
                close={() => setOpenLightbox(false)}
                slides={[{ src: currentImage }]}
            />

            <style>{`
                .media-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(105px, 1fr));
                    gap: 12px;
                }
                @media (min-width: 576px) {
                    .media-grid {
                        grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
                        gap: 16px;
                    }
                }
                .add-photo:hover {
                    background-color: #f0f4f9 !important;
                    border-color: #0d6efd !important;
                }
                .media-item-card .media-overlay {
                    background: rgba(0, 0, 0, 0.4);
                    opacity: 0;
                    transition: opacity 0.2s ease-in-out;
                    pointer-events: none;
                }
                .media-item-card:hover .media-overlay {
                    opacity: 1;
                    pointer-events: auto;
                }
                /* Mobile Touch Friendly Always Visible Actions */
                @media (max-width: 768px) {
                    .media-item-card .media-overlay {
                        background: linear-gradient(to top, rgba(0,0,0,0.5) 0%, transparent 60%);
                        opacity: 1;
                        justify-content: flex-end;
                        align-items: flex-end;
                        padding: 4px;
                        pointer-events: auto;
                    }
                    .media-item-card .media-overlay button,
                    .media-item-card .media-overlay a {
                        width: 26px !important;
                        height: 26px !important;
                        font-size: 12px;
                    }
                }
            `}</style>
        </div>
    );
};

export default MediaTab;