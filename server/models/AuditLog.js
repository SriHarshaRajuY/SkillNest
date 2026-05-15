import mongoose from 'mongoose'

const auditLogSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'RecruiterUser' },
    actorName: { type: String, default: 'Legacy admin', trim: true },
    actorEmail: { type: String, default: '', trim: true, lowercase: true },
    actorRole: { type: String, enum: ['Admin', 'Recruiter', 'Viewer', 'LegacyAdmin'], default: 'LegacyAdmin' },
    action: {
        type: String,
        enum: [
            'RESUME_VIEWED',
            'PIPELINE_STAGE_CHANGED',
            'AI_SCORE_GENERATED',
            'INTERNAL_NOTE_ADDED',
            'JOB_EDITED',
            'TEAM_MEMBER_CREATED',
            'TEAM_MEMBER_UPDATED',
        ],
        required: true,
        index: true,
    },
    targetType: { type: String, enum: ['Application', 'Job', 'RecruiterUser'], required: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true })

auditLogSchema.index({ companyId: 1, createdAt: -1 })
auditLogSchema.index({ companyId: 1, action: 1, createdAt: -1 })

const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema)

export default AuditLog
