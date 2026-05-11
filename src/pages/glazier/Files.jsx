import React, { useState } from 'react';

const Styles = `
 .sticky-top {
    top: 60px !important;
    }

`;

const GlazierFiles = () => {
    const [activeTab, setActiveTab] = useState('All');
    const tabs = ['All', 'Blueprints', 'Photos', 'Manual'];

    return (
         <div className="container-fluid px-3 pb-5" style={{ backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
            <div className="pt-4 mb-4 px-1">
                <h4 className="fw-bold m-0">Shared & Assets</h4>
                <p className="text-muted small">Project Documents</p>
            </div>
            <style>{Styles}</style>

            {/* Header */}
            <div className="p-3 bg-white shadow-sm sticky-top">

                {/* Search Bar */}
                <div className="mt-3 position-relative">
                    <input 
                        type="text" 
                        className="form-control border-0 bg-light py-2 ps-5 rounded-3" 
                        placeholder="Search folders or projects..." 
                    />
                </div>

                {/* Tabs */}
                <div className="d-flex mt-3 border-bottom pb-1">
                    {tabs.map(tab => (
                        <button 
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`btn btn-sm fw-bold border-0 flex-fill ${activeTab === tab ? 'text-dark border-bottom border-dark border-2 rounded-0' : 'text-muted'}`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            <div className="mt-4">
                {/* Standards & Manuals Section */}
                <h6 className="text-muted mb-3" style={{ fontSize: '13px' }}>Standards & Manuals</h6>
                
                <div className="bg-white rounded-3 p-3 mb-2 shadow-sm d-flex align-items-center border">
                    <div className="rounded p-2 bg-light d-flex align-items-center justify-content-center me-3" style={{ width: '45px', height: '45px' }}>
                        <i className="bi bi-shield-check fs-4" style={{ color: '#34497e' }}></i>
                    </div>
                    <div className="flex-fill">
                        <div className="fw-bold" style={{ fontSize: '14px' }}>Safety & Standards</div>
                        <div className="text-muted" style={{ fontSize: '12px' }}>Global Documentation</div>
                    </div>
                </div>

                <div className="bg-white rounded-3 p-3 mb-2 shadow-sm d-flex align-items-center border">
                    <div className="rounded p-2 bg-light d-flex align-items-center justify-content-center me-3" style={{ width: '45px', height: '45px' }}>
                        <i className="bi bi-book fs-4" style={{ color: '#34497e' }}></i>
                    </div>
                    <div className="flex-fill">
                        <div className="fw-bold" style={{ fontSize: '14px' }}>Training Material</div>
                        <div className="text-muted" style={{ fontSize: '12px' }}>Team Training & Video</div>
                    </div>
                </div>

                {/* File Example (from Shared & Assets image) */}
                <div className="bg-white rounded-3 p-3 mb-4 shadow-sm d-flex align-items-center border">
                    <div className="rounded p-2 bg-light d-flex align-items-center justify-content-center me-3" style={{ width: '45px', height: '45px' }}>
                        <i className="bi bi-shield text-muted fs-4"></i>
                    </div>
                    <div className="flex-fill">
                        <div className="fw-bold" style={{ fontSize: '14px' }}>Installation_Notes.pdf</div>
                        <div className="text-muted" style={{ fontSize: '12px' }}>0.5 MB • Oct 21</div>
                    </div>
                    <div className="d-flex gap-2 text-muted">
                        <button className="btn btn-link p-0 text-muted"><i className="bi bi-download"></i></button>
                        <button className="btn btn-link p-0 text-muted"><i className="bi bi-share"></i></button>
                    </div>
                </div>

                {/* Job Specific Folders Section */}
                <h6 className="text-muted mb-3" style={{ fontSize: '13px' }}>Job Specific Folders</h6>
                
                <div className="bg-white rounded-3 p-3 mb-2 shadow-sm d-flex align-items-center border position-relative">
                    <div className="rounded p-2 bg-light d-flex align-items-center justify-content-center me-3" style={{ width: '45px', height: '45px' }}>
                        <i className="bi bi-folder-fill fs-4" style={{ color: '#34497e' }}></i>
                    </div>
                    <div className="flex-fill">
                        <div className="fw-bold" style={{ fontSize: '14px' }}>Storefront Replacement</div>
                        <div className="text-muted" style={{ fontSize: '12px' }}>JB-1001</div>
                    </div>
                    <span className="badge bg-light text-primary border position-absolute top-50 end-0 translate-middle-y me-3" style={{ fontSize: '10px' }}>IN-PROGRESS</span>
                </div>
            </div>
        </div>
    );
};

export default GlazierFiles;