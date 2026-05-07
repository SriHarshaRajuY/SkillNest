import http from 'http'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import { rateLimit } from 'express-rate-limit'
import 'dotenv/config'
import { clerkMiddleware } from '@clerk/express'
import connectDB, { migrateLegacyApplications } from './config/db.js'
import connectCloudinary from './config/cloudinary.js'
import { initRealtime } from './realtime/socketHub.js'
import { clerkWebhooks } from './controllers/webhooks.js'
import { initCredibilityCron } from './jobs/credibilityCron.js'
import companyRoutes from './routes/companyRoutes.js'
import jobRoutes from './routes/jobRoutes.js'
import userRoutes from './routes/userRoutes.js'
import setupSwagger from './config/swagger.js'

const app = express()
setupSwagger(app)
const PORT = process.env.PORT || 5000

// ─── Security & Logging ───────────────────────────────────────────────────────
app.disable('x-powered-by')
app.use(helmet({ contentSecurityPolicy: false }))
app.use(morgan('dev'))

// ─── CORS ────────────────────────────────────────────────────────────────────
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174,http://localhost:5175')
    .split(',').map(o => o.trim())

app.use(cors({ origin: allowedOrigins, credentials: true }))

// ─── Rate limiting (auth routes) ─────────────────────────────────────────────
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
})

// ─── Clerk Webhooks — MUST come before express.json() ────────────────────────
// Svix needs the raw request body buffer to verify the HMAC signature.
// If express.json() runs first, req.body becomes a parsed object and verification fails.
app.post('/webhooks', express.raw({ type: 'application/json' }), clerkWebhooks)

// ─── Body parsing & Clerk middleware ─────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))
app.use(clerkMiddleware())

// ─── Routes ──────────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ success: true, message: 'SkillNest API is running ✅' }))
app.use('/api/company', companyRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/users', userRoutes)

import { errorHandler, notFound } from './middleware/errorHandler.js'

// ─── 404 ─────────────────────────────────────────────────────────────────────
app.use(notFound)

// ─── Global error handler ────────────────────────────────────────────────────
app.use(errorHandler)

export { app }

// ─── Startup ─────────────────────────────────────────────────────────────────
const startServer = async () => {
    try {
        await connectDB()
        await migrateLegacyApplications()
        connectCloudinary()
        initCredibilityCron() // Start the background jobs

        const server = http.createServer(app)
        initRealtime(server)

        server.listen(PORT, () => {
            console.log(`✅ SkillNest server running on port ${PORT}`)
        })

        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.error(`\n❌ Port ${PORT} is already in use. Run: npm run dev (it auto-kills the port)\n`)
                process.exit(1)
            } else {
                throw err
            }
        })
    } catch (error) {
        console.error('❌ Failed to start server:', error.message)
        process.exit(1)
    }
}

if (process.env.NODE_ENV !== 'test') {
    startServer()
}