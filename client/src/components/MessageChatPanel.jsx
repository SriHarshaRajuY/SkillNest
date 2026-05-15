import { useEffect, useRef, useState, useCallback } from 'react'
import { toast } from 'react-toastify'
import { useSkillNestSocket } from '../hooks/useSkillNestSocket'
import { messageService } from '../services/messageService'

function bubbleClass(isMine) {
    return isMine
        ? 'ml-auto bg-indigo-600 text-white rounded-2xl rounded-br-md shadow-sm'
        : 'mr-auto bg-white border border-slate-200 text-slate-800 rounded-2xl rounded-bl-md shadow-sm'
}

export default function MessageChatPanel({
    applicationId,
    clerkToken,
    peerLabel,
    peerImage,
    draftRole, // 'user' or 'company'
    onThreadRead,
}) {
    const [messages, setMessages] = useState([])
    const [meta, setMeta] = useState(null)
    const [text, setText] = useState('')
    const [loading, setLoading] = useState(true)
    const [isPeerTyping, setIsPeerTyping] = useState(false)
    const typingTimeoutRef = useRef(null)
    const bottomRef = useRef(null)

    const isCompany = draftRole === 'company'

    const notifyThreadRead = useCallback(() => {
        if (!applicationId) return
        onThreadRead?.(applicationId)
        if (!isCompany) {
            window.dispatchEvent(new CustomEvent('skillnest:messages-read'))
        }
    }, [applicationId, isCompany, onThreadRead])

    const markThreadRead = useCallback(async () => {
        if (!applicationId) return
        try {
            if (isCompany) {
                await messageService.markRecruiterThreadRead(applicationId)
            } else if (clerkToken) {
                await messageService.markUserThreadRead(applicationId, clerkToken)
            }
        } catch (error) {
            console.error('[MessageChatPanel] Failed to mark thread read', error)
        } finally {
            notifyThreadRead()
        }
    }, [applicationId, clerkToken, isCompany, notifyThreadRead])

    // ─── Data Loading ────────────────────────────────────────────────────────
    const load = useCallback(async () => {
        if (!applicationId) return
        setLoading(true)
        try {
            const response = isCompany
                ? await messageService.getRecruiterThreadMessages(applicationId)
                : await messageService.getUserThreadMessages(applicationId, {}, clerkToken)
            
            if (response.success) {
                setMessages(response.data.messages || [])
                setMeta(response.data.application || null)
                notifyThreadRead()
            }
        } catch (e) {
            toast.error(e.message || 'Failed to load chat')
        } finally {
            setLoading(false)
        }
    }, [applicationId, isCompany, clerkToken, notifyThreadRead])

    useEffect(() => {
        load()
    }, [load])

    // ─── Socket Integration ──────────────────────────────────────────────────
    const socketAuthToken = isCompany ? localStorage.getItem('companyToken') : clerkToken

    const { emit } = useSkillNestSocket({
        backendUrl: (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, ''),
        authToken: socketAuthToken,
        applicationIds: applicationId ? [applicationId] : [],
        handlers: {
            'message:new': ({ message }) => {
                if (!message || String(message.applicationId) !== String(applicationId)) return
                setMessages((prev) => {
                    if (prev.some((m) => String(m._id) === String(message._id))) return prev
                    return [...prev, message]
                })
                const isMine = isCompany ? !message.fromUser : message.fromUser
                if (!isMine) {
                    markThreadRead()
                }
                setIsPeerTyping(false)
            },
            'typing:start': (payload) => {
                if (payload.applicationId === applicationId && payload.role !== draftRole) {
                    setIsPeerTyping(true)
                }
            },
            'typing:stop': (payload) => {
                if (payload.applicationId === applicationId && payload.role !== draftRole) {
                    setIsPeerTyping(false)
                }
            }
        },
    })

    // ─── Actions ─────────────────────────────────────────────────────────────
    const scrollToBottom = (behavior = 'smooth') => {
        bottomRef.current?.scrollIntoView({ behavior })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isPeerTyping])

    const handleTyping = (e) => {
        setText(e.target.value)
        
        emit('typing:start', { applicationId })
        
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
        typingTimeoutRef.current = setTimeout(() => {
            emit('typing:stop', { applicationId })
        }, 2000)
    }

    const send = async () => {
        const body = text.trim()
        if (!body || !applicationId) return

        // 1. Optimistic UI Update
        const tempId = `temp-${Date.now()}`
        const optimisticMsg = {
            _id: tempId,
            applicationId,
            body,
            fromUser: !isCompany,
            createdAt: new Date().toISOString(),
            isOptimistic: true
        }

        setMessages(prev => [...prev, optimisticMsg])
        setText('')
        emit('typing:stop', { applicationId })

        try {
            const response = isCompany
                ? await messageService.sendRecruiterMessage({ applicationId, content: body })
                : await messageService.sendUserMessage({ applicationId, content: body }, clerkToken)

            if (response.success) {
                // Replace optimistic message with actual one
                setMessages(prev => prev.map(m => m._id === tempId ? response.data.message : m))
            }
        } catch (e) {
            toast.error(e.message || 'Send failed')
            // Remove optimistic message on failure
            setMessages(prev => prev.filter(m => m._id !== tempId))
            setText(body) // Restore text
        }
    }

    if (!applicationId) {
        return (
            <div className='flex flex-col items-center justify-center h-[50vh] text-slate-500 text-sm'>
                <span className="text-4xl mb-4">Messages</span>
                Select a conversation to view secure messages.
            </div>
        )
    }

    if (loading) {
        return (
            <div className='flex flex-col gap-4 p-6'>
                {[1, 2, 3].map(i => (
                    <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}>
                        <div className="w-2/3 h-12 bg-slate-200 rounded-2xl animate-pulse" />
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div className='flex flex-col h-[calc(100vh-220px)] min-h-[420px] bg-slate-50/80 rounded-2xl border border-slate-200 overflow-hidden shadow-sm'>
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
            </header>

            <div className='flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-[url("https://www.transparenttextures.com/patterns/cubes.png")] bg-fixed'>
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-10 opacity-40">
                        <span className="text-3xl mb-2">Ready</span>
                        <p className='text-sm text-slate-600'>Start the conversation</p>
                    </div>
                )}
                
                {messages.map((m, index) => {
                    const isMine = isCompany ? !m.fromUser : m.fromUser
                    return (
                        <div
                            key={m._id || `${m.createdAt || 'msg'}-${index}`}
                            className={`flex group ${isMine ? 'justify-end' : 'justify-start'} animate-fade-in`}
                        >
                            <div className={`px-4 py-2.5 text-sm leading-relaxed ${bubbleClass(isMine)} ${m.isOptimistic ? 'opacity-60' : ''}`}>
                                <p className='whitespace-pre-wrap break-words'>{m.body}</p>
                                <div className="flex items-center justify-end gap-1 mt-1">
                                    <p className={`text-[10px] opacity-70 ${isMine ? 'text-indigo-100' : 'text-slate-400'}`}>
                                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    {isMine && !m.isOptimistic && <span className="text-[10px] text-indigo-200">sent</span>}
                                </div>
                            </div>
                        </div>
                    )
                })}
                
                {isPeerTyping && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-2xl rounded-bl-md shadow-sm">
                            <div className="flex gap-1">
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                            </div>
                        </div>
                    </div>
                )}
                
                <div ref={bottomRef} className="h-2" />
            </div>

            <footer className='p-4 bg-white border-t border-slate-200'>
                {meta && !['Screening', 'Interview', 'Offer', 'Hired'].includes(meta.pipelineStage) ? (
                    <div className='text-center py-3 text-sm text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300'>
                        Messaging restricted. {isCompany ? 'Shortlist the candidate' : 'Wait for shortlisting'} to enable chat.
                    </div>
                ) : (
                    <div className='flex gap-3 items-end'>
                        <div className="flex-1 relative">
                            <textarea
                                value={text}
                                onChange={handleTyping}
                                placeholder='Write a secure message...'
                                rows={1}
                                className='w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all pr-12 scrollbar-hide'
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault()
                                        send()
                                    }
                                }}
                                style={{ maxHeight: '120px' }}
                            />
                        </div>
                        <button
                            type='button'
                            onClick={send}
                            disabled={!text.trim()}
                            className='shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:grayscale'
                        >
                            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                                <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </button>
                    </div>
                )}
            </footer>
        </div>
    )
}
