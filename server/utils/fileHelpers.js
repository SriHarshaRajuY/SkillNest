import fs from 'fs'

/**
 * Safely delete a local temp file (e.g. multer upload) without throwing.
 */
export const removeLocalFile = (filePath) => {
    if (!filePath) return
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath)
        }
    } catch (err) {
        console.warn('[fileHelpers] Could not delete temp file:', filePath, err.message)
    }
}

/**
 * Extract the Cloudinary public_id and resource_type from a secure_url.
 *
 * Raw files (PDFs) have the extension as part of the public_id.
 * Image files do NOT include the extension in the public_id.
 */
export const extractCloudinaryAsset = (url) => {
    if (!url || !url.includes('cloudinary.com')) return null

    // Detect resource type from the URL path
    const resourceType = url.includes('/raw/upload/') ? 'raw'
        : url.includes('/video/upload/') ? 'video'
            : 'image'

    const uploadIndex = url.indexOf('/upload/')
    if (uploadIndex === -1) return null

    let afterUpload = url.substring(uploadIndex + 8)

    // Strip optional version prefix (e.g. v1234567890/)
    afterUpload = afterUpload.replace(/^v\d+\//, '')

    // Extract extension
    const extMatch = afterUpload.match(/\.([^.]+)$/)
    const extension = extMatch ? extMatch[1].toLowerCase() : ''
    
    // For raw files: keep the extension (e.g. resume.pdf)
    // For images: strip the extension (Cloudinary public_id has no extension)
    const publicId = resourceType === 'raw'
        ? afterUpload
        : afterUpload.replace(/\.[^.]+$/, '')

    return { publicId, resourceType, extension }
}
