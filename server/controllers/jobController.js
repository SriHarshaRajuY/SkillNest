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
    if (req.query.category) {
        const categories = String(req.query.category).split(',').map((c) => c.trim()).filter(Boolean)
        if (categories.length === 1) filter.category = categories[0]
        if (categories.length > 1) filter.category = { $in: categories }
    }
    if (req.query.level) filter.level = req.query.level
    if (req.query.locationFilter) {
        const locations = String(req.query.locationFilter).split(',').map((l) => l.trim()).filter(Boolean)
        if (locations.length > 0) {
            filter.$or = locations.map((location) => ({ location: { $regex: location, $options: 'i' } }))
        }
    } else if (req.query.location) {
        filter.location = { $regex: req.query.location, $options: 'i' }
    }
    const search = String(req.query.search || '').trim()
    if (search) {
        filter.$text = { $search: search }
    }

    const sortOption = req.query.sort === 'oldest' ? { date: 1 } : { date: -1 }

    const totalResults = await Job.countDocuments(filter)
    const jobs = await Job.find(
        filter,
        filter.$text ? { score: { $meta: 'textScore' } } : {},
    )
        .select('title description location category level salary date companyId')
        .sort(filter.$text ? { score: { $meta: 'textScore' }, date: -1 } : sortOption)
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
