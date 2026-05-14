import logger from './logger.js'

/**
 * Safely parse JSON from AI response, handling markdown blocks and common errors.
 */
export const safeJsonParse = (text, fallback = null) => {
    if (!text) return fallback
    try {
        const cleaned = text
            .replace(/```json/gi, '')
            .replace(/```/g, '')
            .trim()
        return JSON.parse(cleaned)
    } catch (error) {
        logger.warn('[safeJsonParse] Failed to parse AI JSON', { text, error: error.message })
        return fallback
    }
}

/**
 * Truncate context to stay within token/character limits for AI prompts.
 */
export const truncateContext = (text, maxChars = 15000) => {
    if (!text) return ''
    if (text.length <= maxChars) return text
    return text.slice(0, maxChars) + '\n...[truncated]'
}

/**
 * Wrapper for async functions with a timeout.
 */
export const withTimeout = (promise, ms, timeoutError = 'Operation timed out') => {
    let timeoutId
    const timeoutPromise = new Promise((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(timeoutError)), ms)
    })
    return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeoutId))
}
