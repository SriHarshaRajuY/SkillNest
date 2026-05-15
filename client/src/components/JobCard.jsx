import { assets } from '../assets/assets'
import { useNavigate } from 'react-router-dom'
import { useAuth, useClerk, useUser } from '@clerk/clerk-react'
import { toast } from 'react-toastify'
import { applicationService } from '../services/applicationService'
import { BookmarkIcon as BookmarkOutline } from '@heroicons/react/24/outline'
import { BookmarkIcon as BookmarkSolid } from '@heroicons/react/24/solid'

const JobCard = ({ job, isSaved = false, onSavedChange }) => {

  const navigate = useNavigate()
  const { openSignIn } = useClerk()
  const { getToken } = useAuth()
  const { user } = useUser()

  const handleApplyClick = () => {
    if (!user) {
      toast.info('Sign in to apply for this role')
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

  const handleSaveClick = async (e) => {
    e.stopPropagation()
    if (!user) {
      toast.info('Sign in to save roles')
      openSignIn()
      return
    }

    try {
      const token = await getToken()
      if (isSaved) {
        await applicationService.unsaveJob(job._id, token)
        onSavedChange?.(job._id, false)
        toast.success('Removed from saved roles')
      } else {
        await applicationService.saveJob(job._id, token)
        onSavedChange?.(job._id, true)
        toast.success('Role saved')
      }
    } catch (error) {
      toast.error(error.message || 'Could not update saved role')
    }
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
        <div className='flex items-center gap-2'>
          <span className='bg-slate-100 text-slate-600 text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-md'>
            {job.category || 'General'}
          </span>
          <button
            type='button'
            onClick={handleSaveClick}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center font-black transition-all ${
              isSaved
                ? 'bg-amber-50 text-amber-600 border-amber-200'
                : 'bg-white text-slate-400 border-slate-200 hover:text-amber-600 hover:border-amber-200'
            }`}
            aria-label={isSaved ? 'Remove saved job' : 'Save job'}
            title={isSaved ? 'Saved job' : 'Save job'}
          >
            {isSaved ? <BookmarkSolid className='w-4 h-4' /> : <BookmarkOutline className='w-4 h-4' />}
          </button>
        </div>
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

      {Array.isArray(job.recommendationReasons) && job.recommendationReasons.length > 0 && (
        <div className='mt-4 flex flex-wrap gap-2'>
          {job.recommendationReasons.map((reason) => (
            <span key={reason} className='rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-100'>
              {reason}
            </span>
          ))}
        </div>
      )}

      <div 
        className='text-slate-500 text-sm mt-4 line-clamp-2 leading-relaxed' 
        dangerouslySetInnerHTML={{ __html: (job.description || '').replace(/<[^>]+>/g, '') }}
      />

      <div className='mt-8 flex gap-3'>
        <button 
          onClick={handleApplyClick} 
          className='flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 rounded-xl transition-all shadow-md hover:shadow-indigo-200 active:scale-95'
        >
          Apply
        </button>
        <button 
          onClick={handleLearnMoreClick} 
          className='flex-1 bg-white text-slate-600 border border-slate-200 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-all active:scale-95'
        >
          View Details
        </button>
      </div>
    </div>
  )
}

export default JobCard
