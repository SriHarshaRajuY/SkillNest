import apiClient from './apiClient';

export const authService = {
    // Recruiter Registration
    registerRecruiter: (formData) => apiClient.post('/api/company/register', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    }),

    // Recruiter Login
    loginRecruiter: (credentials) => apiClient.post('/api/company/login', credentials),

    // Recruiter Profile
    getRecruiterProfile: () => apiClient.get('/api/company/company'),

    // Candidate Profile (Uses Clerk token passed in Authorization header)
    getCandidateProfile: (clerkToken) => apiClient.get('/api/users/user', {
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),

    // Get Realtime Token (Candidate)
    getRealtimeToken: (clerkToken) => apiClient.get('/api/users/realtime-token', {
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),
};
