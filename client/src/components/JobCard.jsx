import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { useClerk, useUser } from '@clerk/clerk-react'
import { toast } from 'react-toastify'

const JobCard = ({ job }) => {

  const navigate = useNavigate()
  const { openSignIn } = useClerk()
  const { user } = useUser()

  const handleApplyClick = () => {
    if (!user) {
      toast.info('Please sign in to apply for this job')
      openSignIn()
      return
    }
    navigate(`/apply-job/${job._id}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleLearnMoreClick = () => {
    navigate(`/apply-job/${job._id}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className='group bg-white border border-slate-200 p-6 shadow-sm rounded-2xl hover:shadow-xl hover:border-indigo-100 transition-all duration-300 animate-fade-in'>
      <div className='flex justify-between items-start'>
        <div className='p-3 bg-slate-50 rounded-xl border border-slate-100 group-hover:bg-indigo-50 transition-colors'>
          <img
            className='h-8 w-8 object-contain'
            src={job.companyId.image || assets.company_icon}
            onError={(e) => { e.currentTarget.src = assets.company_icon }}
            alt={job.companyId.name}
          />
        </div>
        <span className='bg-slate-100 text-slate-600 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md'>
          {job.category || 'General'}
        </span>
      </div>
      
      <div className='mt-5'>
        <span className='text-slate-400 text-sm font-semibold tracking-tight'>{job.companyId.name}</span>
        <h4 className='font-bold text-xl text-slate-800 mt-1 line-clamp-1 group-hover:text-indigo-600 transition-colors'>{job.title}</h4>
      </div>

      <div className='flex items-center gap-2 mt-4'>
        <span className='bg-indigo-50 text-indigo-600 text-[11px] font-bold px-3 py-1 rounded-full border border-indigo-100'>
          {job.location}
        </span>
        <span className='bg-slate-50 text-slate-600 text-[11px] font-bold px-3 py-1 rounded-full border border-slate-100'>
          {job.level}
        </span>
      </div>

      <div 
        className='text-slate-500 text-sm mt-4 line-clamp-2 leading-relaxed' 
        dangerouslySetInnerHTML={{ __html: (job.description || '').replace(/<[^>]+>/g, '') }}
      />

      <div className='mt-8 flex gap-3'>
        <button 
          onClick={handleApplyClick} 
          className='flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-md hover:shadow-indigo-200 active:scale-95'
        >
          Apply Now
        </button>
        <button 
          onClick={handleLearnMoreClick} 
          className='flex-1 bg-white text-slate-600 border border-slate-200 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-all active:scale-95'
        >
          Learn More
        </button>
      </div>
    </div>
  )
}

export default JobCard
