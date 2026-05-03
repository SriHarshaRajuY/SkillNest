import mongoose from 'mongoose'

const messageSchema = new mongoose.Schema({
    applicationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'JobApplication',
        required: true,
        index: true,
    },
    body: { type: String, required: true, trim: true, maxlength: 8000 },
    fromUser: { type: Boolean, required: true },
    /** Candidate has opened thread — company-originated messages */
    seenByUserAt: { type: Date, default: null },
    /** Recruiter has opened thread — candidate-originated messages */
    seenByCompanyAt: { type: Date, default: null },
}, { timestamps: true })

messageSchema.index({ applicationId: 1, createdAt: -1 })

const Message = mongoose.models.Message || mongoose.model('Message', messageSchema)

export default Message
