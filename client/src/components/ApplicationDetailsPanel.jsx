import { useEffect, useState } from 'react'
import { recruiterService } from '../services/recruiterService'
import { Link } from 'react-router-dom'

const ApplicationDetailsPanel = ({
    selectedApplicant,
    setSelectedId,
    noteBody,
    setNoteBody,
    noteRating,
    setNoteRating,
    savingNote,
    submitInternalNote,
    viewMode,
    viewApplicantResume
}) => {
    const [summary, setSummary] = useState(null)
    const [loadingSummary, setLoadingSummary] = useState(false)

    useEffect(() => {
        if (!selectedApplicant?._id) {
            setSummary(null)
            return
        }

        const fetchSummary = async () => {
            setLoadingSummary(true)
            try {
                const response = await recruiterService.getResumeSummary(selectedApplicant._id)
                if (response.success) {
                    setSummary(response.data)
                }
            } catch (error) {
                console.error('Failed to load AI summary', error)
            } finally {
                setLoadingSummary(false)
            }
        }

        fetchSummary()
    }, [selectedApplicant?._id])

    if (!selectedApplicant) return null

    const renderSummary = () => (
        <div className='mb-6 bg-indigo-50/50 border border-indigo-100 rounded-xl p-4'>
            <div className='flex items-center gap-2 mb-2'>
                <span className='text-xs font-bold uppercase tracking-widest text-indigo-600'>AI Resume Summary</span>
                {loadingSummary && <div className='w-3 h-3 border border-indigo-500 border-t-transparent rounded-full animate-spin' />}
            </div>
            
            {loadingSummary ? (
                <div className='space-y-2'>
                    <div className='h-3 bg-indigo-100 rounded w-full animate-pulse' />
                    <div className='h-3 bg-indigo-100 rounded w-5/6 animate-pulse' />
                    <div className='h-3 bg-indigo-100 rounded w-4/6 animate-pulse' />
                </div>
            ) : summary ? (
                <>
                    <p className='text-sm text-indigo-900/80 leading-relaxed mb-3'>
                        {summary.experienceSummary || summary.summary}
                    </p>
                    <div className='flex flex-wrap gap-1.5'>
                        {(summary.skills || summary.topSkills || []).map((skill, i) => (
                            <span key={i} className='px-2 py-0.5 bg-white border border-indigo-200 text-indigo-700 text-[10px] font-bold rounded-full'>
                                {skill}
                            </span>
                        ))}
                    </div>
                </>
            ) : (
                <p className='text-xs text-indigo-400 italic'>AI summary unavailable for this profile.</p>
            )}
        </div>
    )

    if (viewMode === 'table') {
        return (
            <div className='mt-6 border border-gray-200 rounded-2xl bg-white shadow-sm overflow-hidden animate-fade-in'>
                <div className='p-4 bg-gray-50 border-b flex justify-between items-center'>
                    <div>
                        <p className='text-xs font-semibold text-gray-500 uppercase tracking-tight'>Team Hiring Room</p>
                        <p className='font-bold text-gray-900'>{selectedApplicant.userId.name}</p>
                    </div>
                    <button type='button' className='text-sm text-gray-500 hover:text-gray-800' onClick={() => setSelectedId(null)}>Dismiss</button>
                </div>
                <div className='p-4 grid md:grid-cols-2 gap-8'>
                    <div>
                        {renderSummary()}
                        <p className='text-xs font-semibold text-gray-500 uppercase mb-2 tracking-tight'>Direct Message</p>
                        <Link
                            to={`/dashboard/messages/${selectedApplicant._id}`}
                            className='inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl font-semibold text-sm hover:bg-indigo-700 transition-all'
                        >
                            Open secure chat
                        </Link>
                    </div>
                    <div>
                        <p className='text-xs font-semibold text-gray-500 uppercase mb-3 tracking-tight'>Internal Feed</p>
                        <div className='space-y-3 max-h-64 overflow-y-auto pr-2 mb-4'>
                            {(selectedApplicant.internalNotes || []).length === 0 && (
                                <p className='text-sm text-gray-400 italic'>No internal notes yet.</p>
                            )}
                            {[...(selectedApplicant.internalNotes || [])].reverse().map((n) => (
                                <div key={n._id} className='rounded-xl border border-gray-100 p-3 bg-slate-50 shadow-sm'>
                                    <div className='flex justify-between items-center'>
                                        <span className='text-sm font-bold text-slate-800'>{n.authorName}</span>
                                        {n.rating ? <span className='text-amber-500 text-xs font-bold'>{`${n.rating}/5`}</span> : null}
                                    </div>
                                    <p className='text-sm text-slate-600 mt-1.5 leading-relaxed'>{n.body}</p>
                                </div>
                            ))}
                        </div>
                        <div className='border-t pt-4'>
                            <p className='text-xs font-semibold text-gray-500 uppercase mb-2 tracking-tight'>Add Assessment</p>
                            <div className='flex gap-2 mb-2'>
                                <select
                                    value={noteRating}
                                    onChange={(e) => setNoteRating(Number(e.target.value))}
                                    className='border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none'
                                >
                                    {[5, 4, 3, 2, 1].map((r) => (
                                        <option key={r} value={r}>{r} stars</option>
                                    ))}
                                </select>
                                <input
                                    type="text"
                                    value={noteBody}
                                    onChange={(e) => setNoteBody(e.target.value)}
                                    placeholder='Team feedback...'
                                    className='flex-1 border rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none'
                                />
                                <button
                                    type='button'
                                    disabled={savingNote || !noteBody.trim()}
                                    onClick={submitInternalNote}
                                    className='px-4 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all'
                                >
                                    {savingNote ? '...' : 'Add'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <aside className='w-full xl:w-[400px] shrink-0 border border-gray-200 rounded-2xl bg-white shadow-xl overflow-hidden flex flex-col max-h-[calc(100vh-160px)] animate-slide-in'>
            <div className='p-5 border-b bg-gradient-to-br from-slate-900 to-indigo-900 text-white'>
                <div className='flex justify-between items-start'>
                    <div>
                        <p className='text-[10px] uppercase tracking-widest text-white/60 font-bold'>Team Hiring Room</p>
                        <p className='font-bold text-xl truncate mt-0.5'>{selectedApplicant.userId.name}</p>
                        <p className='text-sm text-white/70 truncate'>{selectedApplicant.jobId.title}</p>
                    </div>
                    <button
                        type='button'
                        className='text-white/50 hover:text-white transition-colors'
                        onClick={() => setSelectedId(null)}
                    >
                        x
                    </button>
                </div>
                <div className='mt-4 flex gap-2'>
                    <Link
                        to={`/dashboard/messages/${selectedApplicant._id}`}
                        className='flex-1 text-center bg-white/10 hover:bg-white/20 backdrop-blur-md text-white text-xs font-bold py-2 rounded-lg transition-all border border-white/10'
                    >
                        Chat
                    </Link>
                    <button
                        type='button'
                        onClick={() => viewApplicantResume(selectedApplicant._id)}
                        className='flex-1 bg-white text-indigo-900 text-xs font-bold py-2 rounded-lg hover:bg-indigo-50 transition-all'
                    >
                        Resume
                    </button>
                </div>
            </div>
            
            <div className='flex-1 overflow-y-auto p-5 space-y-6 scrollbar-hide'>
                {renderSummary()}

                <div>
                    <div className='flex justify-between items-center mb-3'>
                        <p className='text-xs font-bold text-slate-400 uppercase tracking-widest'>Team Notes</p>
                        <span className='text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-bold'>Internal</span>
                    </div>
                    <div className='space-y-4'>
                        {(selectedApplicant.internalNotes || []).length === 0 && (
                            <div className='py-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200'>
                                <p className='text-xs text-slate-400 italic'>No feedback shared yet.</p>
                            </div>
                        )}
                        {[...(selectedApplicant.internalNotes || [])].reverse().map((n) => (
                            <div key={n._id} className='rounded-xl border border-slate-100 bg-slate-50/50 p-3 shadow-sm'>
                                <div className='flex justify-between items-start gap-2'>
                                    <span className='text-sm font-bold text-slate-800'>{n.authorName}</span>
                                    {n.rating ? (
                                        <span className='text-amber-500 text-xs shrink-0'>{`${n.rating}/5`}</span>
                                    ) : null}
                                </div>
                                <p className='text-sm text-slate-600 mt-2 leading-relaxed'>{n.body}</p>
                                <p className='text-[9px] text-slate-400 mt-2 uppercase font-bold tracking-tight'>
                                    {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className='border-t border-slate-100 pt-5'>
                    <p className='text-xs font-bold text-slate-400 uppercase tracking-widest mb-3'>Post Feedback</p>
                    <div className='bg-slate-50 p-4 rounded-2xl border border-slate-200'>
                        <div className='flex items-center gap-3 mb-3'>
                            <label className='text-xs font-bold text-slate-500'>Score</label>
                            <div className='flex gap-1'>
                                {[1, 2, 3, 4, 5].map((r) => (
                                    <button
                                        key={r}
                                        type='button'
                                        onClick={() => setNoteRating(r)}
                                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${noteRating === r ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200 hover:border-indigo-300'}`}
                                    >
                                        {r}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <textarea
                            value={noteBody}
                            onChange={(e) => setNoteBody(e.target.value)}
                            placeholder='Team feedback...'
                            rows={3}
                            className='w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none resize-none transition-all'
                        />
                        <button
                            type='button'
                            disabled={savingNote || !noteBody.trim()}
                            onClick={submitInternalNote}
                            className='mt-3 w-full py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-all shadow-lg shadow-indigo-200'
                        >
                            {savingNote ? 'Publishing...' : 'Share with team'}
                        </button>
                    </div>
                </div>
            </div>
        </aside>
    )
}

export default ApplicationDetailsPanel
