import mongoose from 'mongoose'

const assessmentResultSchema = new mongoose.Schema({
    jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
    score: { type: Number, required: true },
    date: { type: Date, default: Date.now }
}, { _id: false })

const resumeAssetSchema = new mongoose.Schema({
    publicId: { type: String, trim: true },
    resourceType: { type: String, enum: ['image', 'raw', 'video'], default: 'raw' },
    deliveryType: { type: String, enum: ['upload', 'private', 'authenticated'], default: 'private' },
    extension: { type: String, trim: true, lowercase: true, default: 'pdf' },
}, { _id: false })

const userSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    resume: { type: String, default: '' },
    resumeAsset: { type: resumeAssetSchema, default: null },
    image: { type: String, default: '' },
    
    // New Fields for upgraded capabilities
    skills: { type: [String], default: [] },
    credibilityScore: { type: Number, default: 50, min: 0, max: 100 },
    profileCompleteness: { type: Number, default: 0, min: 0, max: 100 },
    assessments: { type: [assessmentResultSchema], default: [] }
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User
