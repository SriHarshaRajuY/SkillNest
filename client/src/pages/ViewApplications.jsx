import { useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'
import { useSkillNestSocket } from '../hooks/useSkillNestSocket'
import { recruiterService } from '../services/recruiterService'
import { PIPELINE_LABELS, PIPELINE_STAGES, RECRUITER_PIPELINE_STAGES } from '../constants/pipeline'

import KanbanBoard from '../components/KanbanBoard'
import ApplicationsTable from '../components/ApplicationsTable'
import ApplicationDetailsPanel from '../components/ApplicationDetailsPanel'
import Pagination from '../components/Pagination'

function displayPipelineStage(app) {
    if (app.pipelineStage) return app.pipelineStage
    if (app.status === 'Accepted') return 'Offer'
    if (app.status === 'Rejected') return 'Rejected'
    return 'Applied'
}

const defaultFilters = {
    search: '',
    jobId: '',
    pipelineStage: '',
    minScore: '',
    sort: 'newest',
}

const ViewApplications = () => {
    const { companyToken, companyLoaded, companyData } = useContext(AppContext)
    const recruiterRole = companyData?.currentRecruiter?.role || 'Admin'
    const canReview = recruiterRole === 'Admin' || recruiterRole === 'Recruiter'

    const [applicants, setApplicants] = useState(null)
    const [pagination, setPagination] = useState(null)
    const [jobOptions, setJobOptions] = useState([])
    const [filters, setFilters] = useState(defaultFilters)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(20)
    const [viewMode, setViewMode] = useState('table')
    const [matchResults, setMatchResults] = useState({})
    const [selectedId, setSelectedId] = useState(null)
    const [noteBody, setNoteBody] = useState('')
    const [noteRating, setNoteRating] = useState(5)
    const [savingNote, setSavingNote] = useState(false)

    const applicationIds = useMemo(
        () => (Array.isArray(applicants) ? applicants.map((a) => a._id) : []),
        [applicants],
    )

    useSkillNestSocket({
        backendUrl: (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, ''),
        authToken: companyToken || null,
        applicationIds,
        handlers: {
            'pipeline:updated': (payload) => {
                const { applicationId, pipelineStage, pipelineHistory, status } = payload
                setApplicants((prev) =>
                    !prev ? prev : prev.map((a) =>
                        String(a._id) === String(applicationId)
                            ? { ...a, pipelineStage, pipelineHistory, status }
                            : a,
                    ),
                )
            },
            'feedback:updated': (payload) => {
                const { applicationId, internalNotes } = payload
                setApplicants((prev) =>
                    !prev ? prev : prev.map((a) =>
                        String(a._id) === String(applicationId) ? { ...a, internalNotes } : a,
                    ),
                )
            },
        },
    })

    const queryParams = useMemo(() => {
        const params = { page: currentPage, limit: pageSize, sort: filters.sort }
        if (filters.search.trim()) params.search = filters.search.trim()
        if (filters.jobId) params.jobId = filters.jobId
        if (filters.pipelineStage) params.pipelineStage = filters.pipelineStage
        if (filters.minScore) params.minScore = filters.minScore
        return params
    }, [filters, currentPage, pageSize])

    useEffect(() => {
        setCurrentPage(1)
    }, [filters, pageSize])

    const fetchApplicants = useCallback(async () => {
        try {
            const response = await recruiterService.getApplicants(queryParams)
            if (response.success) {
                setApplicants(response.data.applications || [])
                setPagination(response.data.pagination || null)
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load applicants')
            setApplicants([])
        }
    }, [queryParams])

    const fetchJobOptions = useCallback(async () => {
        try {
            const response = await recruiterService.getPostedJobs({ limit: 100 })
            if (response.success) setJobOptions(response.data.jobs || [])
        } catch {
            setJobOptions([])
        }
    }, [])

    const changePipeline = async (id, pipelineStage) => {
        if (!canReview) {
            toast.error('Viewer role cannot update pipeline stages')
            return
        }
        try {
            const response = await recruiterService.updatePipelineStage({ id, pipelineStage })
            if (response.success) {
                toast.success(`Candidate moved to ${PIPELINE_LABELS[pipelineStage] || pipelineStage}`)
                setApplicants((prev) =>
                    !prev ? prev : prev.map((a) =>
                        String(a._id) === String(id) ? response.data.application : a,
                    ),
                )
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update pipeline')
        }
    }

    const submitInternalNote = async () => {
        if (!canReview) {
            toast.error('Viewer role cannot add internal notes')
            return
        }
        if (!selectedId || !noteBody.trim()) {
            toast.error('Note content is required')
            return
        }
        setSavingNote(true)
        try {
            const response = await recruiterService.addInternalNote(selectedId, {
                content: noteBody.trim(),
                rating: noteRating
            })
            if (response.success) {
                toast.success('Internal note shared')
                setNoteBody('')
                setApplicants((prev) =>
                    !prev ? prev : prev.map((a) =>
                        String(a._id) === String(selectedId)
                            ? { ...a, internalNotes: response.data.internalNotes }
                            : a,
                    ),
                )
            }
        } catch (error) {
            toast.error(error.message || 'Failed to add note')
        } finally {
            setSavingNote(false)
        }
    }

    const viewApplicantResume = async (applicationId) => {
        if (!canReview) {
            toast.error('Viewer role cannot access applicant resumes')
            return
        }

        try {
            const response = await recruiterService.getApplicantResume(applicationId)
            if (response.success && response.data.url) {
                window.open(response.data.url, '_blank')
            }
        } catch (error) {
            toast.error(error.message || 'Failed to open resume')
        }
    }

    const handleAIMatch = async (applicationId) => {
        if (!canReview) {
            toast.error('Viewer role cannot generate AI scores')
            return
        }
        setMatchResults(prev => ({ ...prev, [applicationId]: { loading: true } }))
        try {
            const response = await recruiterService.matchResume(applicationId)
            if (response.success) {
                setMatchResults(prev => ({
                    ...prev,
                    [applicationId]: { loading: false, ...response.data },
                }))
                setApplicants((prev) => !prev ? prev : prev.map((a) =>
                    String(a._id) === String(applicationId)
                        ? { ...a, matchScore: response.data.score }
                        : a
                ))
                toast.success('AI match explanation generated')
            }
        } catch (error) {
            const message = error.message || 'Match score failed'
            setMatchResults(prev => ({ ...prev, [applicationId]: { loading: false, error: message } }))
            toast.error(message)
        }
    }

    const handleDragStart = (e, applicantId) => {
        e.dataTransfer.setData('applicantId', applicantId)
    }

    const handleDragOver = (e) => {
        e.preventDefault()
    }

    const handleDrop = async (e, newStage) => {
        e.preventDefault()
        const applicantId = e.dataTransfer.getData('applicantId')
        if (applicantId) {
            const applicant = applicants.find(a => a._id === applicantId)
            const current = applicant ? displayPipelineStage(applicant) : null
            if (applicant && current !== newStage && newStage !== 'Withdrawn') {
                await changePipeline(applicantId, newStage)
            }
        }
    }

    useEffect(() => {
        if (companyToken) {
            fetchApplicants()
        }
    }, [companyToken, fetchApplicants])

    useEffect(() => {
        if (companyToken) fetchJobOptions()
    }, [companyToken, fetchJobOptions])

    const selectedApplicant = useMemo(() =>
        Array.isArray(applicants) && selectedId
            ? applicants.find((a) => String(a._id) === String(selectedId))
            : null
    , [applicants, selectedId])

    const selectedMatch = selectedId ? matchResults[selectedId] : null
    const validApplicants = Array.isArray(applicants)
        ? applicants.filter(item => item.jobId && item.userId)
        : []
    const hasActiveFilters = Object.entries(filters).some(([key, value]) => key !== 'sort' && Boolean(value))

    if (!companyLoaded || applicants === null) return <Loading />

    return (
        <div className='max-w-7xl mx-auto animate-fade-in'>
            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-6'>
                <div>
                    <h1 className='text-3xl font-bold text-slate-900 tracking-tight'>Hiring Pipeline</h1>
                    <p className='text-sm text-slate-500 mt-1 font-medium'>
                        Filter, score, and move candidates through each stage with a clean recruiter workflow.
                    </p>
                </div>
                <div className='bg-slate-100 p-1 rounded-xl flex gap-1 self-start border border-slate-200 shadow-inner'>
                    <button
                        type='button'
                        onClick={() => setViewMode('table')}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'table' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Table
                    </button>
                    <button
                        type='button'
                        onClick={() => setViewMode('kanban')}
                        className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${viewMode === 'kanban' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Kanban
                    </button>
                </div>
            </div>

            <div className='mb-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm'>
                <div className='grid grid-cols-1 md:grid-cols-5 gap-3'>
                    <label className='md:col-span-2'>
                        <span className='text-xs font-bold uppercase tracking-wider text-slate-500'>Search</span>
                        <input
                            value={filters.search}
                            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                            placeholder='Candidate or job title'
                            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                        />
                    </label>
                    <label>
                        <span className='text-xs font-bold uppercase tracking-wider text-slate-500'>Job</span>
                        <select
                            value={filters.jobId}
                            onChange={(e) => setFilters({ ...filters, jobId: e.target.value })}
                            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                        >
                            <option value=''>All jobs</option>
                            {jobOptions.map((job) => <option key={job._id} value={job._id}>{job.title}</option>)}
                        </select>
                    </label>
                    <label>
                        <span className='text-xs font-bold uppercase tracking-wider text-slate-500'>Stage</span>
                        <select
                            value={filters.pipelineStage}
                            onChange={(e) => setFilters({ ...filters, pipelineStage: e.target.value })}
                            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                        >
                            <option value=''>All stages</option>
                            {PIPELINE_STAGES.map((stage) => <option key={stage} value={stage}>{PIPELINE_LABELS[stage]}</option>)}
                        </select>
                    </label>
                    <label>
                        <span className='text-xs font-bold uppercase tracking-wider text-slate-500'>Sort</span>
                        <select
                            value={filters.sort}
                            onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
                            className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                        >
                            <option value='newest'>Newest first</option>
                            <option value='oldest'>Oldest first</option>
                            <option value='score_desc'>Highest match</option>
                            <option value='score_asc'>Lowest match</option>
                            <option value='updated'>Recently updated</option>
                        </select>
                    </label>
                </div>
                <div className='mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                    <label className='flex items-center gap-3 text-sm text-slate-600'>
                        <span className='font-semibold'>Minimum AI score</span>
                        <input
                            type='number'
                            min='0'
                            max='100'
                            value={filters.minScore}
                            onChange={(e) => setFilters({ ...filters, minScore: e.target.value })}
                            placeholder='Any'
                            className='w-24 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                        />
                    </label>
                    <div className='flex items-center gap-3'>
                        <span className='text-sm text-slate-500'>
                            Showing <strong className='text-slate-800'>{validApplicants.length}</strong>
                            {pagination?.totalResults ? ` of ${pagination.totalResults}` : ''} applicants
                        </span>
                        <select
                            value={pageSize}
                            onChange={(e) => setPageSize(Number(e.target.value))}
                            className='rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 outline-none focus:border-indigo-500'
                        >
                            {[10, 20, 50].map((size) => <option key={size} value={size}>{size}/page</option>)}
                        </select>
                        {hasActiveFilters && (
                            <button
                                type='button'
                                onClick={() => setFilters(defaultFilters)}
                                className='rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50'
                            >
                                Reset filters
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {validApplicants.length === 0 ? (
                <div className='flex flex-col items-center justify-center h-[45vh] text-center animate-fade-in rounded-xl border border-dashed border-slate-200 bg-slate-50'>
                    <div className='w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 font-bold mb-4'>0</div>
                    <h3 className='text-xl text-slate-800 font-bold'>No matching applications</h3>
                    <p className='text-sm text-slate-400 mt-2 max-w-xs'>
                        {hasActiveFilters ? 'Try relaxing the filters to see more candidates.' : 'Candidates applying for your roles will appear here.'}
                    </p>
                </div>
            ) : (
                <div className={`flex gap-8 ${viewMode === 'kanban' ? 'flex-col xl:flex-row' : 'flex-col'}`}>
                    <div className='flex-1 min-w-0'>
                        {viewMode === 'table' ? (
                            <div className='bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden'>
                                <ApplicationsTable
                                    applicants={validApplicants}
                                    selectedId={selectedId}
                                    setSelectedId={setSelectedId}
                                    viewApplicantResume={viewApplicantResume}
                                    handleAIMatch={handleAIMatch}
                                    matchResults={matchResults}
                                    displayPipelineStage={displayPipelineStage}
                                    changePipeline={changePipeline}
                                    stageOptions={RECRUITER_PIPELINE_STAGES}
                                    canReview={canReview}
                                />
                            </div>
                        ) : (
                            <KanbanBoard
                                validApplicants={validApplicants}
                                displayPipelineStage={displayPipelineStage}
                                handleDragOver={handleDragOver}
                                handleDrop={handleDrop}
                                handleDragStart={handleDragStart}
                                selectedId={selectedId}
                                setSelectedId={setSelectedId}
                                viewApplicantResume={viewApplicantResume}
                                handleAIMatch={handleAIMatch}
                                matchResults={matchResults}
                                canReview={canReview}
                            />
                        )}
                    </div>

                    <ApplicationDetailsPanel
                        selectedApplicant={selectedApplicant}
                        selectedMatch={selectedMatch}
                        setSelectedId={setSelectedId}
                        noteBody={noteBody}
                        setNoteBody={setNoteBody}
                        noteRating={noteRating}
                        setNoteRating={setNoteRating}
                        savingNote={savingNote}
                        submitInternalNote={submitInternalNote}
                        viewMode={viewMode}
                        viewApplicantResume={viewApplicantResume}
                        canReview={canReview}
                    />
                </div>
            )}
            {pagination?.totalPages > 1 && (
                <Pagination
                    currentPage={pagination.currentPage || currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={setCurrentPage}
                />
            )}
        </div>
    )
}

export default ViewApplications
