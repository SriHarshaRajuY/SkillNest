import { useEffect, useMemo, useState } from 'react'
import { recruiterService } from '../services/recruiterService'
import Loading from '../components/Loading'
import { toast } from 'react-toastify'
import { PIPELINE_LABELS } from '../constants/pipeline'

const Analytics = () => {
    const [stats, setStats] = useState(null)
    const [loading, setLoading] = useState(true)

    const fetchStats = async () => {
        try {
            const response = await recruiterService.getAnalytics()
            if (response.success) {
                setStats(response.data)
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load analytics')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchStats()
    }, [])

    const maxTrend = useMemo(() => {
        if (!stats?.applicationsOverTime?.length) return 1
        return Math.max(1, ...stats.applicationsOverTime.map((item) => item.count))
    }, [stats])

    if (loading) return <Loading />
    if (!stats) return <div className='text-center py-10 text-gray-500'>No analytics data available.</div>

    const { summary, appsPerJob, pipelineDistribution, applicationsOverTime, conversionRates, timeToStage } = stats
    const statCards = [
        { label: 'Total Applicants', value: summary.totalApplicants, accent: 'text-blue-700', bg: 'bg-blue-50' },
        { label: 'Active Applicants', value: summary.activeApplicants, accent: 'text-slate-800', bg: 'bg-slate-50' },
        { label: 'Shortlist Rate', value: `${summary.shortlistRate}%`, accent: 'text-violet-700', bg: 'bg-violet-50' },
        { label: 'Avg Match Score', value: summary.scoredApplicants ? `${summary.averageMatchScore}%` : 'N/A', accent: 'text-emerald-700', bg: 'bg-emerald-50' },
    ]

    return (
        <div className='space-y-8 animate-fade-in'>
            <div>
                <h2 className='text-2xl font-bold text-gray-900'>Hiring Insights</h2>
                <p className='text-sm text-slate-500 mt-1'>Track funnel health, candidate flow, and AI-assisted screening quality.</p>
            </div>

            <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                {statCards.map((card) => (
                    <div key={card.label} className={`${card.bg} p-5 rounded-xl border border-white/70 shadow-sm`}>
                        <p className='text-xs font-bold text-gray-500 uppercase tracking-wider'>{card.label}</p>
                        <p className={`text-3xl font-black mt-2 ${card.accent}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
                <section className='xl:col-span-2 bg-white p-6 rounded-xl border border-gray-100 shadow-sm'>
                    <div className='flex items-center justify-between gap-4 mb-6'>
                        <div>
                            <h3 className='text-lg font-bold text-gray-900'>Applications Trend</h3>
                            <p className='text-sm text-slate-500'>Last 14 days</p>
                        </div>
                        <span className='text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full'>
                            {applicationsOverTime.reduce((sum, item) => sum + item.count, 0)} total
                        </span>
                    </div>
                    <div className='h-56 flex items-end gap-2 border-b border-slate-100 pb-2'>
                        {applicationsOverTime.map((item) => (
                            <div key={item.date} className='flex-1 h-full flex flex-col justify-end items-center gap-2 group'>
                                <div className='text-[11px] font-bold text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity'>{item.count}</div>
                                <div
                                    className='w-full max-w-8 rounded-t-lg bg-blue-600/80 group-hover:bg-blue-700 transition-all'
                                    style={{ height: `${Math.max(6, (item.count / maxTrend) * 100)}%` }}
                                />
                            </div>
                        ))}
                    </div>
                    <div className='mt-3 grid grid-cols-7 gap-2 text-[10px] text-slate-400 font-semibold'>
                        {applicationsOverTime.filter((_, i) => i % 2 === 0).map((item) => (
                            <span key={item.date}>{new Date(item.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        ))}
                    </div>
                </section>

                <section className='bg-white p-6 rounded-xl border border-gray-100 shadow-sm'>
                    <h3 className='text-lg font-bold text-gray-900 mb-5'>Funnel Conversion</h3>
                    <div className='space-y-4'>
                        {conversionRates.map((item) => (
                            <div key={item.stage}>
                                <div className='flex justify-between text-sm mb-1'>
                                    <span className='font-semibold text-gray-700'>{PIPELINE_LABELS[item.stage] || item.stage}</span>
                                    <span className='text-gray-500'>{item.rate}%</span>
                                </div>
                                <div className='w-full bg-gray-100 rounded-full h-2 overflow-hidden'>
                                    <div className='bg-indigo-600 h-full rounded-full transition-all duration-1000' style={{ width: `${item.rate}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>

            <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                <section className='bg-white p-6 rounded-xl border border-gray-100 shadow-sm'>
                    <h3 className='text-lg font-bold text-gray-900 mb-5'>Pipeline Distribution</h3>
                    <div className='space-y-4'>
                        {pipelineDistribution.map((item) => (
                            <div key={item.stage}>
                                <div className='flex justify-between text-sm mb-1'>
                                    <span className='font-semibold text-gray-700'>{PIPELINE_LABELS[item.stage] || item.stage}</span>
                                    <span className='text-gray-500'>{item.count}</span>
                                </div>
                                <div className='w-full bg-gray-100 rounded-full h-2 overflow-hidden'>
                                    <div
                                        className='bg-blue-600 h-full rounded-full transition-all duration-1000'
                                        style={{ width: `${(item.count / (summary.totalApplicants || 1)) * 100}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <section className='bg-white p-6 rounded-xl border border-gray-100 shadow-sm'>
                    <h3 className='text-lg font-bold text-gray-900 mb-5'>Time To Stage</h3>
                    <div className='space-y-3'>
                        {timeToStage.length === 0 && <p className='text-sm text-slate-400'>Move candidates through stages to generate timing metrics.</p>}
                        {timeToStage.map((item) => (
                            <div key={item.stage} className='flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-2'>
                                <span className='text-sm font-semibold text-slate-700'>{PIPELINE_LABELS[item.stage] || item.stage}</span>
                                <span className='text-sm font-black text-slate-900'>{item.averageDays}d</span>
                            </div>
                        ))}
                    </div>
                </section>

                <section className='bg-white p-6 rounded-xl border border-gray-100 shadow-sm'>
                    <h3 className='text-lg font-bold text-gray-900 mb-5'>Applications Per Job</h3>
                    <div className='max-h-[320px] overflow-y-auto space-y-3 pr-2'>
                        {appsPerJob.map((job) => (
                            <div key={job._id} className='flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100'>
                                <p className='text-sm font-semibold text-gray-800 truncate flex-1'>{job.title}</p>
                                <span className='bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full ml-4'>
                                    {job.count}
                                </span>
                            </div>
                        ))}
                        {appsPerJob.length === 0 && <p className='text-gray-400 text-sm text-center py-4'>No jobs posted yet.</p>}
                    </div>
                </section>
            </div>
        </div>
    )
}

export default Analytics
