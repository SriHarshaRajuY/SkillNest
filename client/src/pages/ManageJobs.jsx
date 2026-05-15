import { useContext, useEffect, useState } from 'react'
import moment from 'moment'
import { useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'
import { recruiterService } from '../services/recruiterService'
import { JobCategories, JobLocations } from '../assets/assets'

const emptyEditForm = {
    title: '',
    description: '',
    location: 'Bangalore',
    category: 'Programming',
    level: 'Beginner level',
    salary: '',
}

const ManageJobs = () => {
    const navigate = useNavigate()
    const [jobs, setJobs] = useState(null)
    const [editingJob, setEditingJob] = useState(null)
    const [editForm, setEditForm] = useState(emptyEditForm)
    const [savingEdit, setSavingEdit] = useState(false)
    const { companyToken, companyData } = useContext(AppContext)
    const isAdmin = (companyData?.currentRecruiter?.role || 'Admin') === 'Admin'

    const fetchCompanyJobs = async () => {
        try {
            const response = await recruiterService.getPostedJobs()
            if (response.success) {
                setJobs(response.data.jobs || [])
            } else {
                toast.error(response.message)
                setJobs([])
            }
        } catch (error) {
            toast.error(error.message || 'Failed to fetch jobs')
            setJobs([])
        }
    }

    const changeJobVisibility = async (id) => {
        try {
            const response = await recruiterService.toggleJobVisibility(id)
            if (response.success) {
                setJobs((prev) => prev.map((job) =>
                    String(job._id) === String(id) ? { ...job, visible: response.data.job.visible } : job
                ))
            } else {
                toast.error(response.message)
            }
        } catch (error) {
            toast.error(error.message || 'Failed to change visibility')
        }
    }

    const startEdit = (job) => {
        setEditingJob(job)
        setEditForm({
            title: job.title || '',
            description: job.description || '',
            location: job.location || 'Bangalore',
            category: job.category || 'Programming',
            level: job.level || 'Beginner level',
            salary: job.salary || '',
        })
    }

    const saveEdit = async (e) => {
        e.preventDefault()
        if (!editingJob) return

        if (!editForm.title.trim() || !editForm.description.trim() || Number(editForm.salary) <= 0) {
            toast.error('Please complete title, description, and salary.')
            return
        }

        try {
            setSavingEdit(true)
            const response = await recruiterService.updateJob(editingJob._id, {
                ...editForm,
                title: editForm.title.trim(),
                description: editForm.description.trim(),
                salary: Number(editForm.salary),
            })

            if (response.success) {
                toast.success('Job updated')
                setJobs((prev) => prev.map((job) =>
                    String(job._id) === String(editingJob._id)
                        ? { ...job, ...response.data.job, applicants: job.applicants }
                        : job
                ))
                setEditingJob(null)
            }
        } catch (error) {
            toast.error(error.message || 'Failed to update job')
        } finally {
            setSavingEdit(false)
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
            <div className='w-16 h-16 mb-4 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-black text-2xl'>+</div>
            <h2 className='text-2xl font-bold text-slate-800 mb-2'>No Jobs Posted Yet</h2>
            <p className='text-slate-500 max-w-sm mb-8'>{isAdmin ? 'Create your first listing to start receiving applications.' : 'Admin recruiters can create the first listing.'}</p>
            {isAdmin && (
                <button
                    onClick={() => navigate('/dashboard/add-job')}
                    className='bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-all shadow-lg hover:-translate-y-1'
                >
                    Post Your First Job
                </button>
            )}
        </div>
    )

    return (
        <div className='container p-4 max-w-6xl animate-fade-in'>
            <div className='flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8'>
                <div>
                    <h2 className='text-2xl font-bold text-slate-900'>Manage Jobs</h2>
                    <p className='text-slate-500 text-sm font-medium'>{jobs.length} listings across active and hidden roles</p>
                </div>
                {isAdmin && (
                    <button
                        onClick={() => navigate('/dashboard/add-job')}
                        className='bg-blue-600 hover:bg-blue-700 text-white py-2.5 px-5 rounded-lg transition-all font-bold text-sm shadow-md hover:scale-[1.02]'
                    >
                        + Add New Job
                    </button>
                )}
            </div>

            <div className='overflow-x-auto rounded-xl border border-slate-200 shadow-sm'>
                <table className='min-w-full bg-white max-sm:text-sm'>
                    <thead className='bg-slate-50/80 border-b border-slate-100'>
                        <tr>
                            <th className='py-4 px-6 text-left font-bold text-slate-700 text-xs uppercase tracking-wider max-sm:hidden'>#</th>
                            <th className='py-4 px-6 text-left font-bold text-slate-700 text-xs uppercase tracking-wider'>Job Title</th>
                            <th className='py-4 px-6 text-left font-bold text-slate-700 text-xs uppercase tracking-wider max-sm:hidden'>Posted</th>
                            <th className='py-4 px-6 text-left font-bold text-slate-700 text-xs uppercase tracking-wider max-sm:hidden'>Location</th>
                            <th className='py-4 px-6 text-center font-bold text-slate-700 text-xs uppercase tracking-wider'>Applicants</th>
                            <th className='py-4 px-6 text-left font-bold text-slate-700 text-xs uppercase tracking-wider'>Visible</th>
                            {isAdmin && <th className='py-4 px-6 text-right font-bold text-slate-700 text-xs uppercase tracking-wider'>Actions</th>}
                        </tr>
                    </thead>
                    <tbody className='divide-y divide-slate-100'>
                        {jobs.map((job, index) => (
                            <tr key={job._id} className='text-gray-700 hover:bg-slate-50/80 transition-colors'>
                                <td className='py-4 px-6 max-sm:hidden text-slate-400 font-medium'>{index + 1}</td>
                                <td className='py-4 px-6'>
                                    <p className='font-bold text-slate-800'>{job.title}</p>
                                    <p className='text-xs text-slate-400 mt-0.5 sm:hidden'>{job.location}</p>
                                </td>
                                <td className='py-4 px-6 max-sm:hidden text-slate-500 font-medium'>{moment(job.date).format('DD MMM YY')}</td>
                                <td className='py-4 px-6 max-sm:hidden text-slate-500 font-medium'>{job.location}</td>
                                <td className='py-4 px-6 text-center'>
                                    <span className='bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold'>
                                        {job.applicants ?? 0}
                                    </span>
                                </td>
                                <td className='py-4 px-6'>
                                    <label className='relative inline-flex items-center cursor-pointer'>
                                        <input
                                            type='checkbox'
                                            onChange={() => changeJobVisibility(job._id)}
                                            className='sr-only peer'
                                            checked={job.visible}
                                            disabled={!isAdmin}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-100 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                                    </label>
                                </td>
                                {isAdmin && (
                                    <td className='py-4 px-6 text-right'>
                                        <button
                                            type='button'
                                            onClick={() => startEdit(job)}
                                            className='rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 transition-colors'
                                        >
                                            Edit
                                        </button>
                                    </td>
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingJob && (
                <div className='fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4'>
                    <form onSubmit={saveEdit} className='w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden'>
                        <div className='px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4'>
                            <div>
                                <p className='text-xs font-bold uppercase tracking-widest text-blue-600'>Edit role</p>
                                <h3 className='text-xl font-bold text-slate-900 mt-1'>{editingJob.title}</h3>
                            </div>
                            <button
                                type='button'
                                onClick={() => setEditingJob(null)}
                                className='rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-50'
                            >
                                Close
                            </button>
                        </div>

                        <div className='p-6 grid grid-cols-1 md:grid-cols-2 gap-5 max-h-[72vh] overflow-y-auto'>
                            <label className='md:col-span-2'>
                                <span className='text-sm font-semibold text-slate-700'>Job title</span>
                                <input
                                    value={editForm.title}
                                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                                    className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                />
                            </label>

                            <label>
                                <span className='text-sm font-semibold text-slate-700'>Category</span>
                                <select
                                    value={editForm.category}
                                    onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                                    className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                >
                                    {JobCategories.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </label>

                            <label>
                                <span className='text-sm font-semibold text-slate-700'>Location</span>
                                <select
                                    value={editForm.location}
                                    onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                                    className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                >
                                    {JobLocations.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
                                </select>
                            </label>

                            <label>
                                <span className='text-sm font-semibold text-slate-700'>Experience level</span>
                                <select
                                    value={editForm.level}
                                    onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                                    className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                >
                                    <option value='Beginner level'>Beginner</option>
                                    <option value='Intermediate level'>Intermediate</option>
                                    <option value='Senior level'>Senior</option>
                                </select>
                            </label>

                            <label>
                                <span className='text-sm font-semibold text-slate-700'>Salary per month</span>
                                <input
                                    min={1}
                                    type='number'
                                    value={editForm.salary}
                                    onChange={(e) => setEditForm({ ...editForm, salary: e.target.value })}
                                    className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                />
                            </label>

                            <label className='md:col-span-2'>
                                <span className='text-sm font-semibold text-slate-700'>Description</span>
                                <textarea
                                    rows={8}
                                    value={editForm.description}
                                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                    className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 resize-y'
                                />
                            </label>
                        </div>

                        <div className='px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3'>
                            <button type='button' onClick={() => setEditingJob(null)} className='px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold hover:bg-white'>
                                Cancel
                            </button>
                            <button disabled={savingEdit} className='px-5 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-60'>
                                {savingEdit ? 'Saving...' : 'Save changes'}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    )
}

export default ManageJobs
