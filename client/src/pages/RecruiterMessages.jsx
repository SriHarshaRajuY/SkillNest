import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import MessageChatPanel from '../components/MessageChatPanel'
import { AppContext } from '../context/AppContext'
import Loading from '../components/Loading'

const RecruiterMessages = () => {
    const { applicationId } = useParams()
    const navigate = useNavigate()
    const { backendUrl, companyToken } = useContext(AppContext)

    const [threads, setThreads] = useState([])
    const [loading, setLoading] = useState(true)
    const [loadingDraft, setLoadingDraft] = useState(false)
    const [aiDraftTrigger, setAiDraftTrigger] = useState(0)
    const [aiDraftBody, setAiDraftBody] = useState('')

    const headers = companyToken ? { token: companyToken } : null

    useEffect(() => {
        if (!headers) return
        let cancelled = false
        ;(async () => {
            try {
                const { data } = await axios.get(`${backendUrl}/api/company/messages/threads`, { headers })
                if (!cancelled && data.success) setThreads(data.threads || [])
            } catch {
                if (!cancelled) setThreads([])
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => { cancelled = true }
    }, [backendUrl, companyToken])

    const active = threads.find((t) => String(t.applicationId) === String(applicationId))

    const handleDraft = async () => {
        if (!applicationId || !headers) return
        setLoadingDraft(true)
        try {
            const { data } = await axios.post(
                `${backendUrl}/api/company/messages/ai-draft`,
                { applicationId },
                { headers },
            )
            if (data.success && data.draft) {
                setAiDraftBody(data.draft)
                setAiDraftTrigger((k) => k + 1)
                toast.success('Draft loaded — review and send when ready.')
            } else {
                toast.error(data.message || 'Draft failed')
            }
        } catch {
            toast.error('Could not generate draft')
        } finally {
            setLoadingDraft(false)
        }
    }

    if (!companyToken) {
        return (
            <div className='flex flex-col items-center justify-center min-h-[40vh] text-slate-600 text-sm px-4'>
                Please log in as a recruiter to access messaging.
            </div>
        )
    }

    return (
        <div className='max-w-6xl mx-auto'>
            <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8'>
                <div>
                    <h1 className='text-2xl font-bold text-slate-900 tracking-tight'>Candidate inbox</h1>
                    <p className='text-slate-500 text-sm mt-1'>
                        Secure threads tied to applications — use AI smart draft for interview invites.
                    </p>
                </div>
                <button
                    type='button'
                    onClick={() => navigate('/dashboard/view-applications')}
                    className='text-sm font-medium text-indigo-600 hover:text-indigo-800 text-left'
                >
                    ← Pipeline board
                </button>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
                <aside className='lg:col-span-2 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden max-h-[520px] lg:max-h-[calc(100vh-240px)] flex flex-col'>
                    <div className='px-4 py-3 border-b border-slate-100 bg-slate-50'>
                        <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Threads</p>
                    </div>
                    <div className='overflow-y-auto flex-1'>
                        {loading ? (
                            <div className='p-10 flex justify-center'>
                                <Loading />
                            </div>
                        ) : threads.length === 0 ? (
                            <p className='p-6 text-sm text-slate-500'>
                                No messages yet. Open a candidate thread from the pipeline or start below from an application.
                            </p>
                        ) : (
                            threads.map((t) => (
                                <button
                                    key={String(t.applicationId)}
                                    type='button'
                                    onClick={() => navigate(`/dashboard/messages/${t.applicationId}`)}
                                    className={`w-full text-left px-4 py-3 flex gap-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                                        String(t.applicationId) === String(applicationId) ? 'bg-indigo-50/80' : ''
                                    }`}
                                >
                                    {t.candidateImage ? (
                                        <img
                                            src={t.candidateImage}
                                            alt=''
                                            className='w-10 h-10 rounded-full object-cover shrink-0'
                                        />
                                    ) : (
                                        <div className='w-10 h-10 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 shrink-0' />
                                    )}
                                    <div className='min-w-0 flex-1'>
                                        <div className='flex justify-between gap-2'>
                                            <span className='font-medium text-slate-900 truncate'>
                                                {t.candidateName}
                                            </span>
                                            {t.unread > 0 && (
                                                <span className='shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-600 text-white'>
                                                    {t.unread}
                                                </span>
                                            )}
                                        </div>
                                        <p className='text-xs text-slate-500 truncate'>{t.jobTitle}</p>
                                        {t.lastMessage && (
                                            <p className='text-xs text-slate-400 truncate mt-1'>
                                                {t.lastMessage.fromUser ? '' : 'You: '}{t.lastMessage.body}
                                            </p>
                                        )}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </aside>

                <section className='lg:col-span-3'>
                    <MessageChatPanel
                        backendUrl={backendUrl}
                        applicationId={applicationId}
                        authHeaders={headers}
                        peerLabel={active?.candidateName || 'Candidate'}
                        peerImage={active?.candidateImage}
                        draftRole='company'
                        realtimeToken={companyToken}
                        onDraft={handleDraft}
                        loadingDraft={loadingDraft}
                        aiDraftTrigger={aiDraftTrigger}
                        aiDraftBody={aiDraftBody}
                    />
                </section>
            </div>
        </div>
    )
}

export default RecruiterMessages
