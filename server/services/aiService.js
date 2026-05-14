import { GoogleGenerativeAI } from '@google/generative-ai'
import { createRequire } from 'module'
import logger from '../utils/logger.js'
import { safeJsonParse, truncateContext, withTimeout } from '../utils/aiHelpers.js'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

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
        
        // We stay on v1 as it resolved the 404 issue.
        // To fix the "Unknown name responseMimeType" error, we will move the JSON enforcement
        // to the prompt level and remove it from generationConfig for better compatibility.
        this.model = this.genAI.getGenerativeModel(
            { model: 'gemini-1.5-flash' },
            { apiVersion: 'v1' }
        )
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
        if (!this.model) {
            throw new Error('AI Service is currently unavailable.')
        }

        const timeout = 25000 
        
        for (let i = 0; i <= retries; i++) {
            try {
                // If we need JSON, we explicitly ask for it in the prompt (done in calling methods)
                // We removed responseMimeType from here to avoid 400 Bad Request on some API versions
                const aiPromise = this.model.generateContent({
                    contents: [{ role: 'user', parts: [{ text: prompt }] }],
                    generationConfig: {} 
                })

                const result = await withTimeout(aiPromise, timeout, 'AI request timed out')
                const responseText = result.response.text()
                
                if (isJson) {
                    // We use safeJsonParse which handles markdown code blocks if the AI includes them
                    const parsed = safeJsonParse(responseText)
                    if (!parsed) {
                        logger.error('Failed to parse AI JSON response', { responseText })
                        throw new Error('AI returned a malformed response.')
                    }
                    return parsed
                }
                
                return responseText
            } catch (error) {
                if (i === retries) {
                    logger.error(`AI call failed after ${retries} retries`, { error: error.message })
                    throw error
                }
                logger.warn(`AI call attempt ${i + 1} failed, retrying...`, { error: error.message })
                await new Promise(res => setTimeout(res, 1000 * (i + 1)))
            }
        }
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
          "reason": (string, 2 sentences max)
        }

        Job Description:
        ${truncateContext(jobDescription, 4000)}

        Resume Text:
        ${truncateContext(resumeText, 12000)}
        
        IMPORTANT: Return ONLY valid JSON. No markdown blocks, no extra text.
        `
        return this.callAIWithRetry(prompt, true)
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
        return this.callAIWithRetry(prompt, true)
    }

    /**
     * Draft an interview invitation
     */
    async generateInterviewInviteDraft({
        candidateName,
        jobTitle,
        jobDescription,
        companyName,
        resumeSnippet,
    }) {
        const prompt = `
        Task: Write a single interview invitation email body (no subject line).
        Guidelines:
        - Recipient: ${candidateName}
        - Role: ${jobTitle} at ${companyName}
        - Tone: Concise, warm, professional.
        - Length: Under 150 words.
        - Format: Plain text paragraphs only.
        
        Resume context:
        ${truncateContext(resumeSnippet, 3000) || '(No resume text)'}

        Job description excerpt:
        ${truncateContext((jobDescription || '').replace(/<[^>]+>/g, ' '), 2000)}
        `
        return this.callAIWithRetry(prompt, false)
    }
}

export default new AIService()
