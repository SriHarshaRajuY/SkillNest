import { useContext, useEffect, useState } from 'react'
import { useAuth, useClerk, useUser } from '@clerk/clerk-react'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import Loading from '../components/Loading'
import JobCard from '../components/JobCard'
import { applicationService } from '../services/applicationService'
import { AppContext } from '../context/AppContext'
import { toast } from 'react-toastify'

const SavedJobs = () => {
    const { user } = useUser()
    const { openSignIn } = useClerk()
    const { getToken } = useAuth()
    const { savedJobIds, setSavedJobIds } = useContext(AppContext)
    const [jobs, setJobs] = useState([])
    const [loading, setLoading] = useState(true)

    const fetchSavedJobs = async () => {
        if (!user) {
            setLoading(false)
            return
        }
        try {
            setLoading(true)
            const token = await getToken()
            const response = await applicationService.getSavedJobs(token)
            if (response.success) {
                setJobs(response.data.jobs || [])
                setSavedJobIds(response.data.savedJobIds || [])
            }
        } catch (error) {
            toast.error(error.message || 'Could not load saved roles')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchSavedJobs()
    }, [user])

    const handleSavedChange = (jobId, saved) => {
        setSavedJobIds((prev) => saved ? [...new Set([...prev, String(jobId)])] : prev.filter((id) => String(id) !== String(jobId)))
        if (!saved) setJobs((prev) => prev.filter((job) => String(job._id) !== String(jobId)))
    }

    if (!user) {
        return (
            <>
                <Navbar />
                <main className='min-h-[60vh] flex flex-col items-center justify-center text-center px-4'>
                    <h1 className='text-2xl font-black text-slate-900'>Save roles you want to revisit</h1>
                    <p className='text-slate-500 mt-2 mb-6 max-w-md'>Sign in to bookmark roles and receive more relevant recommendations.</p>
                    <button onClick={() => openSignIn()} className='rounded-lg bg-blue-600 px-5 py-2.5 font-bold text-white hover:bg-blue-700'>
                        Sign in
                    </button>
                </main>
                <Footer />
            </>
        )
    }

    return (
        <>
            <Navbar />
            <main className='container 2xl:px-20 mx-auto px-4 py-10 min-h-[65vh]'>
                <div className='mb-8'>
                    <h1 className='text-3xl font-black text-slate-900'>Saved Roles</h1>
                    <p className='text-slate-500 mt-1'>Your shortlist of roles to compare and apply later.</p>
                </div>

                {loading ? <Loading /> : jobs.length > 0 ? (
                    <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'>
                        {jobs.map((job) => (
                            <JobCard
                                key={job._id}
                                job={job}
                                isSaved={savedJobIds.map(String).includes(String(job._id))}
                                onSavedChange={handleSavedChange}
                            />
                        ))}
                    </div>
                ) : (
                    <div className='rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center'>
                        <h2 className='text-xl font-black text-slate-800'>No saved roles yet</h2>
                        <p className='text-slate-500 mt-2'>Use the save action on role cards to build your shortlist.</p>
                    </div>
                )}
            </main>
            <Footer />
        </>
    )
}

export default SavedJobs
