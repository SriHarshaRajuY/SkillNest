import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        // Sanitize filename: remove special characters, replace spaces with underscores
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        const ext = path.extname(file.originalname).toLowerCase()
        const baseName = path.basename(file.originalname, ext)
            .replace(/[^a-z0-9]/gi, '_')
            .toLowerCase()
        cb(null, `${baseName}-${uniqueSuffix}${ext}`)
    }
})

const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    
    if (file.fieldname === 'resume') {
        const allowedMimes = ['application/pdf']
        const allowedExts = ['.pdf']
        
        if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
            cb(null, true)
        } else {
            cb(new Error('Only PDF resumes are allowed.'), false)
        }
    } else if (file.fieldname === 'image') {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
        const allowedExts = ['.jpg', '.jpeg', '.png', '.webp']
        
        if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
            cb(null, true)
        } else {
            cb(new Error('Only JPEG, PNG, or WEBP images are allowed.'), false)
        }
    } else {
        cb(new Error('Unexpected file field.'), false)
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: { 
        fileSize: 5 * 1024 * 1024 // 5MB max
    } 
})

export default upload