import mongoose from 'mongoose'
import JobApplication from '../models/JobApplication.js'

// Function to connect to the MongoDB database
const connectDB = async () => {

    mongoose.connection.on('connected', () => console.log('Database Connected'))

    await mongoose.connect(process.env.MONGODB_URI, { dbName: 'job-portal' })

}

/** One-time style backfill for documents created before pipelineStage existed */
export async function migrateLegacyApplications() {
    try {
        await JobApplication.updateMany(
            { pipelineStage: { $exists: false }, status: 'Accepted' },
            { $set: { pipelineStage: 'Offer' } },
        )
        await JobApplication.updateMany(
            { pipelineStage: { $exists: false }, status: 'Rejected' },
            { $set: { pipelineStage: 'Rejected' } },
        )
        await JobApplication.updateMany(
            { pipelineStage: { $exists: false }, status: 'Pending' },
            { $set: { pipelineStage: 'Applied' } },
        )
    } catch (e) {
        console.warn('[migrateLegacyApplications]', e.message)
    }
}

export default connectDB