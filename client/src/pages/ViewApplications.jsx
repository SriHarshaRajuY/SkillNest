import { useContext, useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'

const ViewApplications = () => {

    const { backendUrl, companyToken } = useContext(AppContext)

    const [applicants, setApplicants] = useState(false)

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

    useEffect(() => {
        if (companyToken) {
            fetchCompanyJobApplications()
        }
    }, [companyToken])

    return applicants ? applicants.length === 0 ? (
        <div className='flex flex-col items-center justify-center h-[70vh] text-center'>
            <div className='text-5xl mb-4'>📋</div>
            <p className='text-xl text-gray-600 font-medium'>No Applications Yet</p>
            <p className='text-sm text-gray-400 mt-2'>Applications from job seekers will appear here</p>
        </div>
    ) : (
        <div className='container mx-auto p-4'>
            <div className='overflow-x-auto rounded-lg border border-gray-200 shadow-sm'>
                <table className='min-w-full bg-white max-sm:text-sm'>
                    <thead className='bg-gray-50'>
                        <tr className='border-b'>
                            <th className='py-3 px-4 text-left font-medium text-gray-700'>#</th>
                            <th className='py-3 px-4 text-left font-medium text-gray-700'>Applicant</th>
                            <th className='py-3 px-4 text-left font-medium text-gray-700 max-sm:hidden'>Job Title</th>
                            <th className='py-3 px-4 text-left font-medium text-gray-700 max-sm:hidden'>Location</th>
                            <th className='py-3 px-4 text-left font-medium text-gray-700'>Resume</th>
                            <th className='py-3 px-4 text-left font-medium text-gray-700'>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {applicants.filter(item => item.jobId && item.userId).map((applicant, index) => (
                            <tr key={index} className='text-gray-700 hover:bg-gray-50 transition-colors'>
                                <td className='py-3 px-4 border-b text-center'>{index + 1}</td>
                                <td className='py-3 px-4 border-b'>
                                    <div className='flex items-center gap-2'>
                                        <img className='w-9 h-9 rounded-full object-cover max-sm:hidden' src={applicant.userId.image} alt={applicant.userId.name} />
                                        <span className='font-medium'>{applicant.userId.name}</span>
                                    </div>
                                </td>
                                <td className='py-3 px-4 border-b max-sm:hidden'>{applicant.jobId.title}</td>
                                <td className='py-3 px-4 border-b max-sm:hidden text-gray-500'>{applicant.jobId.location}</td>
                                <td className='py-3 px-4 border-b'>
                                    {applicant.userId.resume
                                        ? <button
                                            onClick={() => viewApplicantResume(applicant._id, applicant.userId.name)}
                                            className='bg-blue-50 text-blue-500 px-3 py-1 rounded hover:bg-blue-100 transition-colors inline-flex gap-2 items-center text-sm'
                                        >
                                            Resume <img src={assets.resume_download_icon} alt='view' className='w-4 h-4' />
                                        </button>
                                        : <span className='text-gray-400 text-sm'>No resume</span>
                                    }
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
        </div>
    ) : <Loading />
}

export default ViewApplications