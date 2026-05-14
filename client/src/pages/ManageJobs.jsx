import { useContext, useEffect, useState } from 'react'
import moment from 'moment'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'
import { recruiterService } from '../services/recruiterService'

const ManageJobs = () => {

    const navigate = useNavigate()
    const [jobs, setJobs] = useState(null)
    const { companyToken } = useContext(AppContext)

    const fetchCompanyJobs = async () => {
        try {
            const response = await recruiterService.getPostedJobs()
            if (response.success) {
                setJobs(response.data.jobs || [])
            } else {
                toast.error(response.message)
                setJobs([]) // Stop loading
            }
        } catch (error) {
            toast.error(error.message || 'Failed to fetch jobs')
            setJobs([]) // Stop loading
        }
    }

    const changeJobVisibility = async (id) => {
        try {
            const response = await recruiterService.toggleJobVisibility(id)
            if (response.success) {
                fetchCompanyJobs()
            } else {
                toast.error(response.message)
            }
        } catch (error) {
            toast.error(error.message || 'Failed to change visibility')
        }
    }

    useEffect(() => {
        if (companyToken) {
            fetchCompanyJobs()
        }
    }, [companyToken])

    if (jobs === null) return <Loading />

    if (jobs.length === 0) return (
        <div className='flex flex-col items-center justify-center h-[70vh] text-center px-6 animate-fade-in'>
            <div className='text-6xl mb-4'>💼</div>
            <h2 className='text-2xl font-bold text-slate-800 mb-2'>No Jobs Posted Yet</h2>
            <p className='text-slate-500 max-w-sm mb-8'>You haven't posted any jobs yet. Create your first listing to start receiving applications.</p>
            <button
                onClick={() => navigate('/dashboard/add-job')}
                className='bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-2xl transition-all shadow-lg hover:-translate-y-1'
            >
                + Post Your First Job
            </button>
        </div>
    )

    return (
        <div className='container p-4 max-w-5xl animate-fade-in'>
            <div className='flex justify-between items-center mb-8'>
                <div>
                    <h2 className='text-2xl font-bold text-slate-900'>Manage Jobs</h2>
                    <p className='text-slate-500 text-sm font-medium'>You have {jobs.length} active listings</p>
                </div>
                <button
                    onClick={() => navigate('/dashboard/add-job')}
                    className='bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-5 rounded-xl transition-all font-bold text-sm shadow-md hover:scale-[1.02]'
                >
                    + Add New Job
                </button>
            </div>
            <div className='overflow-x-auto rounded-2xl border border-slate-200 shadow-sm'>
                <table className='min-w-full bg-white max-sm:text-sm'>
                    <thead className='bg-slate-50/50 border-b border-slate-100'>
                        <tr>
                            <th className='py-4 px-6 text-left font-bold text-slate-700 text-xs uppercase tracking-wider max-sm:hidden'>#</th>
                            <th className='py-4 px-6 text-left font-bold text-slate-700 text-xs uppercase tracking-wider'>Job Title</th>
                            <th className='py-4 px-6 text-left font-bold text-slate-700 text-xs uppercase tracking-wider max-sm:hidden'>Posted</th>
                            <th className='py-4 px-6 text-left font-bold text-slate-700 text-xs uppercase tracking-wider max-sm:hidden'>Location</th>
                            <th className='py-4 px-6 text-center font-bold text-slate-700 text-xs uppercase tracking-wider'>Applicants</th>
                            <th className='py-4 px-6 text-left font-bold text-slate-700 text-xs uppercase tracking-wider'>Visible</th>
                        </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                        {jobs.map((job, index) => (
                            <tr key={index} className='text-gray-700 hover:bg-slate-50/80 transition-colors'>
                                <td className='py-4 px-6 max-sm:hidden text-slate-400 font-medium'>{index + 1}</td>
                                <td className='py-4 px-6 font-bold text-slate-800'>{job.title}</td>
                                <td className='py-4 px-6 max-sm:hidden text-slate-500 font-medium'>{moment(job.date).format('DD MMM YY')}</td>
                                <td className='py-4 px-6 max-sm:hidden text-slate-500 font-medium'>{job.location}</td>
                                <td className='py-4 px-6 text-center'>
                                    <span className='bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold'>
                                        {job.applicants ?? 0}
                                    </span>
                                </td>
                                <td className='py-4 px-6'>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            onChange={() => changeJobVisibility(job._id)}
                                            className="sr-only peer"
                                            checked={job.visible}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
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
