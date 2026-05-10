import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pdfParse = require('pdf-parse')

class AIService {
    constructor() {
        this.apiKey =
            process.env.GEMINI_API_KEY
            || process.env.GOOGLE_API_KEY
            || process.env.GOOGLE_GENERATIVE_AI_API_KEY

        if (!this.apiKey) {
            console.warn('GEMINI_API_KEY is not configured.')
            this.genAI = null
            this.model = null
            return
        }

        this.genAI = new GoogleGenerativeAI(this.apiKey)
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    }

    parseJsonResponse(responseText) {
        const cleaned = responseText
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim()

        return JSON.parse(cleaned)
    }

    async parsePDF(buffer) {
        try {
            const pdfData = await pdfParse(buffer)
            if (!pdfData?.text?.trim()) {
                throw new Error('Unreadable PDF format or empty document.')
            }
            return pdfData.text
        } catch (error) {
            console.error('[AIService.parsePDF] Error:', error.message)
            if (error.message.includes('Unreadable')) throw error
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

        const customSafetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ]

        try {
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                },
                safetySettings: customSafetySettings,
            })
            const parsed = this.parseJsonResponse(result.response.text())

            if (typeof parsed.score !== 'number' || !parsed.reason) {
                throw new Error('AI returned an invalid response format.')
            }

            return parsed
        } catch (error) {
            console.error('[AIService.generateMatchScore] Error:', error.message)
            throw new Error('Failed to analyze the resume using AI.')
        }
    }

    async generateInterviewInviteDraft({
        candidateName,
        jobTitle,
        jobDescription,
        companyName,
        resumeSnippet,
    }) {
        if (!this.model) {
            throw new Error('AI Service is currently unavailable due to missing API Key configuration.')
        }

        const trimmedResume = (resumeSnippet || '').slice(0, 4000)
        const prompt = `
You help recruiters write concise, warm, professional messages to candidates.

Write a single interview invitation email body (no subject line) that:
- Greets ${candidateName} by first name if obvious from their name, otherwise "Hello".
- Mentions ${companyName} and the "${jobTitle}" role briefly.
- Invites them to a next-step interview (offer 2 brief scheduling options or ask for their availability - keep it flexible).
- Stays under 180 words, plain paragraphs, no markdown, no bullet stars.

Optional resume context (may be empty):
${trimmedResume || '(No resume text extracted)'}

Job description excerpt:
${(jobDescription || '').replace(/<[^>]+>/g, ' ').slice(0, 2500)}
`

        const customSafetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ]

        try {
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                safetySettings: customSafetySettings,
            })
            const text = result.response.text().trim()
            if (!text) throw new Error('Empty AI response')
            return text
        } catch (error) {
            console.error('[AIService.generateInterviewInviteDraft] Error:', error.message)
            throw new Error('Failed to generate draft.')
        }
    }

    async auditJobDescription(jobDescription) {
        if (!this.model) {
            throw new Error('AI Service is currently unavailable due to missing API Key configuration.')
        }

        const prompt = `
You are an expert in Diversity, Equity, and Inclusion (DEI) in hiring.
Review the following Job Description for biased language, exclusionary requirements, or overly masculine phrasing (e.g., "rockstar", "ninja", aggressive language).
Provide a "Diversity Score" out of 100, and a list of specific actionable suggestions to make the job post more inclusive.
Return ONLY valid JSON in the exact format:
{
  "score": 85,
  "suggestions": [
    "Replace 'rockstar developer' with 'skilled developer'.",
    "Remove 'must be a culture fit' and use 'value add' instead."
  ]
}

Job Description:
${jobDescription.replace(/<[^>]+>/g, ' ').slice(0, 3000)}
`

        const customSafetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ]

        try {
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                },
                safetySettings: customSafetySettings,
            })
            const parsed = this.parseJsonResponse(result.response.text())

            if (typeof parsed.score !== 'number' || !Array.isArray(parsed.suggestions)) {
                throw new Error('AI returned an invalid response format.')
            }

            return parsed
        } catch (error) {
            console.error('[AIService.auditJobDescription] Error:', error.message)
            throw new Error('Failed to audit the job description using AI.')
        }
    }

    async generateResumeOptimization(resumeText, jobDescription) {
        if (!this.model) {
            throw new Error('AI Service is currently unavailable due to missing API Key configuration.')
        }

        const prompt = `
You are a senior career coach and resume expert.
Analyze the provided Resume Text against the Job Description.
Identify missing keywords, suggest better bullet points for impact, and provide a list of top 5 improvements to increase the ATS score.
Return ONLY valid JSON in the exact format:
{
  "atsScore": 65,
  "missingKeywords": ["Redis", "Docker", "Microservices"],
  "improvedBullets": [
    "Before: Worked on backend. After: Architected scalable Node.js microservices using Redis for 40% faster data retrieval.",
    "Before: Used Git. After: Led version control workflows and CI/CD pipelines for a team of 10."
  ],
  "topImprovements": [
    "Add more metrics-driven achievements.",
    "Include a specific section for cloud technologies."
  ]
}

Job Description:
${jobDescription.replace(/<[^>]+>/g, ' ').slice(0, 2000)}

Resume Text:
${resumeText.slice(0, 4000)}
`

        const customSafetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
        ]

        try {
            const result = await this.model.generateContent({
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: {
                    responseMimeType: 'application/json',
                },
                safetySettings: customSafetySettings,
            })
            return this.parseJsonResponse(result.response.text())
        } catch (error) {
            console.error('[AIService.generateResumeOptimization] Error:', error.message)
            throw new Error('Failed to optimize resume using AI.')
        }
    }
}

export default new AIService()
