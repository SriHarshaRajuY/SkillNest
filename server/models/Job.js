import mongoose from 'mongoose'


const jobSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    level: { type: String, required: true, trim: true },
    salary: { type: Number, required: true, min: 1 },
    date: { type: Number, required: true },
    visible: { type: Boolean, default: true },
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Company', required: true },
}, { timestamps: true })

// Indexes for pagination and filtering optimization
jobSchema.index({ companyId: 1 })
jobSchema.index({ category: 1 })
jobSchema.index({ level: 1 })
jobSchema.index({ location: 1 })
jobSchema.index({ visible: 1 })
jobSchema.index({ date: -1 })
jobSchema.index({ salary: 1 })
jobSchema.index({
    title: 'text',
    description: 'text',
    location: 'text',
    category: 'text',
    level: 'text',
}, {
    weights: { title: 8, category: 4, location: 3, level: 2, description: 1 },
    name: 'job_search_text',
})

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema)

export default Job
