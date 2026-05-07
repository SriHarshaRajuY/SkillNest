import SkillNestLogo from './SkillNestLogo'
import { assets } from '../assets/assets'

const Footer = () => {
  return (
    <footer className='border-t border-gray-100 bg-white py-12 mt-20'>
      <div className='container px-4 2xl:px-20 mx-auto'>
        <div className='flex flex-col md:flex-row justify-between items-center gap-6'>
          {/* Brand & Copyright */}
          <div className='flex flex-col items-center md:items-start gap-3'>
            <SkillNestLogo />
            <p className='text-sm text-gray-500'>
              © 2026 SkillNest. All rights reserved.
            </p>
          </div>

          {/* Navigation Links */}
          <div className='flex flex-wrap justify-center gap-8 text-sm font-medium text-gray-600'>
            <a href="#" className='hover:text-blue-600 transition-colors'>Jobs</a>
            <a href="#" className='hover:text-blue-600 transition-colors'>Companies</a>
            <a href="#" className='hover:text-blue-600 transition-colors'>Privacy Policy</a>
            <a href="#" className='hover:text-blue-600 transition-colors'>Terms</a>
          </div>

          {/* Social Icons */}
          <div className='flex gap-4'>
            <a href="#" className='p-2 rounded-full bg-gray-50 hover:bg-blue-50 transition-colors shadow-sm'>
              <img width={18} src={assets.facebook_icon} alt="Facebook" className='opacity-60 hover:opacity-100 transition-opacity' />
            </a>
            <a href="#" className='p-2 rounded-full bg-gray-50 hover:bg-blue-50 transition-colors shadow-sm'>
              <img width={18} src={assets.twitter_icon} alt="Twitter" className='opacity-60 hover:opacity-100 transition-opacity' />
            </a>
            <a href="#" className='p-2 rounded-full bg-gray-50 hover:bg-blue-50 transition-colors shadow-sm'>
              <img width={18} src={assets.instagram_icon} alt="Instagram" className='opacity-60 hover:opacity-100 transition-opacity' />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer