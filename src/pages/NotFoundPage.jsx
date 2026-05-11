import React from 'react';
import { useNavigate } from 'react-router-dom';

const NotFoundPage = () => {
    const navigate = useNavigate();

    return (
        <div className="d-flex align-items-center justify-content-center vh-100 bg-light">
            <div className="text-center p-5 shadow-sm bg-white" style={{ borderRadius: '15px' }}>
                <h1 className="display-1 fw-bold text-primary">404</h1>
                <h3 className="fw-bold">Page Not Found</h3>
                <p className="text-muted mb-4">The URL you are looking for doesn't exist, boss.</p>
                <button 
                    onClick={() => navigate('/')} 
                    className="btn btn-primary px-4 py-2"
                    style={{ backgroundColor: 'var(--primary-blue)', border: 'none', borderRadius: '8px' }}
                >
                    Back to Home
                </button>
            </div>
        </div>
    );
};

export default NotFoundPage;