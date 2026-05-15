import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'
import { RECRUITER_PIPELINE_STAGES, PIPELINE_LABELS } from '../constants/pipeline'

const ApplicationsTable = ({
    applicants,
    selectedId,
    setSelectedId,
    viewApplicantResume,
    handleAIMatch,
    matchResults,
    displayPipelineStage,
    changePipeline,
    stageOptions = RECRUITER_PIPELINE_STAGES,
    canReview = true
}) => {
    return (
        <div className='overflow-x-auto rounded-xl border border-gray-200 shadow-sm'>
            <table className='min-w-full bg-white max-sm:text-sm'>
                <thead className='bg-gray-50'>
                    <tr className='border-b'>
                        <th className='py-3 px-4 text-left font-medium text-gray-700'>#</th>
                        <th className='py-3 px-4 text-left font-medium text-gray-700'>Applicant</th>
                        <th className='py-3 px-4 text-left font-medium text-gray-700 max-sm:hidden'>Job</th>
                        <th className='py-3 px-4 text-left font-medium text-gray-700'>Resume</th>
                        <th className='py-3 px-4 text-left font-medium text-gray-700'>AI Match</th>
                        <th className='py-3 px-4 text-left font-medium text-gray-700'>Pipeline</th>
                        <th className='py-3 px-4 text-left font-medium text-gray-700'>Chat</th>
                    </tr>
                </thead>
                <tbody>
                    {applicants.map((applicant, index) => {
                        const currentStage = displayPipelineStage(applicant)
                        const optionsForApplicant = stageOptions.includes(currentStage)
                            ? stageOptions
                            : [currentStage, ...stageOptions]
                        return (
                        <tr
                            key={applicant._id}
                            className={`text-gray-700 hover:bg-gray-50 cursor-pointer ${String(selectedId) === String(applicant._id) ? 'bg-indigo-50/50' : ''}`}
                            onClick={() => setSelectedId(applicant._id)}
                        >
                            <td className='py-3 px-4 border-b text-center'>{index + 1}</td>
                            <td className='py-3 px-4 border-b min-w-[88px]'>
                                <div className='flex items-center gap-2'>
                                    <img
                                        className='w-9 h-9 rounded-full object-cover max-sm:hidden'
                                        src={applicant.userId.image || assets.profile_img}
                                        onError={(e) => { e.currentTarget.src = assets.profile_img }}
                                        alt=''
                                    />
                                    <span className='font-medium'>{applicant.userId.name}</span>
                                </div>
                            </td>
                            <td className='py-3 px-4 border-b max-sm:hidden'>{applicant.jobId.title}</td>
                            <td className='py-3 px-4 border-b'>
                                {applicant.userId.resume ? (
                                    <button
                                        type='button'
                                        onClick={(e) => { e.stopPropagation(); viewApplicantResume(applicant._id) }}
                                        disabled={!canReview}
                                        className='bg-blue-50 text-blue-500 px-3 py-1 rounded hover:bg-blue-100 text-sm disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed'
                                    >
                                        {canReview ? 'View' : 'Restricted'}
                                    </button>
                                ) : (
                                    <span className='text-gray-400 text-sm'>—</span>
                                )}
                            </td>
                            <td className='py-3 px-4 border-b min-w-[160px]'>
                                {!matchResults[applicant._id] ? (
                                    <button
                                        type='button'
                                        onClick={(e) => { e.stopPropagation(); handleAIMatch(applicant._id) }}
                                        disabled={!canReview}
                                        className='text-xs bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg font-bold hover:bg-indigo-100 transition-colors'
                                    >
                                        Analyze
                                    </button>
                                ) : matchResults[applicant._id].loading ? (
                                    <span className='text-xs text-gray-400'>Analyzing...</span>
                                ) : typeof matchResults[applicant._id].score === 'number' ? (
                                    <div>
                                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${
                                            matchResults[applicant._id].score >= 80
                                                ? 'bg-emerald-50 text-emerald-700'
                                                : matchResults[applicant._id].score >= 50
                                                    ? 'bg-amber-50 text-amber-700'
                                                    : 'bg-rose-50 text-rose-700'
                                        }`}>
                                            {matchResults[applicant._id].score}%
                                        </span>
                                        {matchResults[applicant._id].recommendation && (
                                            <p className='mt-1 max-w-[180px] truncate text-[11px] font-medium text-slate-500'>
                                                {matchResults[applicant._id].recommendation}
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    <span className='text-xs text-amber-600'>Retry</span>
                                )}
                            </td>
                            <td className='py-3 px-4 border-b' onClick={(e) => e.stopPropagation()}>
                                <select
                                    value={currentStage}
                                    onChange={(e) => changePipeline(applicant._id, e.target.value)}
                                    disabled={currentStage === 'Withdrawn' || !canReview}
                                    className='text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-2 focus:ring-indigo-500 outline-none max-w-[140px]'
                                >
                                    {optionsForApplicant.map((s) => (
                                        <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>
                                    ))}
                                </select>
                            </td>
                            <td className='py-3 px-4 border-b' onClick={(e) => e.stopPropagation()}>
                                <Link
                                    to={`/dashboard/messages/${applicant._id}`}
                                    className='text-sm font-semibold text-indigo-600 hover:text-indigo-800'
                                >
                                    Open
                                </Link>
                            </td>
                        </tr>
                    )})}
                </tbody>
            </table>
        </div>
    )
}

export default ApplicationsTable
