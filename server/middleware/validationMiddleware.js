import logger from '../utils/logger.js'

/**
 * Standardized validation middleware factory.
 * @param {Object} schema - Joi validation schema.
 */
const validate = (schema) => (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        errors: { wrap: { label: false } }
    })

    if (error) {
        const errors = error.details.map(detail => detail.message)
        logger.warn('Validation failed', { path: req.originalUrl, errors })
        return res.status(400).json({
            success: false,
            message: 'Validation failed',
            errors
        })
    }

    req.body = value // Replace req.body with sanitized and validated value
    next()
}

export default validate
