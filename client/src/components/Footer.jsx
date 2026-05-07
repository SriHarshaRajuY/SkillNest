import SkillNestLogo from './SkillNestLogo'
import { assets } from '../assets/assets'

const Footer = () => {
  return (
    <footer className='border-t border-gray-100 bg-gray-50/30 mt-24'>
      <div className='container px-4 2xl:px-20 mx-auto py-12'>
        <div className='grid grid-cols-1 md:grid-cols-4 gap-12 mb-12'>
          <div className='col-span-1 md:col-span-2'>
            <SkillNestLogo />
            <p className='mt-4 text-gray-500 text-sm max-w-sm leading-relaxed'>
              SkillNest is a next-generation recruitment platform powered by ethically-trained AI. We bridge the gap between talent and opportunity through transparency and bias-free matching.
            </p>
          </div>
          <div>
            <h4 className='font-semibold text-gray-900 mb-4'>Platform</h4>
            <ul className='space-y-2 text-sm text-gray-600'>
              <li><a href="#" className='hover:text-indigo-600 transition-colors'>Privacy Policy</a></li>
              <li><a href="#" className='hover:text-indigo-600 transition-colors'>Terms of Service</a></li>
              <li><a href="#" className='hover:text-indigo-600 transition-colors'>Cookie Settings</a></li>
              <li><a href="#" className='hover:text-indigo-600 transition-colors'>AI Ethics Statement</a></li>
            </ul>
          </div>
          <div>
            <h4 className='font-semibold text-gray-900 mb-4'>Social</h4>
            <div className='flex gap-4'>
              <a href="#" className='hover:opacity-80 transition-opacity'><img width={28} src={assets.facebook_icon} alt="Facebook" /></a>
              <a href="#" className='hover:opacity-80 transition-opacity'><img width={28} src={assets.twitter_icon} alt="Twitter" /></a>
              <a href="#" className='hover:opacity-80 transition-opacity'><img width={28} src={assets.instagram_icon} alt="Instagram" /></a>
            </div>
          </div>
        </div>
        <div className='pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-gray-400 uppercase tracking-widest'>
          <p>© 2026 SkillNest. Engineered for Excellence.</p>
          <div className='flex gap-6'>
            <span>Human-in-the-loop AI</span>
            <span>GDPR Compliant</span>
            <span>Encrypted Data</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer