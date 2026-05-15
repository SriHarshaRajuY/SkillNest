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

    updatePreferences: (preferences, clerkToken) => apiClient.patch('/api/users/preferences', preferences, {
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),

    getSavedJobs: (clerkToken) => apiClient.get('/api/users/saved-jobs', {
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),

    saveJob: (jobId, clerkToken) => apiClient.post(`/api/users/saved-jobs/${jobId}`, {}, {
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),

    unsaveJob: (jobId, clerkToken) => apiClient.delete(`/api/users/saved-jobs/${jobId}`, {
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),

    getRecommendedJobs: (clerkToken, params = {}) => apiClient.get('/api/users/recommended-jobs', {
        params,
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),

    withdrawApplication: (applicationId, clerkToken) => apiClient.post(`/api/users/applications/${applicationId}/withdraw`, {}, {
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
