import AuditLog from '../models/AuditLog.js'
import logger from '../utils/logger.js'

export const logAuditEvent = async (req, { action, targetType, targetId, metadata = {} }) => {
    try {
        await AuditLog.create({
            companyId: req.company?._id,
            actorId: req.recruiter?._id,
            actorName: req.recruiter?.name || req.company?.name || 'Legacy admin',
            actorEmail: req.recruiter?.email || req.company?.email || '',
            actorRole: req.recruiter?.role || 'LegacyAdmin',
            action,
            targetType,
            targetId,
            metadata,
        })
    } catch (error) {
        logger.warn('[audit] Could not write audit log', { action, targetId, error: error.message })
    }
}
