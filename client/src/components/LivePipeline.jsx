import { PIPELINE_STAGES, PIPELINE_LABELS, stageIndex } from '../constants/pipeline'

const LivePipeline = ({ pipelineStage = 'Applied', pipelineHistory = [], compact = false }) => {
    const currentIdx = stageIndex(pipelineStage)
    const isRejected = pipelineStage === 'Rejected'

    const historyTimes = {}
    ;(pipelineHistory || []).forEach((h) => {
        if (h?.stage && h?.at) historyTimes[h.stage] = h.at
    })

    return (
        <div className={`w-full ${compact ? '' : 'rounded-xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm'}`}>
            <div className='flex items-center justify-between gap-2 mb-3'>
                <span className='text-xs font-semibold uppercase tracking-wider text-slate-500'>
                    Live journey
                </span>
                <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        isRejected
                            ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-100'
                            : pipelineStage === 'Hired'
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                              : 'bg-sky-50 text-sky-700 ring-1 ring-sky-100'
                    }`}
                >
                    {PIPELINE_LABELS[pipelineStage] || pipelineStage}
                </span>
            </div>

            <div className='relative'>
                <div className='absolute left-0 right-0 top-[11px] h-0.5 bg-slate-200 rounded' aria-hidden />
                <div
                    className={`absolute left-0 top-[11px] h-0.5 rounded transition-all duration-500 ${
                        isRejected ? 'bg-rose-400' : 'bg-gradient-to-r from-sky-400 to-indigo-500'
                    }`}
                    style={{
                        width: `${PIPELINE_STAGES.length > 1 ? (currentIdx / (PIPELINE_STAGES.length - 1)) * 100 : 0}%`,
                        maxWidth: '100%',
                    }}
                    aria-hidden
                />

                <div className='relative flex justify-between gap-1'>
                    {PIPELINE_STAGES.map((stage, idx) => {
                        const rejectedSkip = isRejected && stage !== 'Rejected' && idx < PIPELINE_STAGES.length - 1
                        const dotActive = isRejected
                            ? stage === 'Rejected'
                              ? true
                              : idx <= currentIdx
                            : idx <= currentIdx

                        const at = historyTimes[stage]

                        return (
                            <div key={stage} className='flex flex-col items-center flex-1 min-w-0'>
                                <div
                                    className={`z-[1] w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                        rejectedSkip && !dotActive
                                            ? 'bg-white border-slate-200 opacity-40'
                                            : dotActive
                                              ? isRejected && stage === 'Rejected'
                                                  ? 'bg-rose-500 border-rose-600 shadow-md shadow-rose-200'
                                                  : 'bg-white border-indigo-500 shadow-md shadow-indigo-100'
                                              : 'bg-white border-slate-300'
                                    }`}
                                >
                                    {dotActive && !rejectedSkip && (
                                        <span
                                            className={`block w-2 h-2 rounded-full ${
                                                isRejected && stage === 'Rejected'
                                                    ? 'bg-white'
                                                    : 'bg-indigo-500'
                                            }`}
                                        />
                                    )}
                                </div>
                                <p
                                    className={`mt-2 text-[10px] sm:text-xs text-center font-medium leading-tight px-0.5 ${
                                        dotActive ? 'text-slate-800' : 'text-slate-400'
                                    }`}
                                >
                                    {PIPELINE_LABELS[stage] || stage}
                                </p>
                                {at && dotActive && (
                                    <p className='text-[9px] text-slate-400 mt-0.5 hidden sm:block'>
                                        {new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

export default LivePipeline
