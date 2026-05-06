import mongoose from 'mongoose'

const requiredSkillSchema = new mongoose.Schema({
    skill: { type: String, required: true, trim: true },
    weight: { type: Number, required: true, min: 1, max: 5, default: 3 } // How important this skill is
}, { _id: false })

const assessmentQuestionSchema = new mongoose.Schema({
    question: { type: String, required: true },
    options: { type: [String], required: true },
    correctAnswer: { type: String, required: true }
}, { _id: false })

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

    // New Fields for advanced matching
    requiredSkills: { type: [requiredSkillSchema], default: [] },
    assessments: { type: [assessmentQuestionSchema], default: [] },
    autoFilterThreshold: { type: Number, default: 0, min: 0, max: 100 } // Minimum Match % + Assessment % required
}, { timestamps: true })

// Indexes for pagination and filtering optimization
jobSchema.index({ companyId: 1 })
jobSchema.index({ category: 1 })
jobSchema.index({ visible: 1 })
jobSchema.index({ date: -1 })

const Job = mongoose.models.Job || mongoose.model('Job', jobSchema)

export default Job