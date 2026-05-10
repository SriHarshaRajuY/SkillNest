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
    try {
        const parsed = new URL(url)
        const pathSegments = parsed.pathname.split('/').filter(Boolean)

        const resourceType = pathSegments.includes('raw')
            ? 'raw'
            : pathSegments.includes('video')
                ? 'video'
                : 'image'

        const queryPublicId = parsed.searchParams.get('public_id')
        if (queryPublicId) {
            const decodedPublicId = decodeURIComponent(queryPublicId)
            const extensionMatch = decodedPublicId.match(/\.([^.]+)$/)
            return {
                publicId: decodedPublicId,
                resourceType,
                deliveryType: 'private',
                extension: extensionMatch ? extensionMatch[1].toLowerCase() : '',
            }
        }

        const deliveryIndex = pathSegments.findIndex((segment) =>
            ['upload', 'private', 'authenticated'].includes(segment),
        )
        if (deliveryIndex === -1) return null

        const deliveryType = pathSegments[deliveryIndex]
        let remainingSegments = pathSegments.slice(deliveryIndex + 1)

        // Cloudinary private/authenticated URLs can contain a signed delivery segment
        // like "s--abc123--" before the version/public_id path. That segment is not
        // part of the asset public_id and must be discarded.
        if (remainingSegments[0] && /^s--[^/]+--$/.test(remainingSegments[0])) {
            remainingSegments = remainingSegments.slice(1)
        }

        let afterDelivery = remainingSegments.join('/')
        afterDelivery = decodeURIComponent(afterDelivery).replace(/^v\d+\//, '')

        const extMatch = afterDelivery.match(/\.([^.]+)$/)
        const extension = extMatch ? extMatch[1].toLowerCase() : ''
        const publicId = resourceType === 'raw'
            ? afterDelivery
            : afterDelivery.replace(/\.[^.]+$/, '')

        return { publicId, resourceType, deliveryType, extension }
    } catch {
        return null
    }
}
