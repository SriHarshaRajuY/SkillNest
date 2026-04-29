import { useContext, useEffect, useState } from 'react'
import Navbar from '../components/Navbar'
import { assets } from '../assets/assets'
import moment from 'moment'
import Footer from '../components/Footer'
import { AppContext } from '../context/AppContext'
import { useAuth, useUser } from '@clerk/clerk-react'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'


const Applications = () => {

    const { user } = useUser()
    const { getToken } = useAuth()

    const [isEdit, setIsEdit] = useState(false)
    const [resume, setResume] = useState(null)

    const {
        backendUrl,
        userData,
        userApplications,
        userDataLoaded,
        fetchUserData,
        fetchUserApplications
    } = useContext(AppContext)

    const updateResume = async () => {
        if (!resume) {
            return toast.error('Please select a PDF file first.')
        }

        try {
            const formData = new FormData()
            formData.append('resume', resume)

            const token = await getToken()
            const { data } = await axios.post(
                backendUrl + '/api/users/update-resume',
                formData,
                { headers: { Authorization: `Bearer ${token}` } }
            )

            if (data.success) {
                toast.success(data.message)
                await fetchUserData()
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }

        setIsEdit(false)
        setResume(null)
    }

    useEffect(() => {
        if (user) {
            fetchUserApplications()
        }
    }, [user])

    // ─── Not logged in ───────────────────────────────────────────────────────────
    if (!user) {
        return (
            <>
                <Navbar />
                <div className='container px-4 min-h-[65vh] 2xl:px-20 mx-auto my-10 flex flex-col items-center justify-center text-center'>
                    <div className='text-6xl mb-4'>🔐</div>
                    <h2 className='text-2xl font-semibold text-gray-700 mb-2'>Login Required</h2>
                    <p className='text-gray-500 max-w-md'>Please sign in to view your applied jobs and manage your resume.</p>
                </div>
                <Footer />
            </>
        )
    }

    // ─── Still loading from server ───────────────────────────────────────────────
    if (!userDataLoaded) {
        return <Loading />
    }

    // ─── Load failed (server error, user not created, etc.) ──────────────────────
    if (!userData) {
        return (
            <>
                <Navbar />
                <div className='container px-4 min-h-[65vh] 2xl:px-20 mx-auto my-10 flex flex-col items-center justify-center text-center'>
                    <div className='text-6xl mb-4'>⚠️</div>
                    <h2 className='text-2xl font-semibold text-gray-700 mb-2'>Could not load your profile</h2>
                    <p className='text-gray-500 mb-6 max-w-md'>There was an issue loading your profile. This can happen right after signing up. Please try again.</p>
                    <button
                        onClick={fetchUserData}
                        className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition-colors'
                    >
                        Retry
                    </button>
                </div>
                <Footer />
            </>
        )
    }

    // ─── Loaded successfully ──────────────────────────────────────────────────────
    return (
        <>
            <Navbar />
            <div className='container px-4 min-h-[65vh] 2xl:px-20 mx-auto my-10'>

                {/* Resume Section */}
                <h2 className='text-xl font-semibold'>Your Resume</h2>
                <div className='flex gap-2 mb-6 mt-3'>
                    {isEdit || !userData.resume
                        ? <>
                            <label className='flex items-center cursor-pointer' htmlFor='resumeUpload'>
                                <p className='bg-blue-100 text-blue-600 px-4 py-2 rounded-lg mr-2'>
                                    {resume ? resume.name : 'Select Resume (PDF)'}
                                </p>
                                <input
                                    id='resumeUpload'
                                    onChange={e => setResume(e.target.files[0])}
                                    accept='application/pdf'
                                    type='file'
                                    hidden
                                />
                                <img src={assets.profile_upload_icon} alt='upload' />
                            </label>
                            <button
                                onClick={updateResume}
                                disabled={!resume}
                                className={`border rounded-lg px-4 py-2 transition-colors ${resume
                                    ? 'bg-green-100 border-green-400 text-green-700 hover:bg-green-200'
                                    : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                Save
                            </button>
                            {isEdit && (
                                <button
                                    onClick={() => { setIsEdit(false); setResume(null) }}
                                    className='text-gray-500 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50'
                                >
                                    Cancel
                                </button>
                            )}
                        </>
                        : <div className='flex gap-2'>
                            <button
                                onClick={async () => {
                                    try {
                                        const token = await getToken()
                                        const res = await fetch(`${backendUrl}/api/users/resume`, {
                                            headers: { Authorization: `Bearer ${token}` }
                                        })
                                        const data = await res.json()
                                        if (data.success && data.url) {
                                            window.open(data.url, '_blank')
                                        } else {
                                            toast.error(data.message || 'Could not load resume')
                                        }
                                    } catch { toast.error('Failed to open resume') }
                                }}
                                className='bg-blue-100 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer'
                            >
                                View Resume
                            </button>
                            <button
                                onClick={() => setIsEdit(true)}
                                className='text-gray-500 border border-gray-300 rounded-lg px-4 py-2 hover:bg-gray-50'
                            >
                                Update
                            </button>
                        </div>
                    }
                </div>

                {/* Applications Table */}
                <h2 className='text-xl font-semibold mb-4'>Jobs Applied</h2>
                {userApplications.length === 0
                    ? <div className='text-center py-20 border rounded-lg bg-gray-50'>
                        <div className='text-5xl mb-4'>📋</div>
                        <p className='text-xl text-gray-600 font-medium'>No applications yet</p>
                        <p className='text-sm text-gray-400 mt-2'>Browse jobs and apply to get started!</p>
                    </div>
                    : <table className='min-w-full bg-white border rounded-lg overflow-hidden'>
                        <thead className='bg-gray-50'>
                            <tr>
                                <th className='py-3 px-4 border-b text-left font-medium text-gray-700'>Company</th>
                                <th className='py-3 px-4 border-b text-left font-medium text-gray-700'>Job Title</th>
                                <th className='py-3 px-4 border-b text-left font-medium text-gray-700 max-sm:hidden'>Location</th>
                                <th className='py-3 px-4 border-b text-left font-medium text-gray-700 max-sm:hidden'>Applied On</th>
                                <th className='py-3 px-4 border-b text-left font-medium text-gray-700'>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userApplications.map((job, index) => (
                                <tr key={index} className='hover:bg-gray-50 transition-colors'>
                                    <td className='py-3 px-4 flex items-center gap-2 border-b'>
                                        <img className='w-8 h-8 rounded-full object-cover' src={job.companyId.image} alt={job.companyId.name} />
                                        <span className='font-medium'>{job.companyId.name}</span>
                                    </td>
                                    <td className='py-2 px-4 border-b'>{job.jobId.title}</td>
                                    <td className='py-2 px-4 border-b max-sm:hidden text-gray-600'>{job.jobId.location}</td>
                                    <td className='py-2 px-4 border-b max-sm:hidden text-gray-600'>{moment(job.date).format('DD MMM YYYY')}</td>
                                    <td className='py-2 px-4 border-b'>
                                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${job.status === 'Accepted'
                                            ? 'bg-green-100 text-green-700'
                                            : job.status === 'Rejected'
                                                ? 'bg-red-100 text-red-700'
                                                : 'bg-blue-100 text-blue-700'
                                            }`}>
                                            {job.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                }
            </div>
            <Footer />
        </>
    )
}

export default Applications