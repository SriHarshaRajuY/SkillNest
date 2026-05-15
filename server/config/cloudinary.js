import { v2 as cloudinary } from 'cloudinary'
import config from './env.js'

const connectCloudinary = async () => {

    cloudinary.config({
        cloud_name: config.cloudinary.name,
        api_key: config.cloudinary.apiKey,
        api_secret: config.cloudinary.apiSecret
    })

}

export default connectCloudinary
