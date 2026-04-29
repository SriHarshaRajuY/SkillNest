import mongoose from 'mongoose'

const companySchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    image: { type: String, required: true },
    password: { type: String, required: true },
}, { timestamps: true })

const Company = mongoose.models.Company || mongoose.model('Company', companySchema)

export default Company