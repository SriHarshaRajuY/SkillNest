import jwt from 'jsonwebtoken'
import Company from '../models/Company.js'
import logger from '../utils/logger.js'

/**
 * Protect routes that require a logged-in Clerk user.
 * Clerk middleware attaches req.auth automatically.
 */
export const protectUser = (req, res, next) => {
    if (!req.auth?.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required. Please sign in.' })
    }
    next()
}

/**
 * Protect routes that require a logged-in Company (recruiter).
 * Reads a JWT from the `token` request header.
 */
export const protectCompany = async (req, res, next) => {
    const token = req.headers.token

    if (!token) {
        return res.status(401).json({ success: false, message: 'Recruiter authentication required. Please log in.' })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET)
        // Optimization: Use lean() for read-only auth check
        const company = await Company.findById(decoded.id).select('-password').lean()

        if (!company) {
            return res.status(401).json({ success: false, message: 'Recruiter account not found. Please log in again.' })
        }

        req.company = company
        next()
    } catch (error) {
        logger.warn('Recruiter auth failed', { error: error.message })
        return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' })
    }
}