const aiServiceMock = {
  parsePDF: async () => 'Mocked resume text content.',
  generateMatchScore: async () => ({
    score: 85,
    reason: 'Mocked match reason based on skills.'
  }),
  generateInterviewInviteDraft: async () => 'Mocked interview invitation text.',
  auditJobDescription: async () => ({
    score: 90,
    suggestions: ['Mocked suggestion 1', 'Mocked suggestion 2']
  })
}

export default aiServiceMock;
