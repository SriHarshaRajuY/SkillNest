import mongoose from 'mongoose'

const userSchema = new mongoose.Schema({
    _id: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    resume: { type: String, default: '' },
    image: { type: String, default: '' },
}, { timestamps: true })

const User = mongoose.models.User || mongoose.model('User', userSchema)

export default User