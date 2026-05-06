import Job from "../models/Job.js"



// Get All Jobs with Pagination, Filtering, and Sorting
export const getJobs = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 20
        const skip = (page - 1) * limit

        const filter = { visible: true }
        if (req.query.category) filter.category = req.query.category
        if (req.query.level) filter.level = req.query.level

        const totalJobs = await Job.countDocuments(filter)
        const jobs = await Job.find(filter)
            .sort({ date: -1 })
            .skip(skip)
            .limit(limit)
            .populate({ path: 'companyId', select: '-password' })

        res.json({ 
            success: true, 
            jobs, 
            totalJobs, 
            totalPages: Math.ceil(totalJobs / limit),
            currentPage: page 
        })

    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

// Get Single Job Using JobID
export const getJobById = async (req, res) => {
    try {

        const { id } = req.params

        const job = await Job.findById(id)
            .populate({
                path: 'companyId',
                select: '-password'
            })

        if (!job) {
            return res.json({
                success: false,
                message: 'Job not found'
            })
        }

        res.json({
            success: true,
            job
        })

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}