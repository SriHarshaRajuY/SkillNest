/**
 * Standardized Logger Utility
 * In a real production app, this could wrap Winston or Pino.
 * For this project, we provide a clean, consistent console interface
 * that is easy to replace later.
 */
const logger = {
    info: (message, meta = {}) => {
        const timestamp = new Date().toISOString()
        console.log(`[${timestamp}] INFO: ${message}`, Object.keys(meta).length ? meta : '')
    },
    warn: (message, meta = {}) => {
        const timestamp = new Date().toISOString()
        console.warn(`[${timestamp}] WARN: ${message}`, Object.keys(meta).length ? meta : '')
    },
    error: (message, error = {}) => {
        const timestamp = new Date().toISOString()
        const errorDetails = error instanceof Error ? { message: error.message, stack: error.stack } : error
        console.error(`[${timestamp}] ERROR: ${message}`, errorDetails)
    },
    debug: (message, meta = {}) => {
        if (process.env.NODE_ENV !== 'production') {
            const timestamp = new Date().toISOString()
            console.debug(`[${timestamp}] DEBUG: ${message}`, Object.keys(meta).length ? meta : '')
        }
    }
}

export default logger
