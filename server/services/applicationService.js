import JobApplication from '../models/JobApplication.js'
import Job from '../models/Job.js'
import User from '../models/User.js'
import logger from '../utils/logger.js'

/**
 * Handles the application creation flow.
 * Smart filtering is now handled by recruiters via AI analysis on-demand
 * to ensure high-quality filtering decisions.
 */
export const processApplication = async ({ userId, jobId }) => {
    try {
        const jobData = await Job.findById(jobId).lean()
        if (!jobData) throw new Error('Job not found')
        if (!jobData.visible) throw new Error('This job is no longer accepting applications')

        const user = await User.findById(userId).lean()
        if (!user) throw new Error('User not found')
        
        if (!user.resume) throw new Error('Please upload your resume before applying')

        const existing = await JobApplication.findOne({ jobId, userId }).lean()
        if (existing) throw new Error('You have already applied for this job')

        const application = await JobApplication.create({
            companyId: jobData.companyId,
            userId,
            jobId,
            date: Date.now(),
            pipelineStage: 'Applied'
        })

        logger.info('New application submitted', { applicationId: application._id, userId, jobId })
        return application
    } catch (error) {
        if (!['Job not found', 'This job is no longer accepting applications', 'User not found', 'Please upload your resume before applying', 'You have already applied for this job'].includes(error.message)) {
            logger.error('[processApplication] Unexpected error', error)
        }
        throw error
    }
}
