import { useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useSkillNestSocket } from '../hooks/useSkillNestSocket'

function bubbleClass(isMine) {
    return isMine
        ? 'ml-auto bg-indigo-600 text-white rounded-2xl rounded-br-md shadow-sm'
        : 'mr-auto bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-md shadow-sm'
}

export default function MessageChatPanel({
    backendUrl,
    applicationId,
    authHeaders,
    peerLabel,
    peerImage,
    draftRole,
    realtimeToken,
    onDraft,
    loadingDraft,
    aiDraftTrigger = 0,
    aiDraftBody = '',
}) {
    const [messages, setMessages] = useState([])
    const [meta, setMeta] = useState(null)
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const bottomRef = useRef(null)

    const load = async () => {
        if (!applicationId) return
        setLoading(true)
        try {
            const path =
                draftRole === 'company'
                    ? `${backendUrl}/api/company/messages/thread/${applicationId}`
                    : `${backendUrl}/api/users/messages/thread/${applicationId}`
            const { data } = await axios.get(path, { headers: authHeaders })
            if (data.success) {
                setMessages(data.messages || [])
                setMeta(data.application || null)
            } else {
                toast.error(data.message)
            }
        } catch (e) {
            toast.error(e.message || 'Failed to load chat')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        load()
    }, [applicationId, draftRole])

    useEffect(() => {
        if (!aiDraftTrigger || !aiDraftBody) return
        setText(aiDraftBody.trim())
    }, [aiDraftTrigger, aiDraftBody])

    useSkillNestSocket({
        backendUrl,
        authToken: realtimeToken || null,
        applicationIds: applicationId ? [applicationId] : [],
        handlers: {
            'message:new': ({ message }) => {
                if (!message || String(message.applicationId) !== String(applicationId)) return
                setMessages((prev) => {
                    if (prev.some((m) => String(m._id) === String(message._id))) return prev
                    return [...prev, message]
                })
            },
        },
    })

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages.length])

    const send = async () => {
        const body = text.trim()
        if (!body || !applicationId) return
        try {
            const path =
                draftRole === 'company'
                    ? `${backendUrl}/api/company/messages`
                    : `${backendUrl}/api/users/messages`
            const { data } = await axios.post(
                path,
                { applicationId, body },
                { headers: authHeaders },
            )
            if (data.success) {
                setText('')
                setMessages((prev) => {
                    if (prev.some(m => String(m._id) === String(data.message._id))) return prev
                    return [...prev, data.message]
                })
            } else {
                toast.error(data.message)
            }
        } catch (e) {
            toast.error(e.message || 'Send failed')
        }
    }

    if (!applicationId) {
        return (
            <div className='flex flex-col items-center justify-center h-[50vh] text-slate-500 text-sm'>
                Select a conversation to view secure messages.
            </div>
        )
    }

    if (loading) {
        return (
            <div className='flex justify-center py-20'>
                <div className='w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin' />
            </div>
        )
    }

    return (
        <div className='flex flex-col h-[calc(100vh-220px)] min-h-[420px] bg-slate-50/80 rounded-2xl border border-slate-200 overflow-hidden'>
            <header className='flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200'>
                {peerImage ? (
                    <img src={peerImage} alt='' className='w-11 h-11 rounded-full object-cover ring-2 ring-slate-100' />
                ) : (
                    <div className='w-11 h-11 rounded-full bg-gradient-to-br from-indigo-400 to-violet-500 text-white flex items-center justify-center text-lg font-semibold'>
                        {peerLabel?.charAt(0) || '?'}
                    </div>
                )}
                <div className='min-w-0 flex-1'>
                    <p className='font-semibold text-slate-900 truncate'>{peerLabel}</p>
                    {meta?.jobTitle && (
                        <p className='text-xs text-slate-500 truncate'>Re: {meta.jobTitle}</p>
                    )}
                </div>
                {draftRole === 'company' && onDraft && (
                    <button
                        type='button'
                        onClick={onDraft}
                        disabled={loadingDraft}
                        className='text-xs font-semibold px-3 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:opacity-95 disabled:opacity-50 shrink-0'
                    >
                        {loadingDraft ? 'Drafting…' : 'AI smart draft'}
                    </button>
                )}
            </header>

            <div className='flex-1 overflow-y-auto px-3 py-4 space-y-3'>
                {messages.length === 0 && (
                    <p className='text-center text-sm text-slate-400 py-8'>
                        No messages yet. Say hello — conversation stays inside SkillNest.
                    </p>
                )}
                {messages.map((m) => {
                    const isMine = draftRole === 'user' ? m.fromUser : !m.fromUser
                    return (
                    <div
                        key={m._id}
                        className={`flex max-w-[88%] md:max-w-[75%] ${isMine ? 'justify-end ml-auto' : 'justify-start'}`}
                    >
                        <div className={`px-4 py-2.5 text-sm leading-relaxed ${bubbleClass(isMine)}`}>
                            <p className='whitespace-pre-wrap break-words'>{m.body}</p>
                            <p
                                className={`text-[10px] mt-1 opacity-70 ${isMine ? 'text-indigo-100' : 'text-slate-400'}`}
                            >
                                {new Date(m.createdAt).toLocaleString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                })}
                            </p>
                        </div>
                    </div>
                    )
                })}
                <div ref={bottomRef} />
            </div>

            <footer className='p-3 bg-white border-t border-slate-200'>
                <div className='flex gap-2 items-end'>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder='Write a secure message…'
                        rows={2}
                        className='flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none'
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault()
                                send()
                            }
                        }}
                    />
                    <button
                        type='button'
                        onClick={send}
                        className='shrink-0 h-[42px] px-5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors'
                    >
                        Send
                    </button>
                </div>
            </footer>
        </div>
    )
}
