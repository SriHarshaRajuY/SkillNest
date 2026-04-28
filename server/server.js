import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './config/db.js'
import { clerkWebhooks } from './controllers/webhooks.js'
import companyRoutes from './routes/companyRoutes.js'
import connectCloudinary from './config/cloudinary.js'
import jobRoutes from './routes/jobRoutes.js'
import userRoutes from './routes/userRoutes.js'
import { clerkMiddleware } from '@clerk/express'

const app = express()

// Middlewares
app.use(cors())
app.use(express.json())
app.use(clerkMiddleware())

// Routes
app.get('/', (req, res) => res.send('SkillNest API is running ✅'))
app.post('/webhooks', clerkWebhooks)
app.use('/api/company', companyRoutes)
app.use('/api/jobs', jobRoutes)
app.use('/api/users', userRoutes)

// 404 handler
app.use((req, res) => {
    res.status(404).json({ success: false, message: 'Route not found' })
})

// Global error handler
app.use((err, req, res, next) => {
    console.error(err.stack)
    res.status(500).json({ success: false, message: 'Internal server error' })
})

const PORT = process.env.PORT || 5000

const startServer = async () => {
    await connectDB()
    await connectCloudinary()

    const server = app.listen(PORT, () => {
        console.log(`✅ SkillNest server running on port ${PORT}`)
    })

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`\n❌ Port ${PORT} is already in use!`)
            console.error(`💡 Run: Get-NetTCPConnection -LocalPort ${PORT} -State Listen | ForEach-Object { taskkill /PID $_.OwningProcess /F }\n`)
            process.exit(1)
        } else {
            throw err
        }
    })
}

startServer()