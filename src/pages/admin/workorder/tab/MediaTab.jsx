import React, { useState, useRef, useEffect } from 'react';
import api from '../../../../api/axios';
import { toast } from 'react-hot-toast';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

const MediaTab = ({ lead, onRefresh }) => {
    const [uploading, setUploading] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [mediaItems, setMediaItems] = useState([]);
    const [openLightbox, setOpenLightbox] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const [lightboxSlides, setLightboxSlides] = useState([]);
    const [openDropdown, setOpenDropdown] = useState(null);
    
    const fileInputRef = useRef(null);
    const [activeSectionType, setActiveSectionType] = useState(null);

    const gjob = lead?.gjob;
    const STORAGE_BASE = import.meta.env.VITE_STORAGE_URL;

    useEffect(() => {
        const handleClickOutside = () => setOpenDropdown(null);
        document.addEventListener('click', handleClickOutside);
        return () => document.removeEventListener('click', handleClickOutside);
    }, []);

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

    const handleDeleteMedia = async (mediaId) => {
        if (!window.confirm("Are you sure you want to delete this media item?")) return;

        const toastId = toast.loading("Deleting file...");
        setDeletingId(mediaId);

        try {
            await api.delete(`/jobs/${gjob.id}/media/${mediaId}`);
            toast.success("Deleted successfully", { id: toastId });
            await loadMedia();
            if (onRefresh) onRefresh();
        } catch (err) {
            toast.error("Failed to delete media", { id: toastId });
        } finally {
            setDeletingId(null);
        }
    };

    // Direct Blob-based Download Handler (No Route/API Required)
    const handleDirectDownload = async (e, fileUrl, filePath) => {
        e.preventDefault();
        e.stopPropagation();
        
        const toastId = toast.loading("Starting download...");

        try {
            const response = await fetch(fileUrl);
            if (!response.ok) throw new Error("Network response was not ok");
            
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            
            // File Name Extraction
            const fileName = filePath ? filePath.split('/').pop() : 'downloaded-media';
            
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = fileName;
            document.body.appendChild(link);
            link.click();
            
            // Clean up resources
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
            
            toast.success("Downloaded successfully", { id: toastId });
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Download failed, opening in new tab", { id: toastId });
            window.open(fileUrl, '_blank');
        }
    };

    const handleOpenLightbox = (items, currentPath) => {
        const imageSlides = items
            .filter(item => !isPDF(item.file_path))
            .map(item => ({ src: `${STORAGE_BASE}/${item.file_path}` }));

        const targetIndex = imageSlides.findIndex(slide => slide.src.endsWith(currentPath));
        setLightboxSlides(imageSlides);
        setLightboxIndex(targetIndex !== -1 ? targetIndex : 0);
        setOpenLightbox(true);
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

                    <div className="media-grid">
                        {/* Upload Tile */}
                        <div 
                            className="add-photo d-flex flex-column align-items-center justify-content-center border border-2 border-dashed cursor-pointer transition-all rounded-3"
                            onClick={() => !uploading && handleUploadClick(section.type)}
                            style={{ 
                                cursor: uploading ? 'not-allowed' : 'pointer', 
                                backgroundColor: '#f9fafb', 
                                borderColor: '#d1d5db' 
                            }}
                        >
                            {uploading && activeSectionType === section.type ? (
                                <div className="spinner-border text-primary" style={{ width: '1.5rem', height: '1.5rem' }}></div>
                            ) : (
                                <>
                                    <i className="bi bi-cloud-arrow-up fs-2 text-primary mb-1"></i>
                                    <span className="fw-medium text-secondary" style={{ fontSize: '12px' }}>Upload Media</span>
                                </>
                            )}
                        </div>

                        {/* Media Items Tile */}
                        {section.items.map((item) => {
                            const fileUrl = `${STORAGE_BASE}/${item.file_path}`;
                            const isFilePdf = isPDF(item.file_path);
                            const isDeletingThis = deletingId === item.id;
                            const isMenuOpen = openDropdown === item.id;

                            return (
                                <div 
                                    key={item.id} 
                                    className="media-item-card bg-light border position-relative shadow-sm rounded-3"
                                >
                                    {isDeletingThis && (
                                        <div className="position-absolute top-0 start-0 w-100 h-100 bg-white bg-opacity-75 d-flex align-items-center justify-content-center z-3 rounded-3">
                                            <div className="spinner-border text-danger" style={{ width: '1.5rem', height: '1.5rem' }}></div>
                                        </div>
                                    )}

                                    {/* Content Container */}
                                    <div className="w-100 h-100 rounded-3 overflow-hidden">
                                        {isFilePdf ? (
                                            <a 
                                                href={fileUrl} 
                                                target="_blank" 
                                                rel="noreferrer" 
                                                className="text-decoration-none text-center w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3"
                                            >
                                                <i className="bi bi-file-earmark-pdf-fill text-danger mb-2" style={{ fontSize: '2.5rem' }}></i>
                                                <div className="text-truncate w-100 px-2 text-dark" style={{ fontSize: '12px', fontWeight: '500' }}>
                                                    PDF Document
                                                </div>
                                            </a>
                                        ) : (
                                            <img 
                                                src={fileUrl} 
                                                className="w-100 h-100 object-fit-cover" 
                                                alt="Work media" 
                                                onClick={() => handleOpenLightbox(section.items, item.file_path)}
                                                style={{ cursor: 'zoom-in' }} 
                                            />
                                        )}
                                    </div>

                                    {/* 3-Dots Action Button & Dropdown */}
                                    <div className="position-absolute top-0 end-0 m-2" style={{ zIndex: 10 }}>
                                        <button 
                                            type="button"
                                            className="btn btn-sm rounded-circle shadow-sm d-flex align-items-center justify-content-center menu-action-btn"
                                            style={{ width: '28px', height: '28px' }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenDropdown(isMenuOpen ? null : item.id);
                                            }}
                                        >
                                            <i className="bi bi-three-dots-vertical text-dark fs-7"></i>
                                        </button>

                                        {/* Dynamic Clean Dropdown */}
                                        {isMenuOpen && (
                                            <div 
                                                className="custom-dropdown shadow border rounded-2 bg-white position-absolute end-0 mt-1 overflow-hidden animate__animated animate__fadeIn animate__faster" 
                                                style={{ width: '130px', zIndex: 20 }}
                                            >
                                                {!isFilePdf ? (
                                                    <button 
                                                        type="button"
                                                        className="dropdown-item-btn text-dark"
                                                        onClick={(e) => { e.stopPropagation(); handleOpenLightbox(section.items, item.file_path); setOpenDropdown(null); }}
                                                    >
                                                        <i className="bi bi-arrows-fullscreen me-2 text-muted"></i> View
                                                    </button>
                                                ) : (
                                                    <a 
                                                        href={fileUrl} 
                                                        target="_blank" 
                                                        rel="noreferrer" 
                                                        className="dropdown-item-btn text-dark text-decoration-none"
                                                        onClick={(e) => { e.stopPropagation(); setOpenDropdown(null); }}
                                                    >
                                                        <i className="bi bi-box-arrow-up-right me-2 text-muted"></i> View PDF
                                                    </a>
                                                )}
                                                
                                                {/* Direct Download Action Button */}
                                                <button 
                                                    type="button"
                                                    className="dropdown-item-btn text-dark"
                                                    onClick={(e) => {
                                                        handleDirectDownload(e, fileUrl, item.file_path);
                                                        setOpenDropdown(null);
                                                    }}
                                                >
                                                    <i className="bi bi-download me-2 text-muted"></i> Download
                                                </button>
                                                
                                                <div className="border-top my-0"></div>
                                                
                                                <button 
                                                    type="button"
                                                    className="dropdown-item-btn text-danger"
                                                    onClick={(e) => { e.stopPropagation(); handleDeleteMedia(item.id); setOpenDropdown(null); }}
                                                >
                                                    <i className="bi bi-trash me-2 text-danger"></i> Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}

            <Lightbox
                open={openLightbox}
                close={() => setOpenLightbox(false)}
                index={lightboxIndex}
                slides={lightboxSlides}
            />

            <style>{`
                .media-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
                    gap: 16px;
                }
                .media-item-card, .add-photo {
                    height: 130px;
                }
                @media (min-width: 576px) {
                    .media-grid {
                        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
                        gap: 20px;
                    }
                    .media-item-card, .add-photo {
                        height: 150px;
                    }
                }
                .add-photo:hover {
                    background-color: #f0f4f9 !important;
                    border-color: #0d6efd !important;
                }
                .menu-action-btn {
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(4px);
                    transition: all 0.2s ease;
                    border: 1px solid rgba(0,0,0,0.08);
                }
                .menu-action-btn:hover {
                    background: #ffffff;
                    transform: scale(1.05);
                }
                .custom-dropdown {
                    box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
                }
                .custom-dropdown .dropdown-item-btn {
                    display: flex;
                    align-items: center;
                    padding: 8px 12px;
                    background: transparent;
                    border: none;
                    font-size: 12px;
                    font-weight: 500;
                    text-align: left;
                    width: 100%;
                    transition: background 0.15s ease;
                    cursor: pointer;
                }
                .custom-dropdown .dropdown-item-btn:hover {
                    background-color: #f8f9fa;
                }
            `}</style>
        </div>
    );
};

export default MediaTab;