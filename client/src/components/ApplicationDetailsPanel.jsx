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
    viewMode
}) => {
    if (!selectedApplicant) return null

    if (viewMode === 'table') {
        return (
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
        )
    }

    return (
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
    )
}

export default ApplicationDetailsPanel
