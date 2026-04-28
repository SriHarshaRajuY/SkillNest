import SkillNestLogo from './SkillNestLogo'
import { assets } from '../assets/assets'

const Footer = () => {
  return (
    <div className='container px-4 2xl:px-20 mx-auto flex items-center justify-between gap-4 py-4 mt-20 border-t'>
      <SkillNestLogo />
      <p className='flex-1 border-l border-gray-300 pl-4 text-sm text-gray-500 max-sm:hidden'>
        Copyright © SkillNest | All rights reserved.
      </p>
      <div className='flex gap-2.5'>
        <img width={34} src={assets.facebook_icon} alt="Facebook" />
        <img width={34} src={assets.twitter_icon} alt="Twitter" />
        <img width={34} src={assets.instagram_icon} alt="Instagram" />
      </div>
    </div>
  )
}

export default Footer