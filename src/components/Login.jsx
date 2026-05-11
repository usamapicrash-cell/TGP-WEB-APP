import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { setCredentials } from '../store';
import api from '../api/axios';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false); // <--- Eye toggle state
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { isAuthenticated, user } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    useEffect(() => {
        document.title = "The Glass People | Login";
        if (isAuthenticated && user) {
            if (user.role.name === 'admin') navigate('/admin/dashboard');
            else if (user.role.name === 'executive') navigate('/executive/dashboard');
            else navigate('/glazier/dashboard');
        }
    }, [isAuthenticated, user, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const response = await api.post('/login', { email, password });
            const { user, token } = response.data;
            dispatch(setCredentials({ user, token }));
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid login credentials');
        } finally {
            setLoading(false);
        }
    };

    const styles = {
        wrapper: { backgroundColor: '#f8f9fa', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' },
        card: { border: 'none', borderRadius: '20px', boxShadow: 'rgb(201 216 231) 0px 4px 20px', width: '100%', maxWidth: '450px' },
        iconCircle: { width: '56px', height: '56px', backgroundColor: '#eff4f9', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' },
        button: { backgroundColor: '#34497e', borderColor: '#34497e', fontWeight: '500', borderRadius: '8px' },
        link: { color: '#4a90e2', textDecoration: 'none', fontSize: '0.9rem' },
        inputGroup: { borderRadius: '8px', overflow: 'hidden' },
        eyeBtn: { position: 'absolute', right: '15px', top: '15px', background: 'transparent', zIndex: 999 }
    };

    return (
        <div style={styles.wrapper}>
            <div className="card" style={styles.card}>
                <div className="card-body p-4">
                    <div style={styles.iconCircle}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="#3c5a9a" xmlns="http://www.w3.org/2000/svg">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/>
                        </svg>
                    </div>

                    <h2 className="text-center fw-bold mb-1 fs-5">Welcome Back</h2>
                    <p className="text-center text-muted mb-3 fs-15 fw-light">Sign in to The Glass People platform</p>
                    
                    {error && <div className="alert alert-danger py-2 small">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="mb-3">
                            <input 
                                type="email" 
                                className="form-control form-control-lg bg-light" 
                                placeholder="Email Address"
                                style={{ fontSize: '0.95rem', border: '1px solid #dee2e6', borderRadius: '8px' }}
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required 
                            />
                        </div>
                        
                        <div className="mb-4">
                            <div className="input-group" style={styles.inputGroup}>
                                <input 
                                    type={showPassword ? "text" : "password"} 
                                    className="form-control form-control-lg bg-light" 
                                    placeholder="Password"
                                    style={{ fontSize: '0.95rem', border: '1px solid #dee2e6' }}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required 
                                />
                                <a 
                                    className="" 
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={styles.eyeBtn}
                                >
                                    <i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
                                </a>
                            </div>
                        </div>

                        <button 
                            type="submit" 
                            className="btn btn-primary w-100 py-2 mb-3"
                            style={styles.button}
                            disabled={loading}
                        >
                           {loading ? (
                                    <div className="spinner-border spinner-border-sm" role="status">
                                        <span className="visually-hidden">Loading...</span>
                                    </div>
                                ) : (
                                    'Sign In'
                                )}
                        </button>
                        
                        {/*<div className="text-center">
                            <a href="#" style={styles.link}>Forgot Password?</a>
                        </div>*/}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;