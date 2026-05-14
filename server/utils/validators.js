import Joi from 'joi'

const schemas = {
    // ─── Recruiter ─────────────────────────────────────────────────────────────
    recruiterRegister: Joi.object({
        name: Joi.string().trim().min(2).max(100).required(),
        email: Joi.string().email().lowercase().trim().required(),
        password: Joi.string().min(8).max(100).required()
    }),

    recruiterLogin: Joi.object({
        email: Joi.string().email().lowercase().trim().required(),
        password: Joi.string().required()
    }),

    postJob: Joi.object({
        title: Joi.string().trim().min(2).max(200).required(),
        description: Joi.string().trim().min(10).required(),
        location: Joi.string().trim().required(),
        salary: Joi.number().positive().required(),
        level: Joi.string().required(),
        category: Joi.string().required()
    }),

    updatePipeline: Joi.object({
        id: Joi.string().required(),
        pipelineStage: Joi.string().valid('Applied', 'Shortlisted', 'Interview', 'Technical', 'HR', 'Offer', 'Rejected').required()
    }),

    // ─── Candidate ─────────────────────────────────────────────────────────────
    applyJob: Joi.object({
        jobId: Joi.string().required()
    }),

    // ─── Messaging ─────────────────────────────────────────────────────────────
    sendMessage: Joi.object({
        applicationId: Joi.string().required(),
        content: Joi.string().trim().min(1).max(5000).required()
    })
}

export default schemas
