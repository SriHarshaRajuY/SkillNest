import http from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { rateLimit } from 'express-rate-limit'
import { clerkMiddleware } from '@clerk/express'

// Config & Infrastructure
import config from './config/env.js'
import connectDB, { migrateLegacyApplications } from './config/db.js'
import connectCloudinary from './config/cloudinary.js'
import { initRealtime } from './realtime/socketHub.js'
import setupSwagger from './config/swagger.js'
import logger from './utils/logger.js'

// Routes & Middlewares
import { clerkWebhooks } from './controllers/webhooks.js'
import companyRoutes from './routes/companyRoutes.js'
import jobRoutes from './routes/jobRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { errorHandler, notFound } from './middleware/errorHandler.js'

const app = express()

// ─── Setup ───────────────────────────────────────────────────────────────────
setupSwagger(app)
app.disable('x-powered-by')

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(helmet({ contentSecurityPolicy: false }))
app.use(morgan(config.nodeEnv === 'development' ? 'dev' : 'combined'))

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = config.clientUrl.split(',').map(o => o.trim())
app.use(cors({ origin: allowedOrigins, credentials: true }))

// ─── Rate limiting (global protection) ───────────────────────────────────────
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
})
app.use('/api/', limiter)

// ─── Clerk Webhooks (Buffer required) ────────────────────────────────────────
app.post('/webhooks', express.raw({ type: 'application/json' }), clerkWebhooks)

// ─── Body parsing ────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(clerkMiddleware())

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ 
    success: true, 
    message: 'SkillNest API is operational',
    data: { uptime: process.uptime() } 
}))

app.use('/api/company', companyRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/users', userRoutes)

// ─── Error Handling ──────────────────────────────────────────────────────────
app.use(notFound)
app.use(errorHandler)

export { app }

// ─── Server Lifecycle ────────────────────────────────────────────────────────
const startServer = async () => {
    try {
        await connectDB()
        await migrateLegacyApplications()
        connectCloudinary()

        const server = http.createServer(app)
        initRealtime(server)

        server.listen(config.port, () => {
            logger.info(`✅ SkillNest server running on port ${config.port} [${config.nodeEnv}]`)
        })

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                logger.error(`❌ Port ${config.port} is already in use.`)
                process.exit(1)
            } else {
                throw err
            }
        })
    } catch (error) {
        logger.error('❌ Failed to start server:', error)
        process.exit(1)
    }
}

if (config.nodeEnv !== 'test') {
    startServer()
}