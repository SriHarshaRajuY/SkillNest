import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

// Resolve __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure temp upload directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir)
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname.replace(/\s+/g, '_'))
    }
})

// Allow only PDF for resumes and images for company logos
const fileFilter = (req, file, cb) => {
    if (file.fieldname === 'resume') {
        if (file.mimetype === 'application/pdf') {
            cb(null, true)
        } else {
            cb(new Error('Resumes must be in PDF format'), false)
        }
    } else if (file.fieldname === 'image') {
        const imageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
        if (imageMimes.includes(file.mimetype)) {
            cb(null, true)
        } else {
            cb(new Error('Logo must be an image file (JPEG, PNG, WEBP)'), false)
        }
    } else {
        cb(null, true)
    }
}

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
})

export default upload