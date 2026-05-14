import Job from "../models/Job.js"
import asyncHandler from "../middleware/asyncHandler.js"

// @desc    Get All Jobs with Pagination, Filtering, and Sorting
// @route   GET /api/jobs
// @access  Public
export const getJobs = asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1)
    const limit = Math.min(100, parseInt(req.query.limit) || 20)
    const skip = (page - 1) * limit

    const filter = { visible: true }
    if (req.query.category) filter.category = req.query.category
    if (req.query.level) filter.level = req.query.level
    if (req.query.location) filter.location = { $regex: req.query.location, $options: 'i' }
    if (req.query.search) {
        filter.title = { $regex: req.query.search, $options: 'i' }
    }

    const sortOption = req.query.sort === 'oldest' ? { date: 1 } : { date: -1 }

    const totalResults = await Job.countDocuments(filter)
    const jobs = await Job.find(filter)
        .select('title description location category level salary date companyId')
        .sort(sortOption)
        .skip(skip)
        .limit(limit)
        .populate({ path: 'companyId', select: 'name image' })
        .lean()

    res.json({ 
        success: true, 
        message: 'Jobs fetched successfully',
        data: {
            jobs, 
            totalResults, 
            totalPages: Math.ceil(totalResults / limit),
            currentPage: page 
        }
    })
})

// @desc    Get Single Job Using JobID
// @route   GET /api/jobs/:id
// @access  Public
export const getJobById = asyncHandler(async (req, res) => {
    const { id } = req.params

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
        res.status(400)
        throw new Error('Invalid Job ID format')
    }

    const job = await Job.findById(id)
        .populate({
            path: 'companyId',
            select: 'name email image'
        })
        .lean()

    if (!job) {
        res.status(404)
        throw new Error('Job not found')
    }

    res.json({
        success: true,
        message: 'Job details fetched successfully',
        data: { job }
    })
})