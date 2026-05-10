import { useContext, useEffect, useMemo, useState } from 'react'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'
import { useSkillNestSocket } from '../hooks/useSkillNestSocket'

// New modular components
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
    const { backendUrl, companyToken } = useContext(AppContext)

    const [applicants, setApplicants] = useState(false)
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
        backendUrl,
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

    const fetchCompanyJobApplications = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/company/applicants',
                { headers: { token: companyToken } },
            )
            if (data.success) {
                setApplicants(data.applications)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        }
    }

    const changePipeline = async (id, pipelineStage) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/company/change-status',
                { id, pipelineStage },
                { headers: { token: companyToken } },
            )
            if (data.success) {
                toast.success('Pipeline updated')
                setApplicants((prev) =>
                    !prev ? prev : prev.map((a) =>
                        String(a._id) === String(id) ? data.application : a,
                    ),
                )
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        }
    }

    const submitInternalNote = async () => {
        if (!selectedId || !noteBody.trim()) {
            toast.error('Enter a note')
            return
        }
        setSavingNote(true)
        try {
            const { data } = await axios.post(
                `${backendUrl}/api/company/applications/${selectedId}/internal-notes`,
                { body: noteBody.trim(), rating: noteRating },
                { headers: { token: companyToken } },
            )
            if (data.success) {
                toast.success('Feedback shared with your team')
                setNoteBody('')
                setApplicants((prev) =>
                    !prev ? prev : prev.map((a) =>
                        String(a._id) === String(selectedId)
                            ? { ...a, internalNotes: data.internalNotes }
                            : a,
                    ),
                )
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        } finally {
            setSavingNote(false)
        }
    }

    const viewApplicantResume = async (applicationId) => {
        try {
            const response = await fetch(
                `${backendUrl}/api/company/applicant-resume/${applicationId}`,
                { headers: { token: companyToken } },
            )
            const data = await response.json()
            if (data.success && data.url) {
                window.open(data.url, '_blank')
            } else {
                toast.error(data.message || 'Could not load resume')
            }
        } catch {
            toast.error('Failed to open resume')
        }
    }

    const handleAIMatch = async (applicationId) => {
        setMatchResults(prev => ({ ...prev, [applicationId]: { loading: true } }))
        try {
            const { data } = await axios.get(`${backendUrl}/api/company/match-resume/${applicationId}`, {
                headers: { token: companyToken },
            })
            if (data.success) {
                setMatchResults(prev => ({
                    ...prev,
                    [applicationId]: { loading: false, score: data.score, reason: data.reason },
                }))
                toast.success('AI Match generated!')
            } else {
                setMatchResults(prev => ({ ...prev, [applicationId]: { loading: false, error: data.message } }))
                toast.error(data.message)
            }
        } catch (error) {
            const message = error.response?.data?.message || 'Failed to perform AI Match'
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
            if (applicant && current !== newStage) {
                await changePipeline(applicantId, newStage)
            }
        }
    }

    useEffect(() => {
        if (companyToken) {
            fetchCompanyJobApplications()
        }
    }, [companyToken])

    const selectedApplicant = Array.isArray(applicants) && selectedId
        ? applicants.find((a) => String(a._id) === String(selectedId))
        : null

    if (!applicants) return <Loading />

    if (applicants.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center h-[70vh] text-center'>
                <div className='text-5xl mb-4'>📋</div>
                <p className='text-xl text-gray-600 font-medium'>No Applications Yet</p>
                <p className='text-sm text-gray-400 mt-2'>Applications from job seekers will appear here</p>
            </div>
        )
    }

    const validApplicants = applicants.filter(item => item.jobId && item.userId)

    return (
        <div className='container mx-auto p-4'>
            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6'>
                <div>
                    <h1 className='text-2xl font-semibold text-gray-800'>Applications</h1>
                    <p className='text-sm text-gray-500 mt-1'>
                        Kanban updates candidates in real time. Team notes stay internal.
                    </p>
                </div>
                <div className='bg-gray-100 p-1 rounded-lg flex gap-1 self-start'>
                    <button
                        type='button'
                        onClick={() => setViewMode('table')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Table
                    </button>
                    <button
                        type='button'
                        onClick={() => setViewMode('kanban')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Live pipeline
                    </button>
                </div>
            </div>

            <div className={`flex gap-4 ${viewMode === 'kanban' ? 'flex-col xl:flex-row' : ''}`}>
                <div className='flex-1 min-w-0'>
                    {viewMode === 'table' ? (
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
