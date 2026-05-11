// src/api/axios.js
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8000/api', // Adjust to your Laravel URL
    // baseURL: 'https://darksalmon-sardine-333699.hostingersite.com/api', // Adjust to your Laravel URL
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    }
});

// Add interceptor to handle tokens
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// CRITICAL: Make sure this line exists!
export default api;