import JobApplication, { PIPELINE_STAGES } from '../models/JobApplication.js'
import Job from '../models/Job.js'
import User from '../models/User.js'
import { calculateMatchScore } from './matchingService.js'

/**
 * Handles the application creation flow and smart filtering
 */
export const processApplication = async ({ userId, jobId, assessmentScore = 0 }) => {
    const jobData = await Job.findById(jobId)
    if (!jobData) throw new Error('Job not found')
    if (!jobData.visible) throw new Error('This job is no longer accepting applications')

    const user = await User.findById(userId)
    if (!user) throw new Error('User not found')
    
    if (!user.resume) throw new Error('Please upload your resume before applying')

    const existing = await JobApplication.findOne({ jobId, userId })
    if (existing) throw new Error('You have already applied for this job')

    // Evaluate the candidate
    const matchScore = calculateMatchScore(user.skills, jobData.requiredSkills)
    
    // Average Match Score + Assessment Score (if any assessments exist)
    let aggregateScore = matchScore
    if (jobData.assessments && jobData.assessments.length > 0) {
        aggregateScore = Math.round((matchScore + assessmentScore) / 2)
    }

    // Smart Filtering
    let initialStage = 'Applied'
    if (jobData.autoFilterThreshold && aggregateScore < jobData.autoFilterThreshold) {
        initialStage = 'Rejected' // Automatically filtered out
    }

    const application = await JobApplication.create({
        companyId: jobData.companyId,
        userId,
        jobId,
        date: Date.now(),
        matchScore,
        assessmentScore,
        pipelineStage: initialStage
    })

    return application
}

/**
 * Validates and updates the hiring pipeline stage
 */
export const updateApplicationStage = async (applicationId, newStage, recruiterCompanyId) => {
    if (!PIPELINE_STAGES.includes(newStage)) throw new Error('Invalid pipeline stage')

    const application = await JobApplication.findById(applicationId).populate('jobId')
    if (!application) throw new Error('Application not found')

    if (application.jobId?.companyId?.toString() !== recruiterCompanyId.toString()) {
        throw new Error('Not authorized to update this application')
    }

    const currentStageIndex = PIPELINE_STAGES.indexOf(application.pipelineStage)
    const newStageIndex = PIPELINE_STAGES.indexOf(newStage)

    // Example strict rule: Cannot jump directly from Applied to Offer without Interview
    // unless going backwards or to Rejected
    if (newStage !== 'Rejected' && newStageIndex > currentStageIndex + 2) {
        throw new Error(`Cannot jump from ${application.pipelineStage} to ${newStage} directly.`)
    }

    application.pipelineStage = newStage
    await application.save()

    return application
}
