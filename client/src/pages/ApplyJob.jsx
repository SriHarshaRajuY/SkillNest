import { useContext, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import Loading from '../components/Loading'
import Navbar from '../components/Navbar'
import { assets } from '../assets/assets'
import kconvert from 'k-convert';
import moment from 'moment';
import JobCard from '../components/JobCard'
import Footer from '../components/Footer'
import { toast } from 'react-toastify'
import { useAuth, useUser, useClerk } from '@clerk/clerk-react'
import { jobService } from '../services/jobService'
import { applicationService } from '../services/applicationService'

const ApplyJob = () => {

  const { id } = useParams()

  const { getToken } = useAuth()
  const { user } = useUser()
  const { openSignIn } = useClerk()

  const navigate = useNavigate()

  const [JobData, setJobData] = useState(null)
  const [isAlreadyApplied, setIsAlreadyApplied] = useState(false)

  const { jobs, userData, userDataLoaded, userApplications, fetchUserApplications } = useContext(AppContext)

  const fetchJob = async () => {

    try {

      const response = await jobService.getJobById(id)

      if (response.success) {
        setJobData(response.data.job)
      } else {
        toast.error(response.message)
      }

    } catch (error) {
      toast.error(error.message)
    }

  }

  const applyHandler = async () => {
    try {

      // Not logged in at all (Clerk)
      if (!user) {
        toast.info('Please sign in to apply for this job')
        openSignIn()
        return
      }

      // Still fetching profile from server
      if (!userDataLoaded) {
        return toast.error('Loading your profile, please wait...')
      }

      // Profile loaded but null (server error - very rare)
      if (!userData) {
        return toast.error('Could not load your profile. Please refresh the page.')
      }

      if (!userData.resume) {
        navigate('/applications')
        return toast.error('Please upload your resume before applying')
      }

      const token = await getToken()

      const response = await applicationService.applyToJob(JobData._id, token)

      if (response.success) {
        toast.success(response.message)
        fetchUserApplications()
      } else {
        toast.error(response.message)
      }

    } catch (error) {
      toast.error(error.message)
    }
  }

  const checkAlreadyApplied = () => {

    const hasApplied = userApplications.some(item => item.jobId && item.jobId._id === JobData._id)
    setIsAlreadyApplied(hasApplied)

  }

  useEffect(() => {
    fetchJob()
  }, [id])

  useEffect(() => {
    if (userApplications.length > 0 && JobData) {
      checkAlreadyApplied()
    }
  }, [JobData, userApplications, id])

  return JobData ? (
    <>
      <Navbar />

      <div className='min-h-screen flex flex-col py-10 container px-4 2xl:px-20 mx-auto animate-fade-in'>
        <div className='bg-white text-black rounded-lg w-ful'>
          <div className='flex justify-center md:justify-between flex-wrap gap-8 px-14 py-20 mb-6 bg-slate-50 border border-slate-200 rounded-3xl shadow-sm'>
            <div className='flex flex-col md:flex-row items-center'>
              <div className='bg-white rounded-2xl p-6 mr-6 max-md:mb-4 border border-slate-100 shadow-sm'>
                <img
                  className='h-16 w-16 object-contain'
                  src={JobData.companyId.image || assets.company_icon}
                  onError={(e) => { e.currentTarget.src = assets.company_icon }}
                  alt=""
                />
              </div>
              <div className='text-center md:text-left text-neutral-800'>
                <h1 className='text-2xl sm:text-4xl font-bold tracking-tight text-slate-900'>{JobData.title}</h1>
                <div className='flex flex-row flex-wrap max-md:justify-center gap-y-2 gap-6 items-center text-slate-500 mt-4 font-medium'>
                  <span className='flex items-center gap-2'>
                    <img className='h-4 w-4 opacity-60' src={assets.suitcase_icon} alt="" />
                    {JobData.companyId.name}
                  </span>
                  <span className='flex items-center gap-2'>
                    <img className='h-4 w-4 opacity-60' src={assets.location_icon} alt="" />
                    {JobData.location}
                  </span>
                  <span className='flex items-center gap-2'>
                    <img className='h-4 w-4 opacity-60' src={assets.person_icon} alt="" />
                    {JobData.level}
                  </span>
                  <span className='flex items-center gap-2'>
                    <img className='h-4 w-4 opacity-60' src={assets.money_icon} alt="" />
                    CTC: {kconvert.convertTo(JobData.salary)}
                  </span>
                </div>
              </div>
            </div>

            <div className='flex flex-col justify-center text-end text-sm max-md:mx-auto max-md:text-center'>
              <button 
                onClick={applyHandler} 
                className={`p-3.5 px-12 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95 ${isAlreadyApplied ? 'bg-emerald-500 cursor-default' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
              >
                {isAlreadyApplied ? 'Already Applied' : 'Apply Now'}
              </button>
              <p className='mt-3 text-slate-400 font-medium'>Posted {moment(JobData.date).fromNow()}</p>
              
              {/* AI Transparency Disclosure */}
              <div className='mt-6 p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-left max-md:text-center'>
                <div className='flex items-center gap-2 text-indigo-800 font-bold mb-2 justify-start max-md:justify-center'>
                  <span className='text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-widest'>Ethical AI</span>
                  <span className='w-4 h-4 rounded-full bg-indigo-100 text-indigo-600 text-[10px] inline-flex items-center justify-center font-black'>i</span>
                </div>
                <p className='text-[12px] text-indigo-600 leading-relaxed font-medium'>
                  Our AI analyzes matches fairly to help recruiters. All final decisions are human-verified.
                </p>
              </div>
            </div>

          </div>

          <div className='flex flex-col lg:flex-row justify-between items-start mt-10'>
            <div className='w-full lg:w-2/3'>
              <h2 className='font-bold text-2xl mb-6 text-slate-900 border-b border-slate-100 pb-4'>Job Description</h2>
              <div className='rich-text text-slate-700 leading-relaxed' dangerouslySetInnerHTML={{ __html: JobData.description }}></div>
              <button 
                onClick={applyHandler} 
                className={`p-3.5 px-12 text-white rounded-2xl font-bold shadow-lg transition-all active:scale-95 mt-12 ${isAlreadyApplied ? 'bg-emerald-500 cursor-default' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-100'}`}
              >
                {isAlreadyApplied ? 'Already Applied' : 'Apply Now'}
              </button>
            </div>
            
            {/* Right Section More Jobs */}
            <div className='w-full lg:w-1/3 mt-12 lg:mt-0 lg:ml-12'>
              <h2 className='font-bold text-xl text-slate-900 mb-6'>More jobs from <span className='text-indigo-600'>{JobData.companyId.name}</span></h2>
              <div className='space-y-6'>
                {jobs.filter(job => job._id !== JobData._id && job.companyId._id === JobData.companyId._id)
                  .filter(job => {
                    const appliedJobsIds = new Set(userApplications.map(app => app.jobId && app.jobId._id))
                    return !appliedJobsIds.has(job._id)
                  }).slice(0, 3)
                  .map((job, index) => <JobCard key={index} job={job} />)}
              </div>
            </div>
          </div>

        </div>
      </div>
      <Footer />
    </>
  ) : (
    <Loading />
  )
}

export default ApplyJob
