import { GoogleGenerativeAI } from '@google/generative-ai'
import { createRequire } from 'module'
import logger from '../utils/logger.js'
import { safeJsonParse, truncateContext, withTimeout } from '../utils/aiHelpers.js'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

const STOP_WORDS = new Set([
    'and', 'are', 'but', 'for', 'from', 'has', 'have', 'into', 'our', 'that', 'the', 'their',
    'this', 'with', 'will', 'you', 'your', 'job', 'role', 'work', 'team', 'using', 'build',
    'experience', 'candidate', 'skills', 'strong', 'good', 'plus', 'must', 'should', 'able',
])

const extractTerms = (text) => {
    const normalized = String(text || '').toLowerCase()
    return new Set(
        normalized
            .replace(/[^a-z0-9+#.\s-]/g, ' ')
            .split(/\s+/)
            .map((term) => term.trim().replace(/^[.-]+|[.-]+$/g, ''))
            .filter((term) => term.length >= 3 && !STOP_WORDS.has(term)),
    )
}

const detectSkills = (text) => {
    const source = String(text || '').toLowerCase()
    const knownSkills = [
        'javascript', 'typescript', 'react', 'redux', 'node', 'express', 'mongodb', 'mongoose',
        'sql', 'postgresql', 'mysql', 'java', 'python', 'c++', 'docker', 'aws', 'azure',
        'git', 'rest', 'graphql', 'tailwind', 'html', 'css', 'vite',
    ]
    return knownSkills.filter((skill) => source.includes(skill)).slice(0, 8)
}

const uniqueTruthy = (values) => [...new Set(values.filter(Boolean))]

const heuristicMatchScore = (resumeText, jobDescription) => {
    const resumeTerms = extractTerms(resumeText)
    const jobTerms = extractTerms(jobDescription)
    const jobTermList = [...jobTerms]
    const matched = jobTermList.filter((term) => resumeTerms.has(term))
    const missing = jobTermList.filter((term) => !resumeTerms.has(term)).slice(0, 6)

    if (jobTermList.length === 0) {
        return {
            score: 0,
            reason: 'The job description does not contain enough detail to compute a reliable score.',
            matchedSkills: [],
            missingSkills: [],
            experienceAlignment: 'Insufficient job detail to compare experience alignment.',
            recommendation: 'Review manually',
            confidence: 'Low',
            source: 'fallback',
            model: null,
            cacheable: false,
        }
    }

    const coverage = matched.length / jobTermList.length
    const detectedSkills = detectSkills(resumeText)
    const score = Math.max(20, Math.min(92, Math.round(coverage * 100)))
    const highlights = [...new Set([...matched.slice(0, 5), ...detectedSkills.slice(0, 3)])].slice(0, 6)

    return {
        score,
        reason: highlights.length
            ? `AI provider was unavailable, so SkillNest used keyword-overlap fallback. Matched signals include ${highlights.join(', ')}.`
            : 'AI provider was unavailable, so SkillNest used keyword-overlap fallback. The resume has limited direct overlap with the job description.',
        matchedSkills: highlights,
        missingSkills: missing,
        experienceAlignment: coverage >= 0.65
            ? 'Resume has strong textual overlap with the job requirements.'
            : coverage >= 0.35
                ? 'Resume has partial overlap with the job requirements.'
                : 'Resume has limited direct overlap with the job requirements.',
        recommendation: score >= 75
            ? 'Strong shortlist candidate'
            : score >= 50
                ? 'Review manually'
                : 'Low match based on available signals',
        confidence: 'Medium',
        source: 'fallback',
        model: null,
        cacheable: false,
    }
}

const fallbackResumeSummary = (resumeText) => {
    const skills = detectSkills(resumeText)
    return {
        skills: skills.length ? skills : ['Resume uploaded'],
        experienceSummary: 'AI summary is temporarily unavailable. SkillNest detected core resume signals locally so recruiters can continue reviewing the application.',
        source: 'fallback',
        model: null,
        cacheable: false,
    }
}

class AIService {
    constructor() {
        this.apiKey =
            process.env.GEMINI_API_KEY
            || process.env.GOOGLE_API_KEY
            || process.env.GOOGLE_GENERATIVE_AI_API_KEY

        if (!this.apiKey) {
            logger.warn('GEMINI_API_KEY is not configured.')
            this.genAI = null
            this.model = null
            return
        }

        this.genAI = new GoogleGenerativeAI(this.apiKey)
        this.modelNames = uniqueTruthy([
            process.env.GEMINI_MODEL,
            'gemini-2.5-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.0-flash',
        ])
    }

    getCacheModelKey() {
        return (this.modelNames || ['no-ai-models']).join('+').replace(/[^a-z0-9_.+-]/gi, '-')
    }

    /**
     * Extracts text from a PDF buffer with size limits.
     */
    async parsePDF(buffer) {
        try {
            const pdfData = await pdfParse(buffer)
            if (!pdfData?.text?.trim()) {
                throw new Error('Unreadable PDF format or empty document.')
            }
            return truncateContext(pdfData.text, 25000)
        } catch (error) {
            logger.error('[AIService.parsePDF] Error', error)
            if (error.message.includes('Unreadable')) throw error
            throw new Error('Failed to extract text from the PDF document.')
        }
    }

    /**
     * Wrapper with timeout and retry logic.
     */
    async callAIWithRetry(prompt, isJson = true, retries = 1) {
        if (!this.genAI) {
            throw new Error('AI Service is currently unavailable.')
        }

        const timeout = 25000 

        let lastError = null

        for (const modelName of this.modelNames) {
            const model = this.genAI.getGenerativeModel(
                { model: modelName },
                { apiVersion: 'v1' },
            )

            for (let i = 0; i <= retries; i++) {
                try {
                    const aiPromise = model.generateContent({
                        contents: [{ role: 'user', parts: [{ text: prompt }] }],
                        generationConfig: {}
                    })

                    const result = await withTimeout(aiPromise, timeout, 'AI request timed out')
                    const responseText = result.response.text()

                    if (isJson) {
                        const parsed = safeJsonParse(responseText)
                        if (!parsed) {
                            logger.error('Failed to parse AI JSON response', { responseText })
                            throw new Error('AI returned a malformed response.')
                        }
                        return { data: parsed, modelName }
                    }

                    return { data: responseText, modelName }
                } catch (error) {
                    lastError = error
                    const modelMissing = /404|not found|not supported/i.test(error.message || '')
                    if (modelMissing) {
                        logger.warn('[AIService] Gemini model unavailable, trying fallback model', { modelName })
                        break
                    }

                    if (i === retries) {
                        logger.warn('[AIService] Model attempt failed', { modelName, error: error.message })
                        break
                    }

                    await new Promise(res => setTimeout(res, 1000 * (i + 1)))
                }
            }
        }

        logger.error('AI call failed across configured models', { error: lastError?.message })
        throw new Error('AI analysis is temporarily unavailable. Please try again later.')
    }

    /**
     * Compare Resume to Job Description
     */
    async generateMatchScore(resumeText, jobDescription) {
        const prompt = `
        Task: Act as an expert ATS (Applicant Tracking System). Compare the Job Description to the Resume.
        
        Return a JSON object with exactly these fields:
        {
          "score": (number between 0-100),
          "reason": (string, 2 sentences max),
          "matchedSkills": ["skill or requirement found in both"],
          "missingSkills": ["important job requirement not clearly present"],
          "experienceAlignment": "one concise sentence about seniority/domain/project alignment",
          "recommendation": "Strong shortlist candidate | Review manually | Low match based on available signals",
          "confidence": "High | Medium | Low"
        }

        Job Description:
        ${truncateContext(jobDescription, 4000)}

        Resume Text:
        ${truncateContext(resumeText, 12000)}
        
        IMPORTANT: Return ONLY valid JSON. No markdown blocks, no extra text.
        `
        try {
            const { data: result, modelName } = await this.callAIWithRetry(prompt, true)
            return {
                score: Number(result.score) || 0,
                reason: result.reason || 'AI generated a match score without additional reasoning.',
                matchedSkills: Array.isArray(result.matchedSkills) ? result.matchedSkills.slice(0, 8) : [],
                missingSkills: Array.isArray(result.missingSkills) ? result.missingSkills.slice(0, 8) : [],
                experienceAlignment: result.experienceAlignment || 'Experience alignment could not be determined from the resume.',
                recommendation: result.recommendation || 'Review manually',
                confidence: result.confidence || 'Medium',
                source: 'gemini',
                model: modelName,
                cacheable: true,
            }
        } catch (error) {
            logger.warn('[AIService.generateMatchScore] Using local fallback scoring', { error: error.message })
            return heuristicMatchScore(resumeText, jobDescription)
        }
    }

    /**
     * Generate a concise resume summary for recruiters
     */
    async generateResumeSummary(resumeText) {
        const prompt = `
        Task: Act as a technical recruiter. Provide a high-level summary of the candidate's resume.
        
        Return a JSON object with exactly these fields:
        {
          "skills": ["skill1", "skill2", "skill3"],
          "experienceSummary": "3-line summary of professional history"
        }

        Resume Text:
        ${truncateContext(resumeText, 12000)}

        IMPORTANT: Return ONLY valid JSON. No markdown blocks, no extra text.
        `
        try {
            const { data: result, modelName } = await this.callAIWithRetry(prompt, true)
            return {
                skills: Array.isArray(result.skills) ? result.skills.slice(0, 12) : [],
                experienceSummary: result.experienceSummary || 'AI generated a summary without additional detail.',
                source: 'gemini',
                model: modelName,
                cacheable: true,
            }
        } catch (error) {
            logger.warn('[AIService.generateResumeSummary] Using local fallback summary', { error: error.message })
            return fallbackResumeSummary(resumeText)
        }
    }

}

export default new AIService()
