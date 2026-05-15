import Joi from 'joi'
import { PIPELINE_STAGES } from '../constants/pipeline.js'

const objectId = Joi.string().hex().length(24)

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
        id: objectId.required(),
        pipelineStage: Joi.string().valid(...PIPELINE_STAGES).required()
    }),

    // ─── Candidate ─────────────────────────────────────────────────────────────
    applyJob: Joi.object({
        jobId: objectId.required()
    }),

    // ─── Messaging ─────────────────────────────────────────────────────────────
    sendMessage: Joi.object({
        applicationId: objectId.required(),
        content: Joi.string().trim().min(1).max(5000).required()
    }),

    internalNote: Joi.object({
        content: Joi.string().trim().min(1).max(4000).required(),
        rating: Joi.number().integer().min(1).max(5).optional()
    }),

    changeVisibility: Joi.object({
        id: objectId.required()
    })
}

export default schemas
