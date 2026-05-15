import Joi from 'joi'
import { RECRUITER_PIPELINE_STAGES } from '../constants/pipeline.js'

const objectId = Joi.string().hex().length(24)
const strongPassword = Joi.string()
    .min(8)
    .max(100)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .messages({
        'string.empty': 'Password is required.',
        'string.min': 'Password must be at least 8 characters.',
        'string.max': 'Password must be 100 characters or fewer.',
        'string.pattern.base': 'Password must include uppercase, lowercase, and a number.',
    })

const schemas = {
    // ─── Recruiter ─────────────────────────────────────────────────────────────
    recruiterRegister: Joi.object({
        name: Joi.string().trim().min(2).max(100).required().messages({
            'string.empty': 'Company name is required.',
            'string.min': 'Company name must be at least 2 characters.',
            'string.max': 'Company name must be 100 characters or fewer.',
        }),
        email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required().messages({
            'string.empty': 'Work email is required.',
            'string.email': 'Enter a valid work email address.',
        }),
        password: strongPassword.required()
    }),

    recruiterLogin: Joi.object({
        email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required().messages({
            'string.empty': 'Work email is required.',
            'string.email': 'Enter a valid work email address.',
        }),
        password: Joi.string().min(8).max(100).required().messages({
            'string.empty': 'Password is required.',
            'string.min': 'Password must be at least 8 characters.',
            'string.max': 'Password must be 100 characters or fewer.',
        })
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
        pipelineStage: Joi.string().valid(...RECRUITER_PIPELINE_STAGES).required()
    }),

    updateJob: Joi.object({
        title: Joi.string().trim().min(2).max(200).required(),
        description: Joi.string().trim().min(10).required(),
        location: Joi.string().trim().required(),
        salary: Joi.number().positive().required(),
        level: Joi.string().required(),
        category: Joi.string().required()
    }),

    createTeamMember: Joi.object({
        name: Joi.string().trim().min(2).max(100).required().messages({
            'string.empty': 'Recruiter name is required.',
            'string.min': 'Recruiter name must be at least 2 characters.',
            'string.max': 'Recruiter name must be 100 characters or fewer.',
        }),
        email: Joi.string().email({ tlds: { allow: false } }).lowercase().trim().required().messages({
            'string.empty': 'Work email is required.',
            'string.email': 'Enter a valid work email address.',
        }),
        password: strongPassword.required(),
        role: Joi.string().valid('Admin', 'Recruiter', 'Viewer').required()
    }),

    updateTeamMember: Joi.object({
        name: Joi.string().trim().min(2).max(100).optional(),
        role: Joi.string().valid('Admin', 'Recruiter', 'Viewer').optional(),
        status: Joi.string().valid('Active', 'Suspended').optional(),
    }).min(1),

    // ─── Candidate ─────────────────────────────────────────────────────────────
    applyJob: Joi.object({
        jobId: objectId.required()
    }),

    candidatePreferences: Joi.object({
        skills: Joi.array().items(Joi.string().trim().min(1).max(40)).max(20).default([]),
        preferredLocations: Joi.array().items(Joi.string().trim().min(1).max(80)).max(10).default([]),
        preferredCategories: Joi.array().items(Joi.string().trim().min(1).max(80)).max(10).default([]),
        experienceLevel: Joi.string().trim().max(80).allow('').default('')
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
