import { useContext, useEffect, useState } from 'react'
import moment from 'moment'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'

const ManageJobs = () => {

    const navigate = useNavigate()
    const [jobs, setJobs] = useState(false)
    const { backendUrl, companyToken } = useContext(AppContext)

    const fetchCompanyJobs = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/company/list-jobs',
                { headers: { token: companyToken } }
            )
            if (data.success) {
                setJobs(data.jobsData)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        }
    }

    const changeJobVisibility = async (id) => {
        try {
            const { data } = await axios.post(backendUrl + '/api/company/change-visibility',
                { id },
                { headers: { token: companyToken } }
            )
            if (data.success) {
                fetchCompanyJobs()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message)
        }
    }

    useEffect(() => {
        if (companyToken) {
            fetchCompanyJobs()
        }
    }, [companyToken])

    if (!jobs) return <Loading />

    if (jobs.length === 0) return (
        <div className='flex flex-col items-center justify-center h-[70vh] text-center px-6'>
            <div className='text-6xl mb-4'>💼</div>
            <h2 className='text-2xl font-semibold text-gray-700 mb-2'>No Jobs Posted Yet</h2>
            <p className='text-gray-400 max-w-sm mb-6'>You haven't posted any jobs yet. Create your first listing to start receiving applications.</p>
            <button
                onClick={() => navigate('/dashboard/add-job')}
                className='bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-full transition-colors'
            >
                + Post Your First Job
            </button>
        </div>
    )

    return (
        <div className='container p-4 max-w-5xl'>
            <div className='flex justify-between items-center mb-4'>
                <h2 className='text-xl font-semibold text-gray-800'>Manage Jobs ({jobs.length})</h2>
                <button
                    onClick={() => navigate('/dashboard/add-job')}
                    className='bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors text-sm'
                >
                    + Add New Job
                </button>
            </div>
            <div className='overflow-x-auto rounded-lg border border-gray-200 shadow-sm'>
                <table className='min-w-full bg-white max-sm:text-sm'>
                    <thead className='bg-gray-50'>
                        <tr>
                            <th className='py-3 px-4 border-b text-left font-medium text-gray-700 max-sm:hidden'>#</th>
                            <th className='py-3 px-4 border-b text-left font-medium text-gray-700'>Job Title</th>
                            <th className='py-3 px-4 border-b text-left font-medium text-gray-700 max-sm:hidden'>Posted</th>
                            <th className='py-3 px-4 border-b text-left font-medium text-gray-700 max-sm:hidden'>Location</th>
                            <th className='py-3 px-4 border-b text-center font-medium text-gray-700'>Applicants</th>
                            <th className='py-3 px-4 border-b text-left font-medium text-gray-700'>Visible</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jobs.map((job, index) => (
                            <tr key={index} className='text-gray-700 hover:bg-gray-50 transition-colors'>
                                <td className='py-3 px-4 border-b max-sm:hidden text-gray-500'>{index + 1}</td>
                                <td className='py-3 px-4 border-b font-medium'>{job.title}</td>
                                <td className='py-3 px-4 border-b max-sm:hidden text-gray-500'>{moment(job.date).format('DD MMM YY')}</td>
                                <td className='py-3 px-4 border-b max-sm:hidden text-gray-500'>{job.location}</td>
                                <td className='py-3 px-4 border-b text-center'>
                                    <span className='bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-xs font-medium'>
                                        {job.applicants ?? 0}
                                    </span>
                                </td>
                                <td className='py-3 px-4 border-b'>
                                    <input
                                        onChange={() => changeJobVisibility(job._id)}
                                        className='scale-125 ml-4 cursor-pointer'
                                        type='checkbox'
                                        checked={job.visible}
                                        title={job.visible ? 'Click to hide job' : 'Click to show job'}
                                    />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default ManageJobs
