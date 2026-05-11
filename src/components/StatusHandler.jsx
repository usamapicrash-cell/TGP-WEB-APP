import React from 'react';

/**
 * A reusable wrapper to handle loading and empty states
 */
const StatusHandler = ({ loading, error, data, children, loadingText = "Loading Details..." }) => {
    if (loading) {
        return (
            <div className="p-5 text-center">
                <div className="spinner-border text-primary spinner-border-sm me-2" role="status"></div>
                <span className="text-muted small fw-medium">{loadingText}</span>
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="p-5 text-center">
                <div className="bg-light d-inline-block p-3 rounded-circle mb-3">
                    <i className="bi bi-exclamation-circle text-danger fs-4"></i>
                </div>
                <h6 className="text-dark fw-bold">Data Not Found</h6>
                <p className="text-muted small mx-auto" style={{ maxWidth: '250px' }}>
                    We couldn't find the information you're looking for. It might have been moved or deleted.
                </p>
            </div>
        );
    }

    return <>{children}</>;
};

export default StatusHandler;