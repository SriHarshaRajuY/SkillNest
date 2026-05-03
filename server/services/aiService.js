import { GoogleGenerativeAI } from '@google/generative-ai'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

class AIService {
    constructor() {
        if (!process.env.GEMINI_API_KEY) {
            console.warn('⚠️ GEMINI_API_KEY is not configured.')
            this.genAI = null
            this.model = null
        } else {
            this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
        }
    }

    async parsePDF(buffer) {
        try {
            const pdfData = await pdfParse(buffer)
            return pdfData.text
        } catch (error) {
            console.error('[AIService.parsePDF] Error:', error.message)
            throw new Error('Failed to extract text from the PDF document.')
        }
    }

    async generateMatchScore(resumeText, jobDescription) {
        if (!this.model) {
            throw new Error('AI Service is currently unavailable due to missing API Key configuration.')
        }

        const prompt = `
You are an expert ATS (Applicant Tracking System). 
Compare the following Job Description to the candidate's Resume Text.
Provide a match score out of 100, and a concise 2-sentence reason.
Return ONLY valid JSON in the exact format:
{
  "score": 85,
  "reason": "The candidate has strong React skills but lacks the required 5 years of Python experience."
}

Job Description:
${jobDescription}

Resume Text:
${resumeText}
`
        try {
            const result = await this.model.generateContent(prompt)
            const responseText = result.response.text()

            // Extract JSON robustly
            let cleanText = responseText.trim()
            const firstBrace = cleanText.indexOf('{')
            const lastBrace = cleanText.lastIndexOf('}')
            
            if (firstBrace !== -1 && lastBrace !== -1) {
                cleanText = cleanText.substring(firstBrace, lastBrace + 1)
            }

            const parsed = JSON.parse(cleanText)
            
            if (typeof parsed.score !== 'number' || !parsed.reason) {
                throw new Error('AI returned an invalid response format.')
            }

            return parsed
        } catch (error) {
            console.error('[AIService.generateMatchScore] Error:', error.message)
            throw new Error('Failed to analyze the resume using AI.')
        }
    }
}

export default new AIService()
