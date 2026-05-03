import mongoose from 'mongoose'

export const PIPELINE_STAGES = ['Applied', 'Screening', 'Interview', 'Offer', 'Hired', 'Rejected']

const internalNoteSchema = new mongoose.Schema({
    authorCompanyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    authorName: { type: String, required: true, trim: true },
    body: { type: String, required: true, trim: true, maxlength: 4000 },
    rating: { type: Number, min: 1, max: 5 },
}, { timestamps: true })

const pipelineEventSchema = new mongoose.Schema({
    stage: { type: String, enum: PIPELINE_STAGES, required: true },
    at: { type: Date, default: Date.now },
}, { _id: false })

function legacyStatusFromPipeline(stage) {
    if (stage === 'Rejected') return 'Rejected'
    if (stage === 'Hired' || stage === 'Offer') return 'Accepted'
    return 'Pending'
}

const jobApplicationSchema = new mongoose.Schema({
    userId: { type: String, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    /** Kept in sync with pipeline for legacy UI */
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Rejected'],
        default: 'Pending',
    },
    pipelineStage: {
        type: String,
        enum: PIPELINE_STAGES,
        default: 'Applied',
    },
    pipelineHistory: { type: [pipelineEventSchema], default: [] },
    /** Recruiter-only — stripped in candidate API responses */
    internalNotes: { type: [internalNoteSchema], default: [] },
    date: { type: Number, required: true },
}, { timestamps: true })

jobApplicationSchema.pre('save', function (next) {
    if (this.isNew) {
        if (!this.pipelineHistory?.length) {
            this.pipelineHistory = [{ stage: this.pipelineStage || 'Applied', at: new Date() }]
        }
        this.status = legacyStatusFromPipeline(this.pipelineStage || 'Applied')
    }
    if (this.isModified('pipelineStage')) {
        this.status = legacyStatusFromPipeline(this.pipelineStage)
        if (!Array.isArray(this.pipelineHistory)) this.pipelineHistory = []
        const last = this.pipelineHistory[this.pipelineHistory.length - 1]
        if (!last || last.stage !== this.pipelineStage) {
            this.pipelineHistory.push({ stage: this.pipelineStage, at: new Date() })
        }
    }
    next()
})

// Prevent duplicate applications at the DB level
jobApplicationSchema.index({ userId: 1, jobId: 1 }, { unique: true })

const JobApplication = mongoose.models.JobApplication || mongoose.model('JobApplication', jobApplicationSchema)

export default JobApplication
