import { Webhook } from "svix";
import User from "../models/User.js";

// API Controller Function to Manage Clerk User with database
export const clerkWebhooks = async (req, res) => {
    try {

        // Create a Svix instance with clerk webhook secret.
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

        // Verifying Headers
        await whook.verify(JSON.stringify(req.body), {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        })

        // Getting Data from request body
        const { data, type } = req.body

        // Switch Cases for different Events
        switch (type) {
            case 'user.created': {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: (data.first_name || '') + " " + (data.last_name || ''),
                    image: data.image_url,
                    resume: ''
                }
                await User.create(userData)
                return res.json({ success: true })
            }

            case 'user.updated': {
                const userData = {
                    email: data.email_addresses[0].email_address,
                    name: (data.first_name || '') + " " + (data.last_name || ''),
                    image: data.image_url,
                }
                await User.findByIdAndUpdate(data.id, userData)
                return res.json({ success: true })
            }

            case 'user.deleted': {
                await User.findByIdAndDelete(data.id)
                return res.json({ success: true })
            }

            default:
                return res.json({ success: true })
        }

    } catch (error) {
        console.error('Webhook error:', error.message)
        res.status(400).json({ success: false, message: error.message })
    }
}