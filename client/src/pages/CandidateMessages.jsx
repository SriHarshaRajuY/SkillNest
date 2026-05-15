import { useCallback, useContext, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import MessageChatPanel from '../components/MessageChatPanel'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
import { messageService } from '../services/messageService'
import { authService } from '../services/authService'
import Loading from '../components/Loading'

const CandidateMessages = () => {
    const { applicationId } = useParams()
    const navigate = useNavigate()
    const { getToken } = useAuth()
    const { userDataLoaded } = useContext(AppContext)

    const [threads, setThreads] = useState([])
    const [loading, setLoading] = useState(true)
    const [clerkToken, setClerkToken] = useState(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const token = await getToken()
                if (!token || cancelled) return
                setClerkToken(token)

                const response = await messageService.getUserThreads(token)
                if (!cancelled && response.success) {
                    setThreads(response.data.threads || [])
                }
            } catch (error) {
                console.error('[CandidateMessages] Error loading threads', error)
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => { cancelled = true }
    }, [getToken])

    const active = threads.find((t) => String(t.applicationId) === String(applicationId))

    const markThreadReadLocally = useCallback((readApplicationId) => {
        setThreads((prev) => prev.map((thread) =>
            String(thread.applicationId) === String(readApplicationId)
                ? { ...thread, unread: 0 }
                : thread,
        ))
    }, [])

    if (!userDataLoaded) return <Loading />

    if (!clerkToken) {
        return (
            <>
                <Navbar />
                <div className='container mx-auto px-4 py-24 text-center text-slate-600'>
                    Please sign in to use SkillNest messaging.
                </div>
                <Footer />
            </>
        )
    }

    return (
        <>
            <Navbar />
            <div className='container mx-auto px-4 py-8 max-w-6xl animate-fade-in'>
                <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8'>
                    <div>
                        <h1 className='text-3xl font-bold text-slate-900 tracking-tight'>Secure Inbox</h1>
                        <p className='text-slate-500 text-sm mt-1'>
                            Professional conversations with recruiters — streamlined and secure.
                        </p>
                    </div>
                    <Link
                        to='/applications'
                        className='text-sm font-medium text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1'
                    >
                        <span>{'<'}</span> Back to applications
                    </Link>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
                    <aside className='lg:col-span-2 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden h-[500px] lg:h-[600px] flex flex-col'>
                        <div className='px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center'>
                            <p className='text-xs font-bold uppercase tracking-widest text-slate-400'>Conversations</p>
                            <span className="text-xs bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-medium">{threads.length}</span>
                        </div>
                        <div className='overflow-y-auto flex-1 scrollbar-hide'>
                            {loading ? (
                                <div className='p-12 flex justify-center'>
                                    <div className='w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin' />
                                </div>
                            ) : threads.length === 0 ? (
                                <div className="p-10 text-center">
                                    <p className='text-sm text-slate-400'>No conversations yet.</p>
                                    <p className="text-xs text-slate-400 mt-1">Recruiters will message you once you're shortlisted.</p>
                                </div>
                            ) : (
                                threads.map((t) => (
                                    <button
                                        key={String(t.applicationId)}
                                        type='button'
                                        onClick={() => navigate(`/messages/${t.applicationId}`)}
                                        className={`w-full text-left px-5 py-4 flex gap-4 border-b border-slate-50 hover:bg-slate-50 transition-all ${
                                            String(t.applicationId) === String(applicationId) ? 'bg-indigo-50/80 border-l-4 border-l-indigo-600' : 'border-l-4 border-l-transparent'
                                        }`}
                                    >
                                        <div className="relative shrink-0">
                                            <img
                                                src={t.companyImage || assets.company_icon}
                                                onError={(e) => { e.currentTarget.src = assets.company_icon }}
                                                alt=''
                                                className='w-12 h-12 rounded-full object-cover shadow-sm'
                                            />
                                            {t.unread > 0 && (
                                                <span className="absolute -top-1 -right-1 w-3 h-3 bg-indigo-600 border-2 border-white rounded-full"></span>
                                            )}
                                        </div>
                                        <div className='min-w-0 flex-1'>
                                            <div className='flex justify-between items-start gap-2'>
                                                <span className={`font-semibold text-slate-900 truncate ${t.unread > 0 ? 'text-indigo-900' : ''}`}>
                                                    {t.companyName}
                                                </span>
                                                {t.lastMessage && (
                                                    <span className="text-[10px] text-slate-400 whitespace-nowrap">
                                                        {new Date(t.lastMessage.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                                    </span>
                                                )}
                                            </div>
                                            <p className='text-xs text-slate-500 truncate font-medium'>{t.jobTitle}</p>
                                            {t.lastMessage && (
                                                <p className={`text-xs truncate mt-1 ${t.unread > 0 ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>
                                                    {t.lastMessage.fromUser ? 'You: ' : ''}{t.lastMessage.body}
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
                            clerkToken={clerkToken}
                            peerLabel={active?.companyName || 'Recruiter'}
                            peerImage={active?.companyImage}
                            draftRole='user'
                            onThreadRead={markThreadReadLocally}
                        />
                    </section>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default CandidateMessages
