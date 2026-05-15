import mongoose from 'mongoose'

export const RECRUITER_ROLES = ['Admin', 'Recruiter', 'Viewer']

const recruiterUserSchema = new mongoose.Schema({
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: RECRUITER_ROLES, default: 'Recruiter', index: true },
    status: { type: String, enum: ['Active', 'Suspended'], default: 'Active', index: true },
    lastLoginAt: { type: Date },
}, { timestamps: true })

recruiterUserSchema.index({ companyId: 1, role: 1 })

const RecruiterUser = mongoose.models.RecruiterUser || mongoose.model('RecruiterUser', recruiterUserSchema)

export default RecruiterUser
