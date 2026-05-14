import { useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'
import { useSkillNestSocket } from '../hooks/useSkillNestSocket'
import { recruiterService } from '../services/recruiterService'

// Modular components
import KanbanBoard from '../components/KanbanBoard'
import ApplicationsTable from '../components/ApplicationsTable'
import ApplicationDetailsPanel from '../components/ApplicationDetailsPanel'

function displayPipelineStage(app) {
    if (app.pipelineStage) return app.pipelineStage
    if (app.status === 'Accepted') return 'Offer'
    if (app.status === 'Rejected') return 'Rejected'
    return 'Applied'
}

const ViewApplications = () => {
    const { companyToken, companyLoaded } = useContext(AppContext)

    const [applicants, setApplicants] = useState(null)
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

    // ─── Socket.io Integration ───────────────────────────────────────────────
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

    // ─── Actions ─────────────────────────────────────────────────────────────
    const fetchApplicants = useCallback(async () => {
        try {
            const response = await recruiterService.getApplicants()
            if (response.success) {
                setApplicants(response.data.applications)
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load applicants')
        }
    }, [])

    const changePipeline = async (id, pipelineStage) => {
        try {
            const response = await recruiterService.updatePipelineStage({ id, pipelineStage })
            if (response.success) {
                toast.success(`Candidate moved to ${pipelineStage}`)
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
        setMatchResults(prev => ({ ...prev, [applicationId]: { loading: true } }))
        try {
            const response = await recruiterService.matchResume(applicationId)
            if (response.success) {
                setMatchResults(prev => ({
                    ...prev,
                    [applicationId]: { loading: false, score: response.data.score, reason: response.data.reason },
                }))
                toast.success('AI Match generated')
            }
        } catch (error) {
            const message = error.message || 'AI Match failed'
            setMatchResults(prev => ({ ...prev, [applicationId]: { loading: false, error: message } }))
            toast.error(message)
        }
    }

    // ─── Drag & Drop ────────────────────────────────────────────────────────
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
            if (applicant && current !== newStage) {
                await changePipeline(applicantId, newStage)
            }
        }
    }

    useEffect(() => {
        if (companyToken) {
            fetchApplicants()
        }
    }, [companyToken, fetchApplicants])

    const selectedApplicant = useMemo(() => 
        Array.isArray(applicants) && selectedId
            ? applicants.find((a) => String(a._id) === String(selectedId))
            : null
    , [applicants, selectedId])

    if (!companyLoaded || applicants === null) return <Loading />

    if (applicants.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center h-[70vh] text-center animate-fade-in'>
                <div className='text-6xl mb-6 grayscale'>📋</div>
                <h3 className='text-xl text-slate-800 font-bold'>No Applications Yet</h3>
                <p className='text-sm text-slate-400 mt-2 max-w-xs'>
                    Candidates applying for your roles will appear here. Try posting a new job!
                </p>
            </div>
        )
    }

    const validApplicants = applicants.filter(item => item.jobId && item.userId)

    return (
        <div className='max-w-7xl mx-auto animate-fade-in'>
            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8'>
                <div>
                    <h1 className='text-3xl font-bold text-slate-900 tracking-tight'>Hiring Pipeline</h1>
                    <p className='text-sm text-slate-500 mt-1 font-medium'>
                        Manage candidates through their journey from application to hire.
                    </p>
                </div>
                <div className='bg-slate-100 p-1 rounded-2xl flex gap-1 self-start border border-slate-200 shadow-inner'>
                    <button
                        type='button'
                        onClick={() => setViewMode('table')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'table' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Table
                    </button>
                    <button
                        type='button'
                        onClick={() => setViewMode('kanban')}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${viewMode === 'kanban' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}
                    >
                        Kanban
                    </button>
                </div>
            </div>

            <div className={`flex gap-8 ${viewMode === 'kanban' ? 'flex-col xl:flex-row' : 'flex-col'}`}>
                <div className='flex-1 min-w-0'>
                    {viewMode === 'table' ? (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <ApplicationsTable
                                applicants={validApplicants}
                                selectedId={selectedId}
                                setSelectedId={setSelectedId}
                                viewApplicantResume={viewApplicantResume}
                                handleAIMatch={handleAIMatch}
                                matchResults={matchResults}
                                displayPipelineStage={displayPipelineStage}
                                changePipeline={changePipeline}
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
                        />
                    )}
                </div>

                <ApplicationDetailsPanel
                    selectedApplicant={selectedApplicant}
                    setSelectedId={setSelectedId}
                    noteBody={noteBody}
                    setNoteBody={setNoteBody}
                    noteRating={noteRating}
                    setNoteRating={setNoteRating}
                    savingNote={savingNote}
                    submitInternalNote={submitInternalNote}
                    viewMode={viewMode}
                />
            </div>
        </div>
    )
}

export default ViewApplications
