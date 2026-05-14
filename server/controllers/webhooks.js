import { Webhook } from "svix";
import User from "../models/User.js";
import logger from "../utils/logger.js";

/**
 * Clerk Webhook Handler
 * Syncs user profile changes from Clerk to MongoDB.
 */
export const clerkWebhooks = async (req, res) => {
    try {
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

        // Verifying Headers
        await whook.verify(JSON.stringify(req.body), {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        })

        const { data, type } = req.body

        switch (type) {
            case 'user.created': {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses[0]?.email_address || '',
                    name: ((data.first_name || '') + " " + (data.last_name || '')).trim(),
                    image: data.image_url,
                    resume: ''
                }
                await User.create(userData)
                logger.info('User created via webhook', { userId: data.id })
                return res.json({ success: true })
            }

            case 'user.updated': {
                const userData = {
                    email: data.email_addresses[0]?.email_address || '',
                    name: ((data.first_name || '') + " " + (data.last_name || '')).trim(),
                    image: data.image_url,
                }
                await User.findByIdAndUpdate(data.id, userData)
                logger.info('User updated via webhook', { userId: data.id })
                return res.json({ success: true })
            }

            case 'user.deleted': {
                await User.findByIdAndDelete(data.id)
                logger.info('User deleted via webhook', { userId: data.id })
                return res.json({ success: true })
            }

            default:
                return res.json({ success: true })
        }

    } catch (error) {
        logger.error('Webhook processing failed', error)
        res.status(400).json({ success: false, message: 'Webhook verification failed' })
    }
}