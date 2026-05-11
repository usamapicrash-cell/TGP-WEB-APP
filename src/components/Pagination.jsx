import React from 'react';

const Pagination = ({ pagination, currentPage, onPageChange }) => {
    // Hide if no pagination needed
    if (!pagination || pagination.last_page <= 1) return null;

    const handlePageClick = (newPage) => {
        // STRICT GUARD: Prevent loading if page is out of bounds or same as current
        if (newPage < 1 || newPage > pagination.last_page || newPage === currentPage) {
            return;
        }
        onPageChange(newPage);
    };

    return (
        <div className="d-flex justify-content-between align-items-center mt-4 px-3 py-2 bg-white rounded-4 shadow-sm">
            {/* Left Side: Dynamic Info */}
            <div className="text-muted small">
                Showing <span className="text-dark fw-bold">{pagination.from}-{pagination.to}</span> of <span className="text-dark fw-bold">{pagination.total}</span>
            </div>

            {/* Right Side: Modern Pill Navigation */}
            <nav>
                <div className="d-flex gap-2 align-items-center">
                    {/* Previous Button */}
                    <button 
                        className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center ${currentPage === 1 ? 'opacity-25' : 'shadow-sm'}`}
                        style={{ width: '32px', height: '32px', backgroundColor: '#f8f9fa', border: 'none', color: 'var(--primary-blue)' }}
                        onClick={() => handlePageClick(currentPage - 1)}
                        disabled={currentPage === 1}
                    >
                        <i className="bi bi-chevron-left"></i>
                    </button>

                    {/* Numbered Pills */}
                    <div className="d-flex gap-1 bg-light p-1 rounded-pill">
                        {[...Array(pagination.last_page)].map((_, index) => {
                            const pageNum = index + 1;
                            const isActive = currentPage === pageNum;

                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => handlePageClick(pageNum)}
                                    className="btn btn-sm rounded-pill border-0 fw-bold transition-all"
                                    style={{
                                        minWidth: '32px',
                                        height: '28px',
                                        fontSize: '0.75rem',
                                        backgroundColor: isActive ? 'var(--primary-blue)' : 'transparent',
                                        color: isActive ? '#fff' : '#6c757d',
                                        boxShadow: isActive ? '0 4px 10px rgba(0,0,0,0.15)' : 'none'
                                    }}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                    </div>

                    {/* Next Button */}
                    <button 
                        className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center ${currentPage === pagination.last_page ? 'opacity-25' : 'shadow-sm'}`}
                        style={{ width: '32px', height: '32px', backgroundColor: '#f8f9fa', border: 'none', color: 'var(--primary-blue)' }}
                        onClick={() => handlePageClick(currentPage + 1)}
                        disabled={currentPage === pagination.last_page}
                    >
                        <i className="bi bi-chevron-right"></i>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default Pagination;