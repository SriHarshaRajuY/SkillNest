import { Link } from 'react-router-dom'
import SkillNestLogo from './SkillNestLogo'

const Footer = () => {
  return (
    <footer className='border-t border-gray-100 bg-white py-12 mt-20'>
      <div className='container px-4 2xl:px-20 mx-auto'>
        <div className='flex flex-col md:flex-row justify-between items-center gap-6'>
          <div className='flex flex-col items-center md:items-start gap-3'>
            <SkillNestLogo />
            <p className='text-sm text-gray-500'>
              Copyright 2026 SkillNest. All rights reserved.
            </p>
          </div>

          <div className='flex flex-wrap justify-center gap-8 text-sm font-medium text-gray-600'>
            <a href='#job-list' className='hover:text-blue-600 transition-colors'>Jobs</a>
            <Link to='/applications' className='hover:text-blue-600 transition-colors'>Applications</Link>
            <Link to='/messages' className='hover:text-blue-600 transition-colors'>Messages</Link>
          </div>

          <p className='text-sm text-gray-400'>Secure hiring workflows for candidates and teams.</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
