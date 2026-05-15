import { useContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'
import { AppContext } from '../context/AppContext'
import { recruiterService } from '../services/recruiterService'
import Pagination from '../components/Pagination'

const actionLabels = {
    RESUME_VIEWED: 'Resume viewed',
    PIPELINE_STAGE_CHANGED: 'Pipeline updated',
    AI_SCORE_GENERATED: 'AI score generated',
    INTERNAL_NOTE_ADDED: 'Internal note added',
    JOB_EDITED: 'Job edited',
    TEAM_MEMBER_CREATED: 'Team member created',
    TEAM_MEMBER_UPDATED: 'Team member updated',
}

const AuditLogs = () => {
    const { companyData } = useContext(AppContext)
    const [logs, setLogs] = useState(null)
    const [pagination, setPagination] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(30)
    const [action, setAction] = useState('')
    const role = companyData?.currentRecruiter?.role || 'Admin'

    const fetchLogs = async () => {
        if (role !== 'Admin') return

        try {
            const response = await recruiterService.getAuditLogs({
                action: action || undefined,
                page: currentPage,
                limit: pageSize,
            })
            if (response.success) {
                setLogs(response.data.logs || [])
                setPagination(response.data.pagination || null)
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load audit logs')
            setLogs([])
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [action, currentPage, pageSize, role])

    useEffect(() => {
        setCurrentPage(1)
    }, [action, pageSize])

    if (role !== 'Admin') {
        return (
            <div className='rounded-xl border border-amber-100 bg-amber-50 p-8 text-center'>
                <h2 className='text-xl font-black text-amber-900'>Admin access required</h2>
                <p className='text-amber-700 mt-2'>Audit logs are limited to Admin recruiters.</p>
            </div>
        )
    }

    if (logs === null) return <Loading />

    return (
        <div className='space-y-6 animate-fade-in'>
            <div className='flex flex-col lg:flex-row lg:items-end justify-between gap-4'>
                <div>
                    <h1 className='text-2xl font-black text-slate-900'>Audit Logs</h1>
                    <p className='text-sm text-slate-500 mt-1'>A timeline of sensitive recruiter actions for accountability.</p>
                </div>
                <div className='flex flex-wrap gap-3'>
                    <select
                        value={action}
                        onChange={(e) => setAction(e.target.value)}
                        className='rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    >
                        <option value=''>All actions</option>
                        {Object.entries(actionLabels).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                        ))}
                    </select>
                    <select
                        value={pageSize}
                        onChange={(e) => setPageSize(Number(e.target.value))}
                        className='rounded-lg border border-slate-300 px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                    >
                        {[15, 30, 50].map((size) => <option key={size} value={size}>{size}/page</option>)}
                    </select>
                </div>
            </div>

            <div className='rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
                <div className='divide-y divide-slate-100'>
                    {logs.map((log) => (
                        <div key={log._id} className='p-5 hover:bg-slate-50/70 transition-colors'>
                            <div className='flex flex-col md:flex-row md:items-center justify-between gap-3'>
                                <div>
                                    <div className='flex flex-wrap items-center gap-2'>
                                        <span className='rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700 border border-blue-100'>
                                            {actionLabels[log.action] || log.action}
                                        </span>
                                        <span className='text-xs font-bold text-slate-400'>{log.targetType}</span>
                                    </div>
                                    <p className='mt-2 font-bold text-slate-900'>{log.actorName}</p>
                                    <p className='text-xs text-slate-500'>{log.actorEmail || 'No email'} · {log.actorRole}</p>
                                </div>
                                <div className='text-left md:text-right'>
                                    <p className='text-sm font-semibold text-slate-700'>{new Date(log.createdAt).toLocaleString()}</p>
                                    <p className='text-xs text-slate-400'>Target {String(log.targetId).slice(-8)}</p>
                                </div>
                            </div>
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                <div className='mt-3 flex flex-wrap gap-2'>
                                    {Object.entries(log.metadata).map(([key, value]) => (
                                        <span key={key} className='rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600'>
                                            {key}: {String(value)}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className='p-12 text-center'>
                            <h2 className='font-black text-slate-800'>No audit events yet</h2>
                            <p className='text-sm text-slate-500 mt-1'>Sensitive recruiter actions will appear here.</p>
                        </div>
                    )}
                </div>
            </div>
            {pagination?.totalPages > 1 && (
                <Pagination
                    currentPage={pagination.currentPage || currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={setCurrentPage}
                />
            )}
        </div>
    )
}

export default AuditLogs
