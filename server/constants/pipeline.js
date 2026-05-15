export const RECRUITER_PIPELINE_STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']
export const PIPELINE_STAGES = [...RECRUITER_PIPELINE_STAGES, 'Withdrawn']

export function legacyStatusFromPipeline(stage) {
    if (stage === 'Rejected') return 'Rejected'
    if (stage === 'Hired' || stage === 'Offer') return 'Accepted'
    return 'Pending'
}
