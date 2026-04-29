import mongoose from 'mongoose'

const jobApplicationSchema = new mongoose.Schema({
    userId: { type: String, ref: 'User', required: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
    status: {
        type: String,
        enum: ['Pending', 'Accepted', 'Rejected'],
        default: 'Pending',
    },
    date: { type: Number, required: true },
}, { timestamps: true })

// Prevent duplicate applications at the DB level
jobApplicationSchema.index({ userId: 1, jobId: 1 }, { unique: true })

const JobApplication = mongoose.models.JobApplication || mongoose.model('JobApplication', jobApplicationSchema)

export default JobApplication