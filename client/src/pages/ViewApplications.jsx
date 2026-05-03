import { useContext, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'
import { PIPELINE_STAGES, PIPELINE_LABELS } from '../constants/pipeline'
import { useSkillNestSocket } from '../hooks/useSkillNestSocket'

const COLUMN_RING = {
    Applied: 'border-blue-300',
    Screening: 'border-amber-300',
    Interview: 'border-violet-400',
    Offer: 'border-emerald-400',
    Hired: 'border-emerald-600',
    Rejected: 'border-rose-400',
}

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
                setApplicants(data.applications.reverse())
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
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
            toast.error(error.message)
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
            toast.error(error.message)
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
        } catch {
            setMatchResults(prev => ({ ...prev, [applicationId]: { loading: false, error: 'Failed to fetch match' } }))
            toast.error('Failed to perform AI Match')
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

    const renderApplicantCard = (applicant) => (
        <div
            key={applicant._id}
            role='button'
            tabIndex={0}
            onClick={() => setSelectedId(applicant._id)}
            onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(applicant._id) }}
            draggable
            onDragStart={(e) => handleDragStart(e, applicant._id)}
            className={`bg-white p-4 rounded-xl shadow-sm border-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-all relative outline-none ${
                String(selectedId) === String(applicant._id)
                    ? 'ring-2 ring-indigo-400 border-indigo-200'
                    : 'border-gray-100'
            }`}
        >
            <div className='flex items-start gap-3'>
                <img className='w-10 h-10 rounded-full object-cover border border-gray-100' src={applicant.userId.image} alt={applicant.userId.name} />
                <div className='flex-1 min-w-0'>
                    <h3 className='font-medium text-gray-900 truncate'>{applicant.userId.name}</h3>
                    <p className='text-xs text-gray-500 truncate mb-2'>{applicant.jobId.title}</p>

                    <div className='flex flex-wrap items-center gap-2 mt-2' onClick={(e) => e.stopPropagation()}>
                        {applicant.userId.resume && (
                            <button
                                type='button'
                                onClick={() => viewApplicantResume(applicant._id)}
                                className='text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-md hover:bg-blue-100 font-medium transition-colors'
                            >
                                Resume
                            </button>
                        )}
                        <Link
                            to={`/dashboard/messages/${applicant._id}`}
                            className='text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-md hover:bg-indigo-100'
                            onClick={(e) => e.stopPropagation()}
                        >
                            Message
                        </Link>

                        {!matchResults[applicant._id] ? (
                            <button
                                type='button'
                                onClick={() => handleAIMatch(applicant._id)}
                                className='text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1.5 rounded-md hover:bg-indigo-100 border border-indigo-100 shadow-sm transition-all flex items-center gap-1 font-medium'
                            >
                                AI Match
                            </button>
                        ) : matchResults[applicant._id].loading ? (
                            <span className='text-[10px] text-gray-500'>Analyzing…</span>
                        ) : matchResults[applicant._id].score ? (
                            <span className={`text-xs font-bold px-2 py-1 rounded-md border ${matchResults[applicant._id].score >= 80 ? 'bg-green-50 text-green-700 border-green-200' : matchResults[applicant._id].score >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                {matchResults[applicant._id].score}%
                            </span>
                        ) : (
                            <span className='text-xs text-red-500'>AI error</span>
                        )}
                    </div>

                    {matchResults[applicant._id]?.reason && (
                        <p className='text-[10px] text-gray-500 mt-2 bg-gray-50 p-2 rounded max-h-20 overflow-y-auto'>
                            {matchResults[applicant._id].reason}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )

    return (
        <div className='container mx-auto p-4'>
            <div className='flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6'>
                <div>
                    <h1 className='text-2xl font-semibold text-gray-800'>Applications</h1>
                    <p className='text-sm text-gray-500 mt-1'>
                        Kanban updates candidates in real time. Team notes stay internal — candidates never see them.
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
                        <div className='overflow-x-auto rounded-xl border border-gray-200 shadow-sm'>
                            <table className='min-w-full bg-white max-sm:text-sm'>
                                <thead className='bg-gray-50'>
                                    <tr className='border-b'>
                                        <th className='py-3 px-4 text-left font-medium text-gray-700'>#</th>
                                        <th className='py-3 px-4 text-left font-medium text-gray-700'>Applicant</th>
                                        <th className='py-3 px-4 text-left font-medium text-gray-700 max-sm:hidden'>Job</th>
                                        <th className='py-3 px-4 text-left font-medium text-gray-700'>Resume</th>
                                        <th className='py-3 px-4 text-left font-medium text-gray-700'>AI</th>
                                        <th className='py-3 px-4 text-left font-medium text-gray-700'>Pipeline</th>
                                        <th className='py-3 px-4 text-left font-medium text-gray-700'>Chat</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {validApplicants.map((applicant, index) => (
                                        <tr
                                            key={applicant._id}
                                            className={`text-gray-700 hover:bg-gray-50 cursor-pointer ${String(selectedId) === String(applicant._id) ? 'bg-indigo-50/50' : ''}`}
                                            onClick={() => setSelectedId(applicant._id)}
                                        >
                                            <td className='py-3 px-4 border-b text-center'>{index + 1}</td>
                                            <td className='py-3 px-4 border-b'>
                                                <div className='flex items-center gap-2'>
                                                    <img className='w-9 h-9 rounded-full object-cover max-sm:hidden' src={applicant.userId.image} alt='' />
                                                    <span className='font-medium'>{applicant.userId.name}</span>
                                                </div>
                                            </td>
                                            <td className='py-3 px-4 border-b max-sm:hidden'>{applicant.jobId.title}</td>
                                            <td className='py-3 px-4 border-b'>
                                                {applicant.userId.resume ? (
                                                    <button
                                                        type='button'
                                                        onClick={(e) => { e.stopPropagation(); viewApplicantResume(applicant._id) }}
                                                        className='bg-blue-50 text-blue-500 px-3 py-1 rounded hover:bg-blue-100 text-sm'
                                                    >
                                                        View
                                                    </button>
                                                ) : (
                                                    <span className='text-gray-400 text-sm'>—</span>
                                                )}
                                            </td>
                                            <td className='py-3 px-4 border-b'>
                                                {!matchResults[applicant._id] ? (
                                                    <button
                                                        type='button'
                                                        onClick={(e) => { e.stopPropagation(); handleAIMatch(applicant._id) }}
                                                        className='text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-full font-medium'
                                                    >
                                                        Score
                                                    </button>
                                                ) : matchResults[applicant._id].loading ? (
                                                    <span className='text-xs text-gray-400'>…</span>
                                                ) : matchResults[applicant._id].score ? (
                                                    <span className='text-xs font-bold text-indigo-700'>{matchResults[applicant._id].score}%</span>
                                                ) : (
                                                    <span className='text-xs text-red-500'>Err</span>
                                                )}
                                            </td>
                                            <td className='py-3 px-4 border-b' onClick={(e) => e.stopPropagation()}>
                                                <select
                                                    value={displayPipelineStage(applicant)}
                                                    onChange={(e) => changePipeline(applicant._id, e.target.value)}
                                                    className='text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500 outline-none max-w-[140px]'
                                                >
                                                    {PIPELINE_STAGES.map((s) => (
                                                        <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className='py-3 px-4 border-b' onClick={(e) => e.stopPropagation()}>
                                                <Link
                                                    to={`/dashboard/messages/${applicant._id}`}
                                                    className='text-sm font-semibold text-indigo-600 hover:text-indigo-800'
                                                >
                                                    Open
                                                </Link>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className='flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-220px)]'>
                            {PIPELINE_STAGES.map((stage) => (
                                <div
                                    key={stage}
                                    className={`flex-1 min-w-[280px] rounded-xl p-4 border-2 border-dashed bg-gray-50/80 flex flex-col ${COLUMN_RING[stage] || 'border-gray-200'}`}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, stage)}
                                >
                                    <h2 className='font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-800 flex justify-between items-center'>
                                        <span>{PIPELINE_LABELS[stage]}</span>
                                        <span className='text-xs font-normal text-gray-500'>
                                            {validApplicants.filter((a) => displayPipelineStage(a) === stage).length}
                                        </span>
                                    </h2>
                                    <div className='flex-1 overflow-y-auto space-y-3 pr-1 max-h-[calc(100vh-280px)]'>
                                        {validApplicants
                                            .filter((a) => displayPipelineStage(a) === stage)
                                            .map((applicant) => renderApplicantCard(applicant))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {(selectedApplicant && viewMode === 'kanban') && (
                    <aside className='w-full xl:w-[360px] shrink-0 border border-gray-200 rounded-2xl bg-white shadow-lg overflow-hidden flex flex-col max-h-[calc(100vh-160px)]'>
                        <div className='p-4 border-b bg-gradient-to-r from-slate-900 to-indigo-900 text-white'>
                            <p className='text-xs uppercase tracking-wider text-white/70'>Team hiring room</p>
                            <p className='font-semibold text-lg truncate'>{selectedApplicant.userId.name}</p>
                            <p className='text-sm text-white/80 truncate'>{selectedApplicant.jobId.title}</p>
                            <button
                                type='button'
                                className='mt-3 text-xs text-white/90 underline'
                                onClick={() => setSelectedId(null)}
                            >
                                Close panel
                            </button>
                        </div>
                        <div className='flex-1 overflow-y-auto p-4 flex flex-col gap-4'>
                            <div>
                                <p className='text-xs font-semibold text-gray-500 uppercase mb-2'>Live feedback</p>
                                <div className='space-y-3'>
                                    {(selectedApplicant.internalNotes || []).length === 0 && (
                                        <p className='text-sm text-gray-400 italic'>No notes yet — add the first rating for your team.</p>
                                    )}
                                    {[...(selectedApplicant.internalNotes || [])].reverse().map((n) => (
                                        <div key={n._id} className='rounded-xl border border-gray-100 bg-gray-50 p-3'>
                                            <div className='flex justify-between items-start gap-2'>
                                                <span className='text-sm font-medium text-gray-900'>{n.authorName}</span>
                                                {n.rating ? (
                                                    <span className='text-amber-500 text-sm shrink-0'>{'★'.repeat(n.rating)}{'☆'.repeat(5 - n.rating)}</span>
                                                ) : null}
                                            </div>
                                            <p className='text-sm text-gray-700 mt-2 whitespace-pre-wrap'>{n.body}</p>
                                            <p className='text-[10px] text-gray-400 mt-2'>
                                                {n.createdAt ? new Date(n.createdAt).toLocaleString() : ''}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <div className='border-t pt-4'>
                                <p className='text-xs font-semibold text-gray-500 uppercase mb-2'>Add note</p>
                                <label className='block text-xs text-gray-500 mb-1'>Rating</label>
                                <select
                                    value={noteRating}
                                    onChange={(e) => setNoteRating(Number(e.target.value))}
                                    className='w-full border rounded-lg px-2 py-2 text-sm mb-2'
                                >
                                    {[5, 4, 3, 2, 1].map((r) => (
                                        <option key={r} value={r}>{r} stars</option>
                                    ))}
                                </select>
                                <textarea
                                    value={noteBody}
                                    onChange={(e) => setNoteBody(e.target.value)}
                                    placeholder='Internal note — invisible to candidate…'
                                    rows={4}
                                    className='w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none'
                                />
                                <button
                                    type='button'
                                    disabled={savingNote}
                                    onClick={submitInternalNote}
                                    className='mt-2 w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50'
                                >
                                    {savingNote ? 'Saving…' : 'Publish to team'}
                                </button>
                            </div>
                        </div>
                    </aside>
                )}
            </div>

            {selectedApplicant && viewMode === 'table' && (
                <div className='mt-6 border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden'>
                    <div className='p-4 bg-gray-50 border-b flex justify-between items-center'>
                        <div>
                            <p className='text-xs font-semibold text-gray-500 uppercase'>Team hiring room</p>
                            <p className='font-medium text-gray-900'>{selectedApplicant.userId.name}</p>
                        </div>
                        <button type='button' className='text-sm text-gray-500 hover:text-gray-800' onClick={() => setSelectedId(null)}>Dismiss</button>
                    </div>
                    <div className='p-4 grid md:grid-cols-2 gap-6'>
                        <div>
                            <p className='text-xs font-semibold text-gray-500 uppercase mb-2'>Thread</p>
                            <Link
                                to={`/dashboard/messages/${selectedApplicant._id}`}
                                className='inline-flex items-center gap-2 text-indigo-600 font-semibold text-sm hover:text-indigo-800'
                            >
                                Open secure chat →
                            </Link>
                            <div className='mt-4 space-y-3 max-h-56 overflow-y-auto'>
                                {(selectedApplicant.internalNotes || []).length === 0 && (
                                    <p className='text-sm text-gray-400'>No internal notes.</p>
                                )}
                                {[...(selectedApplicant.internalNotes || [])].reverse().map((n) => (
                                    <div key={n._id} className='rounded-lg border border-gray-100 p-3 bg-slate-50'>
                                        <div className='flex justify-between'>
                                            <span className='text-sm font-medium'>{n.authorName}</span>
                                            {n.rating ? <span className='text-amber-500 text-xs'>{'★'.repeat(n.rating)}</span> : null}
                                        </div>
                                        <p className='text-sm text-gray-700 mt-1'>{n.body}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div>
                            <p className='text-xs font-semibold text-gray-500 uppercase mb-2'>Add note</p>
                            <select
                                value={noteRating}
                                onChange={(e) => setNoteRating(Number(e.target.value))}
                                className='w-full border rounded-lg px-2 py-2 text-sm mb-2'
                            >
                                {[5, 4, 3, 2, 1].map((r) => (
                                    <option key={r} value={r}>{r} stars</option>
                                ))}
                            </select>
                            <textarea
                                value={noteBody}
                                onChange={(e) => setNoteBody(e.target.value)}
                                placeholder='Internal hiring note…'
                                rows={4}
                                className='w-full border rounded-xl px-3 py-2 text-sm mb-2 focus:ring-2 focus:ring-indigo-500 outline-none'
                            />
                            <button
                                type='button'
                                disabled={savingNote}
                                onClick={submitInternalNote}
                                className='w-full py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold disabled:opacity-50'
                            >
                                {savingNote ? 'Saving…' : 'Share with team'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ViewApplications
