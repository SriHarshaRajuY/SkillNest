import apiClient from './apiClient';

export const recruiterService = {
    // Job Management
    postJob: (jobData) => apiClient.post('/api/company/post-job', jobData),
    getPostedJobs: (params) => apiClient.get('/api/company/list-jobs', { params }),
    toggleJobVisibility: (id) => apiClient.post('/api/company/change-visibility', { id }),

    // Applicant Management
    getApplicants: (params) => apiClient.get('/api/company/applicants', { params }),
    getApplicantResume: (applicationId) => apiClient.get(`/api/company/applicant-resume/${applicationId}`),
    updatePipelineStage: (data) => apiClient.post('/api/company/change-status', data),
    addInternalNote: (applicationId, noteData) => apiClient.post(`/api/company/applications/${applicationId}/internal-notes`, noteData),

    // AI Refinements
    matchResume: (applicationId) => apiClient.get(`/api/company/match-resume/${applicationId}`),
    getResumeSummary: (applicationId) => apiClient.get(`/api/company/resume-summary/${applicationId}`),

    // Analytics
    getAnalytics: () => apiClient.get('/api/company/analytics'),
};
