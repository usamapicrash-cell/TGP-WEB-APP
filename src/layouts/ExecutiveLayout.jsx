// src/layouts/AdminLayout.jsx
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logOut } from '../store';

const AdminLayout = () => {
    const { user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = () => {
        dispatch(logOut());
        navigate('/login');
    };

    return (
        <div className="container-fluid">
            <div className="row">
                {/* Sidebar */}
                <nav className="col-md-3 col-lg-2 d-md-block bg-dark sidebar vh-100 pt-3">
                    <div className="position-sticky text-white">
                        <h5 className="px-3 mb-4 text-info">Admin Panel</h5>
                        <ul className="nav flex-column">
                            <li className="nav-item">
                                <Link className="nav-link text-white" to="/admin/dashboard">
                                    <i className="bi bi-speedometer2 me-2"></i> Dashboard
                                </Link>
                            </li>
                            <li className="nav-item">
                                <Link className="nav-link text-white" to="/admin/leads">
                                    Leads
                                </Link>
                            </li>
                            <hr className="bg-secondary" />
                            <li className="nav-item">
                                <button onClick={handleLogout} className="nav-link text-danger border-0 bg-transparent">
                                    Logout
                                </button>
                            </li>
                        </ul>
                    </div>
                </nav>

                {/* Main Content */}
                <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 bg-light min-vh-100">
                    <div className="d-flex justify-content-between flex-wrap flex-md-nowrap align-items-center pt-3 pb-2 mb-3 border-bottom">
                        <h1 className="h2">Dashboard</h1>
                        <span className="badge bg-secondary">Admin: {user?.name}</span>
                    </div>
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;