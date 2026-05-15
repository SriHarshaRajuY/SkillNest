import jwt from 'jsonwebtoken'
import { getAuth } from '@clerk/express'
import Company from '../models/Company.js'
import RecruiterUser from '../models/RecruiterUser.js'
import logger from '../utils/logger.js'

export const getClerkAuth = (req) => {
    try {
        return getAuth(req)
    } catch {
        return req.auth || {}
    }
}

export const protectUser = (req, res, next) => {
    const auth = getClerkAuth(req)
    if (!auth?.userId) {
        return res.status(401).json({ success: false, message: 'Authentication required. Please sign in.' })
    }
    req.auth = auth
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
        const companyId = decoded.companyId || decoded.id
        const company = await Company.findById(companyId).select('-password').lean()

        if (!company) {
            return res.status(401).json({ success: false, message: 'Recruiter account not found. Please log in again.' })
        }

        let recruiter = null
        if (decoded.recruiterId) {
            recruiter = await RecruiterUser.findOne({
                _id: decoded.recruiterId,
                companyId: company._id,
                status: 'Active',
            }).select('-password').lean()

            if (!recruiter) {
                return res.status(401).json({ success: false, message: 'Recruiter account is inactive or no longer exists.' })
            }
        } else {
            recruiter = {
                _id: company._id,
                companyId: company._id,
                name: company.name,
                email: company.email,
                role: 'Admin',
                status: 'Active',
                legacy: true,
            }
        }

        req.company = company
        req.recruiter = recruiter
        next()
    } catch (error) {
        logger.warn('Recruiter auth failed', { error: error.message })
        return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' })
    }
}

export const requireRecruiterRole = (...allowedRoles) => (req, res, next) => {
    const role = req.recruiter?.role || 'Admin'
    if (!allowedRoles.includes(role)) {
        return res.status(403).json({
            success: false,
            message: 'You do not have permission to perform this action.',
        })
    }
    next()
}
