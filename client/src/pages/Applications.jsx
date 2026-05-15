import { Fragment, useContext, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { assets, JobCategories, JobLocations } from '../assets/assets'
import moment from 'moment'
import Footer from '../components/Footer'
import { AppContext } from '../context/AppContext'
import { useAuth, useUser } from '@clerk/clerk-react'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'
import LivePipeline from '../components/LivePipeline'
import { useSkillNestSocket } from '../hooks/useSkillNestSocket'
import { PIPELINE_LABELS } from '../constants/pipeline'
import { authService } from '../services/authService'
import { applicationService } from '../services/applicationService'

function displayPipelineStage(job) {
    if (job.pipelineStage) return job.pipelineStage
    if (job.status === 'Accepted') return 'Offer'
    if (job.status === 'Rejected') return 'Rejected'
    return 'Applied'
}


const Applications = () => {

    const { user } = useUser()
    const { getToken } = useAuth()

    const [isEdit, setIsEdit] = useState(false)
    const [resume, setResume] = useState(null)
    const [realtimeToken, setRealtimeToken] = useState(null)
    const [skillsInput, setSkillsInput] = useState('')
    const [preferredLocations, setPreferredLocations] = useState([])
    const [preferredCategories, setPreferredCategories] = useState([])
    const [experienceLevel, setExperienceLevel] = useState('')
    const [savingPreferences, setSavingPreferences] = useState(false)

    const {
        backendUrl,
        userData,
        setUserData,
        userApplications,
        userDataLoaded,
        fetchUserData,
        setUserApplications,
        apiOffline,
    } = useContext(AppContext)

    const applicationIds = useMemo(() => userApplications.map((j) => j._id), [userApplications])

    useEffect(() => {
        if (!user || !userData) return
        let cancelled = false
        ;(async () => {
            try {
                const token = await getToken()
                if (!token || cancelled) return
                const response = await authService.getRealtimeToken(token)
                if (!cancelled && response.success) setRealtimeToken(response.data.token)
            } catch {
                if (!cancelled) setRealtimeToken(null)
            }
        })()
        return () => { cancelled = true }
    }, [user, userData, backendUrl, getToken])

    useSkillNestSocket({
        backendUrl,
        authToken: realtimeToken,
        applicationIds,
        handlers: {
            'pipeline:updated': (payload) => {
                const { applicationId, pipelineStage, pipelineHistory, status } = payload
                setUserApplications((prev) =>
                    prev.map((a) =>
                        String(a._id) === String(applicationId)
                            ? { ...a, pipelineStage, pipelineHistory, status }
                            : a,
                    ),
                )
            },
        },
    })

    useEffect(() => {
        if (!userData) return
        setSkillsInput((userData.skills || []).join(', '))
        setPreferredLocations(userData.preferredLocations || [])
        setPreferredCategories(userData.preferredCategories || [])
        setExperienceLevel(userData.experienceLevel || '')
    }, [userData])

    const updateResume = async () => {
        if (!resume) {
            return toast.error('Please select a PDF file first.')
        }

        try {
            const formData = new FormData()
            formData.append('resume', resume)

            const token = await getToken()
            const response = await applicationService.updateResume(formData, token)

            if (response.success) {
                toast.success(response.message)
                await fetchUserData()
            } else {
                toast.error(response.message)
            }
        } catch (error) {
            toast.error(error.message)
        }

        setIsEdit(false)
        setResume(null)
    }

    const togglePreference = (value, list, setter) => {
        setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value])
    }

    const savePreferences = async () => {
        try {
            setSavingPreferences(true)
            const token = await getToken()
            const skills = skillsInput
                .split(',')
                .map((skill) => skill.trim())
                .filter(Boolean)

            const response = await applicationService.updatePreferences({
                skills,
                preferredLocations,
                preferredCategories,
                experienceLevel,
            }, token)

            if (response.success) {
                setUserData(response.data.user)
                toast.success('Career preferences saved')
            }
        } catch (error) {
            toast.error(error.message || 'Failed to save preferences')
        } finally {
            setSavingPreferences(false)
        }
    }

    const withdrawApplication = async (applicationId) => {
        const confirmed = window.confirm('Withdraw this application? Recruiters will see it as withdrawn.')
        if (!confirmed) return

        try {
            const token = await getToken()
            const response = await applicationService.withdrawApplication(applicationId, token)
            if (response.success) {
                toast.success(response.message)
                setUserApplications((prev) => prev.map((application) =>
                    String(application._id) === String(applicationId)
                        ? { ...application, ...response.data.application }
                        : application
                ))
            }
        } catch (error) {
            toast.error(error.message || 'Failed to withdraw application')
        }
    }


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
                    <div className='text-6xl mb-4'>!</div>
                    <h2 className='text-2xl font-semibold text-gray-700 mb-2'>
                        {apiOffline ? 'Backend API is offline' : 'Could not load your profile'}
                    </h2>
                    <p className='text-gray-500 mb-6 max-w-md'>
                        {apiOffline
                            ? 'Start the backend server on port 5000, then retry.'
                            : 'There was an issue loading your profile. This can happen right after signing up. Please try again.'}
                    </p>
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
                                        const result = await applicationService.getResumeUrl(token)
                                        if (result.success && result.data?.url) {
                                            window.open(result.data.url, '_blank')
                                        } else {
                                            toast.error(result.message || 'Could not load resume')
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

                {/* Career Preferences */}
                <div className='mb-10 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm'>
                    <div className='flex flex-col lg:flex-row lg:items-start justify-between gap-6'>
                        <div className='flex-1'>
                            <h2 className='text-xl font-semibold text-slate-900'>Career Preferences</h2>
                            <p className='text-sm text-slate-500 mt-1'>Used to improve your saved-job recommendations.</p>
                            <label className='block mt-4'>
                                <span className='text-sm font-bold text-slate-700'>Skills</span>
                                <input
                                    value={skillsInput}
                                    onChange={(e) => setSkillsInput(e.target.value)}
                                    placeholder='React, Node.js, MongoDB, Java'
                                    className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                />
                            </label>
                            <label className='block mt-4 max-w-xs'>
                                <span className='text-sm font-bold text-slate-700'>Experience Level</span>
                                <select
                                    value={experienceLevel}
                                    onChange={(e) => setExperienceLevel(e.target.value)}
                                    className='mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                >
                                    <option value=''>No preference</option>
                                    <option value='Beginner level'>Beginner</option>
                                    <option value='Intermediate level'>Intermediate</option>
                                    <option value='Senior level'>Senior</option>
                                </select>
                            </label>
                        </div>
                        <div className='flex-1 grid sm:grid-cols-2 gap-5'>
                            <div>
                                <p className='text-sm font-bold text-slate-700 mb-2'>Preferred Categories</p>
                                <div className='flex flex-wrap gap-2'>
                                    {JobCategories.map((category) => (
                                        <button
                                            key={category}
                                            type='button'
                                            onClick={() => togglePreference(category, preferredCategories, setPreferredCategories)}
                                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${preferredCategories.includes(category) ? 'border-blue-200 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <p className='text-sm font-bold text-slate-700 mb-2'>Preferred Locations</p>
                                <div className='flex flex-wrap gap-2'>
                                    {JobLocations.map((location) => (
                                        <button
                                            key={location}
                                            type='button'
                                            onClick={() => togglePreference(location, preferredLocations, setPreferredLocations)}
                                            className={`rounded-lg border px-3 py-1.5 text-xs font-bold ${preferredLocations.includes(location) ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
                                        >
                                            {location}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className='mt-5 flex justify-end'>
                        <button
                            type='button'
                            onClick={savePreferences}
                            disabled={savingPreferences}
                            className='rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60'
                        >
                            {savingPreferences ? 'Saving...' : 'Save preferences'}
                        </button>
                    </div>
                </div>

                {/* Applications + live pipeline */}
                <h2 className='text-xl font-semibold mb-1'>Jobs Applied</h2>
                <p className='text-sm text-gray-500 mb-4'>
                    Your pipeline updates instantly when recruiters move your application — no more silence after you apply.
                </p>
                {userApplications.length === 0
                    ? <div className='text-center py-20 border rounded-lg bg-gray-50'>
                        <div className='text-5xl mb-4'>No applications</div>
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
                                <th className='py-3 px-4 border-b text-left font-medium text-gray-700'>Stage</th>
                                <th className='py-3 px-4 border-b text-left font-medium text-gray-700'>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {userApplications.map((job) => {
                                const stage = displayPipelineStage(job)
                                const stageCls =
                                    stage === 'Withdrawn'
                                        ? 'bg-slate-100 text-slate-700'
                                        : stage === 'Rejected'
                                        ? 'bg-red-100 text-red-700'
                                        : stage === 'Hired' || stage === 'Offer'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-sky-100 text-sky-800'
                                const canMessage = ['Screening', 'Interview', 'Offer', 'Hired'].includes(stage)
                                const canWithdraw = !['Withdrawn', 'Rejected', 'Hired'].includes(stage)
                                return (
                                    <Fragment key={job._id}>
                                        <tr className='hover:bg-gray-50 transition-colors'>
                                            <td className='py-3 px-4 align-middle border-b'>
                                                <div className='flex items-center gap-2'>
                                                    <img
                                                        className='w-8 h-8 rounded-full object-cover'
                                                        src={job.companyId.image || assets.company_icon}
                                                        onError={(e) => { e.currentTarget.src = assets.company_icon }}
                                                        alt={job.companyId.name}
                                                    />
                                                    <span className='font-medium'>{job.companyId.name}</span>
                                                </div>
                                            </td>
                                            <td className='py-2 px-4 border-b align-middle'>{job.jobId.title}</td>
                                            <td className='py-2 px-4 border-b max-sm:hidden text-gray-600 align-middle'>{job.jobId.location}</td>
                                            <td className='py-2 px-4 border-b max-sm:hidden text-gray-600 align-middle'>{moment(job.date).format('DD MMM YYYY')}</td>
                                            <td className='py-2 px-4 border-b align-middle'>
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${stageCls}`}>
                                                    {PIPELINE_LABELS[stage] || stage}
                                                </span>
                                            </td>
                                            <td className='py-2 px-4 border-b align-middle'>
                                                <div className='flex flex-wrap items-center gap-2'>
                                                    {canMessage ? (
                                                        <Link
                                                            to={`/messages/${job._id}`}
                                                            className='inline-flex items-center justify-center whitespace-nowrap rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700 hover:bg-indigo-100'
                                                        >
                                                            Message
                                                        </Link>
                                                    ) : (
                                                        <span className='text-xs font-semibold text-slate-400'>Locked</span>
                                                    )}
                                                    {canWithdraw && (
                                                        <button
                                                            type='button'
                                                            onClick={() => withdrawApplication(job._id)}
                                                            className='inline-flex items-center justify-center whitespace-nowrap rounded-lg border border-rose-100 bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100'
                                                        >
                                                            Withdraw
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        <tr className='bg-slate-50/90'>
                                            <td colSpan={6} className='px-4 py-4 border-b border-slate-100'>
                                                <LivePipeline
                                                    compact={false}
                                                    pipelineStage={stage}
                                                    pipelineHistory={job.pipelineHistory || []}
                                                />
                                            </td>
                                        </tr>
                                    </Fragment>
                                )
                            })}
                        </tbody>
                    </table>
                }
            </div>
            <Footer />
        </>
    )
}

export default Applications
