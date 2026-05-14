import logger from '../utils/logger.js'

export const notFound = (req, res, next) => {
    const error = new Error(`Not Found - ${req.originalUrl}`)
    res.status(404)
    next(error)
}

export const errorHandler = (err, req, res, next) => {
    let statusCode = res.statusCode === 200 ? 500 : res.statusCode
    let message = err.message

    // Check for Mongoose bad ObjectId
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
        statusCode = 404
        message = 'Resource not found'
    }

    // Check for Mongoose duplicate key
    if (err.code === 11000) {
        statusCode = 409
        message = 'Duplicate field value entered'
    }

    // Check for Multer errors
    if (err.name === 'MulterError') {
        statusCode = 400
        message = err.message
    }

    logger.error(`[GlobalErrorHandler] ${message}`, err)

    res.status(statusCode).json({
        success: false,
        message,
        stack: process.env.NODE_ENV === 'production' ? null : err.stack,
    })
}
