import { useCallback, useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import MessageChatPanel from '../components/MessageChatPanel'
import { AppContext } from '../context/AppContext'
import Loading from '../components/Loading'
import { assets } from '../assets/assets'
import { messageService } from '../services/messageService'

const RecruiterMessages = () => {
    const { applicationId } = useParams()
    const navigate = useNavigate()
    const { companyToken, companyLoaded } = useContext(AppContext)

    const [threads, setThreads] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!companyToken) return
        let cancelled = false
        ;(async () => {
            try {
                const response = await messageService.getRecruiterThreads()
                if (!cancelled && response.success) {
                    setThreads(response.data.threads || [])
                }
            } catch (error) {
                console.error('[RecruiterMessages] Error loading threads', error)
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => { cancelled = true }
    }, [companyToken])

    const active = threads.find((t) => String(t.applicationId) === String(applicationId))

    const markThreadReadLocally = useCallback((readApplicationId) => {
        setThreads((prev) => prev.map((thread) =>
            String(thread.applicationId) === String(readApplicationId)
                ? { ...thread, unread: 0 }
                : thread,
        ))
    }, [])

    if (!companyLoaded) return <Loading />

    if (!companyToken) {
        return (
            <div className='flex flex-col items-center justify-center min-h-[40vh] text-slate-600 text-sm px-4'>
                Please log in as a recruiter to access messaging.
            </div>
        )
    }

    return (
        <div className='max-w-6xl mx-auto animate-fade-in'>
            <div className='flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8'>
                <div>
                    <h1 className='text-3xl font-bold text-slate-900 tracking-tight'>Candidate Inbox</h1>
                    <p className='text-slate-500 text-sm mt-1'>
                        Direct communication with shortlisted talent.
                    </p>
                </div>
                <button
                    type='button'
                    onClick={() => navigate('/dashboard/view-applications')}
                    className='text-sm font-semibold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1'
                >
                    <span>{'<'}</span> Back to pipeline
                </button>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
                <aside className='lg:col-span-2 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden h-[500px] lg:h-[600px] flex flex-col'>
                    <div className='px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center'>
                        <p className='text-xs font-bold uppercase tracking-widest text-slate-400'>Conversations</p>
                        <span className='text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium'>{threads.length}</span>
                    </div>
                    <div className='overflow-y-auto flex-1 scrollbar-hide'>
                        {loading ? (
                            <div className='p-12 flex justify-center'>
                                <div className='w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin' />
                            </div>
                        ) : threads.length === 0 ? (
                            <div className='p-10 text-center'>
                                <p className='text-sm text-slate-400'>No active threads.</p>
                                <p className='text-xs text-slate-400 mt-1'>Start a conversation from the applications board.</p>
                            </div>
                        ) : (
                            threads.map((t) => (
                                <button
                                    key={String(t.applicationId)}
                                    type='button'
                                    onClick={() => navigate(`/dashboard/messages/${t.applicationId}`)}
                                    className={`w-full text-left px-5 py-4 flex gap-4 border-b border-slate-50 hover:bg-slate-50 transition-all ${
                                        String(t.applicationId) === String(applicationId) ? 'bg-indigo-50/80 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'
                                    }`}
                                >
                                    <div className='relative shrink-0'>
                                        <img
                                            src={t.candidateImage || assets.profile_img}
                                            onError={(e) => { e.currentTarget.src = assets.profile_img }}
                                            alt=''
                                            className='w-12 h-12 rounded-full object-cover shadow-sm'
                                        />
                                        {t.unread > 0 && (
                                            <span className='absolute -top-1 -right-1 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full'></span>
                                        )}
                                    </div>
                                    <div className='min-w-0 flex-1'>
                                        <div className='flex justify-between items-start gap-2'>
                                            <span className={`font-semibold text-slate-900 truncate ${t.unread > 0 ? 'text-indigo-900' : ''}`}>
                                                {t.candidateName}
                                            </span>
                                            {t.lastMessage && (
                                                <span className='text-[10px] text-slate-400 whitespace-nowrap'>
                                                    {new Date(t.lastMessage.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                </span>
                                            )}
                                        </div>
                                        <p className='text-xs text-slate-500 truncate font-medium'>{t.jobTitle}</p>
                                        {t.lastMessage && (
                                            <p className={`text-xs truncate mt-1 ${t.unread > 0 ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
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
                        applicationId={applicationId}
                        peerLabel={active?.candidateName || 'Candidate'}
                        peerImage={active?.candidateImage}
                        draftRole='company'
                        onThreadRead={markThreadReadLocally}
                    />
                </section>
            </div>
        </div>
    )
}

export default RecruiterMessages
