import cron from 'node-cron'
import User from '../models/User.js'
import { calculateProfileCompleteness } from '../services/matchingService.js'

export const initCredibilityCron = () => {
    // Run every day at midnight (or use '0 * * * *' for every hour during testing)
    // Here we use '0 0 * * *' for daily midnight execution
    cron.schedule('0 0 * * *', async () => {
        console.log('[Cron] Running daily credibility score update...')
        try {
            const users = await User.find({})
            
            for (const user of users) {
                // 1. Base Score from Profile Completeness (max 50 points)
                const completeness = calculateProfileCompleteness(user)
                const baseScore = Math.floor(completeness / 2) // Max 50
                
                // 2. Assessment Score (max 50 points)
                let assessmentContribution = 0
                if (user.assessments && user.assessments.length > 0) {
                    const totalScore = user.assessments.reduce((acc, curr) => acc + curr.score, 0)
                    const avgScore = totalScore / user.assessments.length
                    assessmentContribution = Math.floor(avgScore / 2) // Max 50
                }

                const newScore = baseScore + assessmentContribution
                
                // Only update if changed
                if (user.credibilityScore !== newScore) {
                    user.credibilityScore = newScore
                    user.profileCompleteness = completeness
                    await user.save()
                }
            }
            console.log(`[Cron] Successfully updated credibility scores for ${users.length} users.`)
        } catch (error) {
            console.error('[Cron] Error updating credibility scores:', error.message)
        }
    })
}
