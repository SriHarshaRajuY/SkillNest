import { useContext, useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'

const ViewApplications = () => {

    const { backendUrl, companyToken } = useContext(AppContext)

    const [applicants, setApplicants] = useState(false)
    const [viewMode, setViewMode] = useState('table') // 'table' or 'kanban'
    const [matchResults, setMatchResults] = useState({})

    const fetchCompanyJobApplications = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/company/applicants',
                { headers: { token: companyToken } }
            )
            if (data.success) {
                setApplicants(data.applications.reverse())
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const changeJobApplicationStatus = async (id, status) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/company/change-status',
                { id, status },
                { headers: { token: companyToken } }
            )
            if (data.success) {
                toast.success(`Application ${status}`)
                fetchCompanyJobApplications()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const viewApplicantResume = async (applicationId) => {
        try {
            const response = await fetch(
                `${backendUrl}/api/company/applicant-resume/${applicationId}`,
                { headers: { token: companyToken } }
            )
            const data = await response.json()
            if (data.success && data.url) {
                window.open(data.url, '_blank')
            } else {
                toast.error(data.message || 'Could not load resume')
            }
        } catch (error) {
            toast.error('Failed to open resume')
        }
    }

    const handleAIMatch = async (applicationId) => {
        setMatchResults(prev => ({ ...prev, [applicationId]: { loading: true } }))
        try {
            const { data } = await axios.get(`${backendUrl}/api/company/match-resume/${applicationId}`, {
                headers: { token: companyToken }
            })
            if (data.success) {
                setMatchResults(prev => ({
                    ...prev,
                    [applicationId]: { loading: false, score: data.score, reason: data.reason }
                }))
                toast.success('AI Match generated!')
            } else {
                setMatchResults(prev => ({ ...prev, [applicationId]: { loading: false, error: data.message } }))
                toast.error(data.message)
            }
        } catch (error) {
            setMatchResults(prev => ({ ...prev, [applicationId]: { loading: false, error: 'Failed to fetch match' } }))
            toast.error('Failed to perform AI Match')
        }
    }

    const handleDragStart = (e, applicantId) => {
        e.dataTransfer.setData('applicantId', applicantId)
    }

    const handleDragOver = (e) => {
        e.preventDefault()
    }

    const handleDrop = async (e, newStatus) => {
        e.preventDefault()
        const applicantId = e.dataTransfer.getData('applicantId')
        if (applicantId) {
            const applicant = applicants.find(a => a._id === applicantId)
            if (applicant && applicant.status !== newStatus) {
                await changeJobApplicationStatus(applicantId, newStatus)
            }
        }
    }

    useEffect(() => {
        if (companyToken) {
            fetchCompanyJobApplications()
        }
    }, [companyToken])

    if (!applicants) return <Loading />

    if (applicants.length === 0) {
        return (
            <div className='flex flex-col items-center justify-center h-[70vh] text-center'>
                <div className='text-5xl mb-4'>📋</div>
                <p className='text-xl text-gray-600 font-medium'>No Applications Yet</p>
                <p className='text-sm text-gray-400 mt-2'>Applications from job seekers will appear here</p>
            </div>
        )
    }

    const validApplicants = applicants.filter(item => item.jobId && item.userId)

    return (
        <div className='container mx-auto p-4'>
            {/* Header & Toggle */}
            <div className='flex justify-between items-center mb-6'>
                <h1 className='text-2xl font-semibold text-gray-800'>Applications</h1>
                <div className='bg-gray-100 p-1 rounded-lg flex gap-1'>
                    <button 
                        onClick={() => setViewMode('table')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'table' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Table View
                    </button>
                    <button 
                        onClick={() => setViewMode('kanban')}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-white shadow-sm text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Kanban Board
                    </button>
                </div>
            </div>

            {viewMode === 'table' ? (
                <div className='overflow-x-auto rounded-lg border border-gray-200 shadow-sm'>
                    <table className='min-w-full bg-white max-sm:text-sm'>
                        <thead className='bg-gray-50'>
                            <tr className='border-b'>
                                <th className='py-3 px-4 text-left font-medium text-gray-700'>#</th>
                                <th className='py-3 px-4 text-left font-medium text-gray-700'>Applicant</th>
                                <th className='py-3 px-4 text-left font-medium text-gray-700 max-sm:hidden'>Job Title</th>
                                <th className='py-3 px-4 text-left font-medium text-gray-700'>Resume</th>
                                <th className='py-3 px-4 text-left font-medium text-gray-700'>AI Match</th>
                                <th className='py-3 px-4 text-left font-medium text-gray-700'>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {validApplicants.map((applicant, index) => (
                                <tr key={index} className='text-gray-700 hover:bg-gray-50 transition-colors'>
                                    <td className='py-3 px-4 border-b text-center'>{index + 1}</td>
                                    <td className='py-3 px-4 border-b'>
                                        <div className='flex items-center gap-2'>
                                            <img className='w-9 h-9 rounded-full object-cover max-sm:hidden' src={applicant.userId.image} alt={applicant.userId.name} />
                                            <span className='font-medium'>{applicant.userId.name}</span>
                                        </div>
                                    </td>
                                    <td className='py-3 px-4 border-b max-sm:hidden'>{applicant.jobId.title}</td>
                                    <td className='py-3 px-4 border-b'>
                                        {applicant.userId.resume
                                            ? <button
                                                onClick={() => viewApplicantResume(applicant._id)}
                                                className='bg-blue-50 text-blue-500 px-3 py-1 rounded hover:bg-blue-100 transition-colors inline-flex gap-2 items-center text-sm'
                                            >
                                                Resume <img src={assets.resume_download_icon} alt='view' className='w-4 h-4' />
                                            </button>
                                            : <span className='text-gray-400 text-sm'>No resume</span>
                                        }
                                    </td>
                                    <td className='py-3 px-4 border-b'>
                                        {!matchResults[applicant._id] ? (
                                            <button onClick={() => handleAIMatch(applicant._id)} className='text-xs bg-indigo-50 text-indigo-600 px-4 py-1.5 rounded-full hover:bg-indigo-100 transition-all duration-300 shadow-sm border border-indigo-100 font-medium flex items-center gap-1 hover:shadow'>
                                                <svg className="w-3 h-3 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                                Get AI Score
                                            </button>
                                        ) : matchResults[applicant._id].loading ? (
                                            <div className="flex items-center gap-2 px-2 py-1 bg-gray-50 rounded-full w-fit border border-gray-100">
                                                <svg className="animate-spin h-3 w-3 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                                <span className='text-[11px] text-gray-500 font-medium tracking-wide'>Analyzing...</span>
                                            </div>
                                        ) : matchResults[applicant._id].score ? (
                                            <div className='flex flex-col gap-1.5'>
                                                <span className={`text-xs font-bold px-2.5 py-1 rounded-md shadow-sm w-fit flex items-center gap-1 ${matchResults[applicant._id].score >= 80 ? 'bg-green-50 text-green-700 border border-green-200' : matchResults[applicant._id].score >= 50 ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                                                    <div className={`w-1.5 h-1.5 rounded-full ${matchResults[applicant._id].score >= 80 ? 'bg-green-500' : matchResults[applicant._id].score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                                    {matchResults[applicant._id].score}% Match
                                                </span>
                                                <span className='text-[11px] text-gray-500 max-w-[220px] leading-relaxed'>
                                                    {matchResults[applicant._id].reason}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1 text-red-500 bg-red-50 px-2 py-1 rounded w-fit border border-red-100">
                                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                <span className='text-[11px] font-medium'>Error</span>
                                            </div>
                                        )}
                                    </td>
                                    <td className='py-3 px-4 border-b'>
                                        {applicant.status === 'Pending'
                                            ? <div className='relative inline-block text-left group'>
                                                <button className='text-gray-500 font-bold px-2 py-1 rounded hover:bg-gray-100'>···</button>
                                                <div className='z-10 hidden absolute left-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-lg shadow-lg group-hover:block'>
                                                    <button
                                                        onClick={() => changeJobApplicationStatus(applicant._id, 'Accepted')}
                                                        className='block w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 rounded-t-lg'
                                                    >
                                                        ✓ Accept
                                                    </button>
                                                    <button
                                                        onClick={() => changeJobApplicationStatus(applicant._id, 'Rejected')}
                                                        className='block w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50 rounded-b-lg'
                                                    >
                                                        ✕ Reject
                                                    </button>
                                                </div>
                                            </div>
                                            : <span className={`px-3 py-1 rounded-full text-xs font-medium ${applicant.status === 'Accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                                                {applicant.status}
                                            </span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className='flex gap-6 overflow-x-auto pb-4 h-[calc(100vh-200px)]'>
                    {['Pending', 'Accepted', 'Rejected'].map(statusColumn => (
                        <div 
                            key={statusColumn} 
                            className='flex-1 min-w-[300px] bg-gray-50 rounded-xl p-4 border border-gray-200 flex flex-col'
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, statusColumn)}
                        >
                            <h2 className={`font-semibold mb-4 pb-2 border-b-2 ${
                                statusColumn === 'Pending' ? 'border-blue-400 text-blue-700' : 
                                statusColumn === 'Accepted' ? 'border-green-400 text-green-700' : 
                                'border-red-400 text-red-700'
                            }`}>
                                {statusColumn} ({validApplicants.filter(a => a.status === statusColumn).length})
                            </h2>
                            
                            <div className='flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar'>
                                {validApplicants.filter(a => a.status === statusColumn).map(applicant => (
                                    <div 
                                        key={applicant._id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, applicant._id)}
                                        className='bg-white p-4 rounded-lg shadow-sm border border-gray-100 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow relative'
                                    >
                                        <div className='flex items-start gap-3'>
                                            <img className='w-10 h-10 rounded-full object-cover border border-gray-100' src={applicant.userId.image} alt={applicant.userId.name} />
                                            <div className='flex-1 min-w-0'>
                                                <h3 className='font-medium text-gray-900 truncate'>{applicant.userId.name}</h3>
                                                <p className='text-xs text-gray-500 truncate mb-2'>{applicant.jobId.title}</p>
                                                
                                                {/* Resume & AI Action */}
                                                <div className='flex flex-wrap items-center gap-2 mt-3'>
                                                    {applicant.userId.resume && (
                                                        <button
                                                            onClick={() => viewApplicantResume(applicant._id)}
                                                            className='text-xs text-blue-600 bg-blue-50 px-2.5 py-1.5 rounded-md hover:bg-blue-100 font-medium transition-colors'
                                                        >
                                                            View Resume
                                                        </button>
                                                    )}
                                                    
                                                    {!matchResults[applicant._id] ? (
                                                        <button 
                                                            onClick={() => handleAIMatch(applicant._id)} 
                                                            className='text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1.5 rounded-md hover:bg-indigo-100 border border-indigo-100 shadow-sm transition-all flex items-center gap-1 font-medium'
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                                                            AI Match
                                                        </button>
                                                    ) : matchResults[applicant._id].loading ? (
                                                        <div className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 rounded-md border border-gray-100">
                                                            <svg className="animate-spin h-3 w-3 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                            </svg>
                                                            <span className='text-[10px] text-gray-500 font-medium'>Analyzing</span>
                                                        </div>
                                                    ) : matchResults[applicant._id].score ? (
                                                        <span className={`text-xs font-bold px-2 py-1 rounded-md shadow-sm border flex items-center gap-1 ${matchResults[applicant._id].score >= 80 ? 'bg-green-50 text-green-700 border-green-200' : matchResults[applicant._id].score >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                                                            <div className={`w-1 h-1 rounded-full ${matchResults[applicant._id].score >= 80 ? 'bg-green-500' : matchResults[applicant._id].score >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}></div>
                                                            {matchResults[applicant._id].score}% Match
                                                        </span>
                                                    ) : (
                                                        <span className='text-xs text-red-500 bg-red-50 px-2 py-1 rounded-md border border-red-100 flex items-center gap-1'>
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                                            Error
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                {/* AI Reason (if present) */}
                                                {matchResults[applicant._id]?.score && (
                                                    <p className='text-[10px] text-gray-500 mt-2 bg-gray-50 p-2 rounded'>
                                                        {matchResults[applicant._id].reason}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default ViewApplications