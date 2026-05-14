import apiClient from './apiClient';

export const applicationService = {
    // Apply for a job
    applyToJob: (jobId, clerkToken) => apiClient.post('/api/users/apply', { jobId }, {
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),

    // Get candidate's applications
    getMyApplications: (params, clerkToken) => apiClient.get('/api/users/applications', {
        params,
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),

    // Upload/Update resume
    updateResume: (formData, clerkToken) => apiClient.post('/api/users/update-resume', formData, {
        headers: { 
            Authorization: `Bearer ${clerkToken}`,
            'Content-Type': 'multipart/form-data' 
        }
    }),

    // Get resume signed URL
    getResumeUrl: (clerkToken) => apiClient.get('/api/users/resume', {
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),
};
