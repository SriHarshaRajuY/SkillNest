import apiClient from './apiClient';

export const messageService = {
    // ─── Candidate Endpoints ───────────────────────────────────────────────────
    getUserThreads: (clerkToken) => apiClient.get('/api/users/messages/threads', {
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),
    
    getUserThreadMessages: (applicationId, params, clerkToken) => apiClient.get(`/api/users/messages/thread/${applicationId}`, {
        params,
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),

    markUserThreadRead: (applicationId, clerkToken) => apiClient.post(`/api/users/messages/thread/${applicationId}/read`, {}, {
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),
    
    sendUserMessage: (data, clerkToken) => apiClient.post('/api/users/messages', data, {
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),

    getUserUnreadCount: (clerkToken) => apiClient.get('/api/users/messages/unread-count', {
        headers: { Authorization: `Bearer ${clerkToken}` }
    }),

    // ─── Recruiter Endpoints ────────────────────────────────────────────────────
    getRecruiterThreads: () => apiClient.get('/api/company/messages/threads'),
    
    getRecruiterThreadMessages: (applicationId, params) => apiClient.get(`/api/company/messages/thread/${applicationId}`, { params }),

    markRecruiterThreadRead: (applicationId) => apiClient.post(`/api/company/messages/thread/${applicationId}/read`, {}),
    
    sendRecruiterMessage: (data) => apiClient.post('/api/company/messages', data),
};
