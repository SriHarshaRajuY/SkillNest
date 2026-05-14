import apiClient from './apiClient';

export const jobService = {
    // Public job listings
    getJobs: (params) => apiClient.get('/api/jobs', { params }),
    
    // Single job details
    getJobById: (id) => apiClient.get(`/api/jobs/${id}`),
};
