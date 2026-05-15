import mongoose from 'mongoose'

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
    skills: { type: [String], default: [] },
    preferredLocations: { type: [String], default: [] },
    preferredCategories: { type: [String], default: [] },
    experienceLevel: { type: String, trim: true, default: '' },
}, { timestamps: true })

userSchema.index(
    { name: 'text', email: 'text', skills: 'text', preferredLocations: 'text', preferredCategories: 'text' },
    { weights: { name: 5, skills: 4, preferredCategories: 3, preferredLocations: 2, email: 1 }, name: 'candidate_search_text' },
)

const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User
