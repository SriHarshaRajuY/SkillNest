import { assets } from '../assets/assets'
import { Link } from 'react-router-dom'

const ApplicationCard = ({
    applicant,
    selectedId,
    setSelectedId,
    handleDragStart,
    viewApplicantResume,
    handleAIMatch,
    matchResults,
    canReview = true
}) => {
    return (
        <div
            role='button'
            tabIndex={0}
            onClick={() => setSelectedId(applicant._id)}
            onKeyDown={(e) => { if (e.key === 'Enter') setSelectedId(applicant._id) }}
            draggable={canReview}
            onDragStart={(e) => handleDragStart(e, applicant._id)}
            className={`bg-white p-4 rounded-xl shadow-sm border-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-all relative outline-none ${
                String(selectedId) === String(applicant._id)
                    ? 'ring-2 ring-indigo-400 border-indigo-200'
                    : 'border-gray-100'
            }`}
        >
            <div className='flex items-start gap-3'>
                <img 
                    className='w-10 h-10 rounded-full object-cover border border-gray-100' 
                    src={applicant.userId.image || assets.profile_img}
                    onError={(e) => { e.currentTarget.src = assets.profile_img }}
                    alt={applicant.userId.name} 
                />
                <div className='flex-1 min-w-0'>
                    <h3 className='font-medium text-gray-900 truncate'>{applicant.userId.name}</h3>
                    <p className='text-xs text-gray-500 truncate mb-2'>{applicant.jobId.title}</p>

                    <div className='flex flex-wrap items-center gap-2 mt-2' onClick={(e) => e.stopPropagation()}>
                        {applicant.userId.resume && (
                            <button
                                type='button'
                                onClick={() => viewApplicantResume(applicant._id)}
                                disabled={!canReview}
                                className='text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-md hover:bg-blue-100 font-medium transition-colors'
                            >
                                {canReview ? 'Resume' : 'Restricted'}
                            </button>
                        )}
                        <Link
                            to={`/dashboard/messages/${applicant._id}`}
                            className='text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1.5 rounded-md hover:bg-indigo-100'
                            onClick={(e) => e.stopPropagation()}
                        >
                            Message
                        </Link>

                        {!matchResults[applicant._id] ? (
                            <button
                                type='button'
                                onClick={() => handleAIMatch(applicant._id)}
                                disabled={!canReview}
                                className='text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1.5 rounded-md hover:bg-indigo-100 border border-indigo-100 shadow-sm transition-all flex items-center gap-1 font-medium'
                            >
                                AI Match
                            </button>
                        ) : matchResults[applicant._id].loading ? (
                            <span className='text-[10px] text-gray-500'>Analyzing...</span>
                        ) : typeof matchResults[applicant._id].score === 'number' ? (
                            <div className='flex items-center gap-1.5'>
                                <span className={`text-xs font-bold px-2 py-1 rounded-md border ${matchResults[applicant._id].score >= 80 ? 'bg-green-50 text-green-700 border-green-200' : matchResults[applicant._id].score >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                    {matchResults[applicant._id].score}%
                                </span>
                                {matchResults[applicant._id].confidence && (
                                    <span className='text-[10px] text-slate-400 font-bold'>{matchResults[applicant._id].confidence}</span>
                                )}
                            </div>
                        ) : (
                            <span className='text-xs text-red-500'>AI error</span>
                        )}
                    </div>

                    {matchResults[applicant._id]?.reason && (
                        <p className='text-[10px] text-gray-500 mt-2 bg-gray-50 p-2 rounded max-h-16 overflow-y-auto'>
                            {matchResults[applicant._id].reason}
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ApplicationCard
