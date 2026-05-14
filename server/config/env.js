import dotenv from 'dotenv';
dotenv.config();

/**
 * Validates essential environment variables on startup.
 * Prevents the application from running in an inconsistent state.
 */
const requiredEnv = [
    'JWT_SECRET',
    'MONGODB_URI',
    'GEMINI_API_KEY',
    'CLOUDINARY_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_SECRET_KEY',
    'CLERK_WEBHOOK_SECRET'
];

const missing = requiredEnv.filter(key => !process.env[key]);

if (missing.length > 0) {
    console.error(`\n❌ FATAL STARTUP ERROR: Missing Environment Variables:`);
    console.error(`   ${missing.join(', ')}`);
    console.error(`   Please check your .env file.\n`);
    process.exit(1);
}

const config = {
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: process.env.JWT_SECRET,
    mongoUri: process.env.MONGODB_URI,
    geminiApiKey: process.env.GEMINI_API_KEY,
    cloudinary: {
        name: process.env.CLOUDINARY_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_SECRET_KEY
    },
    clerkWebhookSecret: process.env.CLERK_WEBHOOK_SECRET,
    redisUrl: process.env.REDIS_URL,
    clientUrl: process.env.CLIENT_URL || 'http://localhost:5173,http://localhost:5174,http://localhost:5175'
};

export default config;
