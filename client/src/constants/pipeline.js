/** Mirrors server JobApplication.PIPELINE_STAGES */
export const PIPELINE_STAGES = [
    'Applied',
    'Screening',
    'Interview',
    'Offer',
    'Hired',
    'Rejected',
]

export const PIPELINE_LABELS = {
    Applied: 'Applied',
    Screening: 'Screening',
    Interview: 'Interview',
    Offer: 'Offer',
    Hired: 'Hired',
    Rejected: 'Not moving forward',
}

export function stageIndex(stage) {
    const i = PIPELINE_STAGES.indexOf(stage)
    return i >= 0 ? i : 0
}
