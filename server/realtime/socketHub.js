import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import JobApplication from '../models/JobApplication.js'
import logger from '../utils/logger.js'

let ioInstance = null

export const SOCKET_EVENTS = {
    MESSAGE_NEW: 'message:new',
    PIPELINE_UPDATED: 'pipeline:updated',
    FEEDBACK_UPDATED: 'feedback:updated',
    JOIN_APPLICATION: 'join-application',
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',
}

const parseOrigins = () =>
    (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174,http://localhost:5175')
        .split(',')
        .map((o) => o.trim())

/**
 * Initializes the Socket.io server with authentication and room isolation.
 */
export function initRealtime(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: parseOrigins(),
            credentials: true,
            methods: ['GET', 'POST'],
        }
    })

    // ─── Middleware: Authentication ──────────────────────────────────────────
    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token
            if (!token) return next(new Error('Authentication failed: No token provided'))

            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            
            if (decoded.role === 'candidate' && decoded.userId) {
                socket.data.role = 'candidate'
                socket.data.userId = decoded.userId
            } else if (decoded.id || decoded.companyId) {
                socket.data.role = 'company'
                socket.data.companyId = String(decoded.companyId || decoded.id)
                socket.data.recruiterRole = decoded.role || 'Admin'
            } else {
                return next(new Error('Authentication failed: Invalid token payload'))
            }
            next()
        } catch (error) {
            logger.warn('Socket authentication failed', { error: error.message })
            next(new Error('Authentication failed'))
        }
    })

    io.on('connection', (socket) => {
        const identifier = socket.data.role === 'candidate' ? socket.data.userId : socket.data.companyId
        logger.info(`Socket connected: ${socket.id}`, { role: socket.data.role, id: identifier })

        // ─── Event: Join Application Room ────────────────────────────────────
        socket.on(SOCKET_EVENTS.JOIN_APPLICATION, async (payload, cb) => {
            try {
                const applicationId = typeof payload === 'string' ? payload : payload?.applicationId
                if (!applicationId) return cb?.({ ok: false, error: 'applicationId required' })

                const app = await JobApplication.findById(applicationId).select('userId companyId').lean()
                if (!app) return cb?.({ ok: false, error: 'Application not found' })

                const isAuthorized = 
                    (socket.data.role === 'candidate' && app.userId === socket.data.userId) ||
                    (socket.data.role === 'company' && app.companyId.toString() === socket.data.companyId)

                if (!isAuthorized) {
                    logger.warn(`Unauthorized room join attempt by ${socket.id}`, { applicationId })
                    return cb?.({ ok: false, error: 'Forbidden' })
                }

                socket.join(roomForApplication(applicationId))
                cb?.({ ok: true })
            } catch (error) {
                logger.error('Error joining socket room', error)
                cb?.({ ok: false, error: 'Internal error' })
            }
        })

        // ─── Event: Typing Indicators ────────────────────────────────────────
        socket.on(SOCKET_EVENTS.TYPING_START, (payload) => {
            const applicationId = payload?.applicationId
            if (!applicationId) return
            socket.to(roomForApplication(applicationId)).emit(SOCKET_EVENTS.TYPING_START, {
                applicationId,
                role: socket.data.role,
                userId: socket.id // Simple socket identifier for typing
            })
        })

        socket.on(SOCKET_EVENTS.TYPING_STOP, (payload) => {
            const applicationId = payload?.applicationId
            if (!applicationId) return
            socket.to(roomForApplication(applicationId)).emit(SOCKET_EVENTS.TYPING_STOP, {
                applicationId,
                role: socket.data.role,
                userId: socket.id
            })
        })

        socket.on('disconnect', (reason) => {
            logger.info(`Socket disconnected: ${socket.id}`, { reason })
        })
    })

    ioInstance = io
    return io
}

export function getIO() {
    return ioInstance
}

export function roomForApplication(applicationId) {
    return `app:${applicationId}`
}

/**
 * Standardized emitter for application-specific updates.
 */
export function emitToApplication(applicationId, event, payload) {
    const io = getIO()
    if (!io) return
    io.to(roomForApplication(applicationId)).emit(event, payload)
}
