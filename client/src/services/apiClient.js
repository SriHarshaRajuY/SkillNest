import axios from 'axios';

const backendUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');

const apiClient = axios.create({
    baseURL: backendUrl,
    timeout: 30000,
    headers: {
        'Content-Type': 'application/json',
    },
});

/**
 * Global Request Interceptor
 * Injects Recruiter JWT or Clerk Token where available.
 */
apiClient.interceptors.request.use(async (config) => {
    // 1. Recruiter Auth (Manual JWT)
    const companyToken = localStorage.getItem('companyToken');
    if (companyToken) {
        config.headers['token'] = companyToken;
    }

    // 2. Candidate Auth (Clerk Token)
    // Note: This needs to be injected from the hook layer or a singleton.
    // For this project, we'll assume the token is passed in headers by the service calls
    // or we'll provide a way to 'authenticate' the client instance.
    
    return config;
}, (error) => Promise.reject(error));

/**
 * Global Response Interceptor
 * Standardizes error handling and response data extraction.
 */
apiClient.interceptors.response.use(
    (response) => {
        // Our backend always returns { success, message, data }
        return response.data;
    },
    (error) => {
        const isNetworkError = !error.response;
        const message = isNetworkError
            ? 'SkillNest API is currently unavailable. Please try again after the backend service is running.'
            : error.response?.data?.message || 'Something went wrong. Please try again.';
        const status = error.response?.status;

        // Handle Session Expiry (401)
        if (status === 401 && localStorage.getItem('companyToken')) {
            localStorage.removeItem('companyToken');
            window.location.href = '/'; // Simple redirect for demo purposes
        }

        return Promise.reject({
            success: false,
            message,
            status,
            isNetworkError,
            errors: error.response?.data?.errors || []
        });
    }
);

export default apiClient;
