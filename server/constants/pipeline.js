export const PIPELINE_STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']

export function legacyStatusFromPipeline(stage) {
    if (stage === 'Rejected') return 'Rejected'
    if (stage === 'Hired' || stage === 'Offer') return 'Accepted'
    return 'Pending'
}
