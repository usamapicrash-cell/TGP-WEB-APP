// src/pages/executive/Dashboard.jsx
import React from 'react';

const ExecutiveDashboard = () => {
    return (
        <div className="container mt-4">
            <div className="row">
                <div className="col-12">
                    <div className="card shadow-sm p-4">
                        <h1>Executive Dashboard</h1>
                        <p>Welcome back! Here is your business overview.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// THIS IS THE MISSING LINE THAT IS CAUSING THE BLANK PAGE:
export default ExecutiveDashboard;