import express from 'express'
import { getJobById, getJobs } from '../controllers/jobController.js';

const router = express.Router()

// Route to get all jobs data
/**
 * @swagger
 * /api/jobs:
 *   get:
 *     summary: Get all public job listings
 *     tags: [Jobs]
 */
router.get('/', getJobs)

/**
 * @swagger
 * /api/jobs/{id}:
 *   get:
 *     summary: Get job details by ID
 *     tags: [Jobs]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 */
router.get('/:id', getJobById)


export default router;