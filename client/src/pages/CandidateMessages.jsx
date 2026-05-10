import { useContext, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import axios from 'axios'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import MessageChatPanel from '../components/MessageChatPanel'
import { AppContext } from '../context/AppContext'
import { assets } from '../assets/assets'
const CandidateMessages = () => {
    const { applicationId } = useParams()
    const navigate = useNavigate()
    const { getToken } = useAuth()
    const { backendUrl } = useContext(AppContext)

    const [threads, setThreads] = useState([])
    const [loading, setLoading] = useState(true)
    const [realtimeToken, setRealtimeToken] = useState(null)
    const [authHeader, setAuthHeader] = useState(null)

    useEffect(() => {
        let cancelled = false
        ;(async () => {
            try {
                const token = await getToken()
                if (!token) return
                if (cancelled) return
                setAuthHeader({ Authorization: `Bearer ${token}` })

                const rt = await axios.get(`${backendUrl}/api/users/realtime-token`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (!cancelled && rt.data.success) setRealtimeToken(rt.data.token)
            } catch {
                /* ignore */
            }
        })()
        return () => { cancelled = true }
    }, [backendUrl, getToken])

    useEffect(() => {
        if (!authHeader) return
        let cancelled = false
        ;(async () => {
            try {
                const { data } = await axios.get(`${backendUrl}/api/users/messages/threads`, {
                    headers: authHeader,
                })
                if (!cancelled && data.success) setThreads(data.threads || [])
            } catch {
                if (!cancelled) setThreads([])
            } finally {
                if (!cancelled) setLoading(false)
            }
        })()
        return () => { cancelled = true }
    }, [backendUrl, authHeader])

    const active = threads.find((t) => String(t.applicationId) === String(applicationId))

    if (!authHeader) {
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
            <div className='container mx-auto px-4 py-8 max-w-6xl'>
                <div className='flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8'>
                    <div>
                        <h1 className='text-2xl font-bold text-slate-900 tracking-tight'>Secure inbox</h1>
                        <p className='text-slate-500 text-sm mt-1'>
                            Encrypted hiring conversations — no need to switch to email.
                        </p>
                    </div>
                    <Link
                        to='/applications'
                        className='text-sm font-medium text-indigo-600 hover:text-indigo-800'
                    >
                        ← Back to applications
                    </Link>
                </div>

                <div className='grid grid-cols-1 lg:grid-cols-5 gap-6'>
                    <aside className='lg:col-span-2 border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden max-h-[520px] lg:max-h-[calc(100vh-240px)] flex flex-col'>
                        <div className='px-4 py-3 border-b border-slate-100 bg-slate-50'>
                            <p className='text-xs font-semibold uppercase tracking-wide text-slate-500'>Threads</p>
                        </div>
                        <div className='overflow-y-auto flex-1'>
                            {loading ? (
                                <div className='p-8 flex justify-center'>
                                    <div className='w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin' />
                                </div>
                            ) : threads.length === 0 ? (
                                <p className='p-6 text-sm text-slate-500'>
                                    No conversations yet. Apply to a role — recruiters can message you here.
                                </p>
                            ) : (
                                threads.map((t) => (
                                    <button
                                        key={String(t.applicationId)}
                                        type='button'
                                        onClick={() => navigate(`/messages/${t.applicationId}`)}
                                        className={`w-full text-left px-4 py-3 flex gap-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                                            String(t.applicationId) === String(applicationId) ? 'bg-indigo-50/80' : ''
                                        }`}
                                    >
                                        {t.companyImage ? (
                                            <img
                                                src={t.companyImage || assets.company_icon}
                                                onError={(e) => { e.currentTarget.src = assets.company_icon }}
                                                alt=''
                                                className='w-10 h-10 rounded-full object-cover shrink-0'
                                            />
                                        ) : (
                                            <div className='w-10 h-10 rounded-full bg-slate-200 shrink-0' />
                                        )}
                                        <div className='min-w-0 flex-1'>
                                            <div className='flex justify-between gap-2'>
                                                <span className='font-medium text-slate-900 truncate'>
                                                    {t.companyName}
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
                            backendUrl={backendUrl}
                            applicationId={applicationId}
                            authHeaders={authHeader}
                            peerLabel={active?.companyName || 'Recruiter'}
                            peerImage={active?.companyImage}
                            draftRole='user'
                            realtimeToken={realtimeToken}
                        />
                    </section>
                </div>
            </div>
            <Footer />
        </>
    )
}

export default CandidateMessages
