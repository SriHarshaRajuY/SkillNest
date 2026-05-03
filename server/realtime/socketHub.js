import { Server } from 'socket.io'
import jwt from 'jsonwebtoken'
import JobApplication from '../models/JobApplication.js'

let ioInstance = null

const parseOrigins = () =>
    (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174,http://localhost:5175')
        .split(',')
        .map((o) => o.trim())

/**
 * @param {import('http').Server} httpServer
 */
export function initRealtime(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: parseOrigins(),
            credentials: true,
            methods: ['GET', 'POST'],
        },
        allowEIO3: true,
    })

    io.use((socket, next) => {
        try {
            const token = socket.handshake.auth?.token
            if (!token) {
                return next(new Error('Unauthorized'))
            }
            const decoded = jwt.verify(token, process.env.JWT_SECRET)
            if (decoded.role === 'candidate' && decoded.userId) {
                socket.data.role = 'candidate'
                socket.data.userId = decoded.userId
            } else if (decoded.id) {
                socket.data.role = 'company'
                socket.data.companyId = String(decoded.id)
            } else {
                return next(new Error('Unauthorized'))
            }
            next()
        } catch {
            next(new Error('Unauthorized'))
        }
    })

    io.on('connection', (socket) => {
        socket.on('join-application', async (payload, cb) => {
            try {
                const applicationId = typeof payload === 'string' ? payload : payload?.applicationId
                if (!applicationId) {
                    return cb?.({ ok: false, error: 'applicationId required' })
                }
                const app = await JobApplication.findById(applicationId).select('userId companyId')
                if (!app) {
                    return cb?.({ ok: false, error: 'Not found' })
                }
                const uid = socket.data.userId
                const cid = socket.data.companyId
                const allowed =
                    (socket.data.role === 'candidate' && app.userId === uid)
                    || (socket.data.role === 'company' && app.companyId.toString() === cid)
                if (!allowed) {
                    return cb?.({ ok: false, error: 'Forbidden' })
                }
                socket.join(roomForApplication(applicationId))
                cb?.({ ok: true })
            } catch (e) {
                cb?.({ ok: false, error: e.message })
            }
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

export function emitToApplication(applicationId, event, payload) {
    const io = getIO()
    if (!io) return
    io.to(roomForApplication(applicationId)).emit(event, payload)
}
