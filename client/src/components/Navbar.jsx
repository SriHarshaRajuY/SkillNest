import { useContext } from 'react'
import { useClerk, UserButton, useUser } from '@clerk/clerk-react'
import { Link, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import SkillNestLogo from './SkillNestLogo'

const Navbar = () => {

    const { openSignIn } = useClerk()
    const { user } = useUser()

    const navigate = useNavigate()

    const { setShowRecruiterLogin } = useContext(AppContext)

    return (
        <div className='shadow-sm border-b bg-white sticky top-0 z-50'>
            <div className='container px-4 2xl:px-20 mx-auto flex justify-between items-center h-16'>
                {/* Logo */}
                <div onClick={() => navigate('/')} className='cursor-pointer'>
                    <SkillNestLogo />
                </div>

                {/* Right Side Nav */}
                {user
                    ? <div className='flex items-center gap-3 text-sm'>
                        <Link
                            to='/applications'
                            className='text-gray-600 hover:text-blue-600 transition-colors font-medium'
                        >
                            Applied Jobs
                        </Link>
                        <span className='text-gray-300'>|</span>
                        <span className='text-gray-600 max-sm:hidden'>
                            Hi, {user.firstName}
                        </span>
                        <UserButton afterSignOutUrl='/' />
                    </div>
                    : <div className='flex items-center gap-4 text-sm'>
                        <button
                            onClick={() => setShowRecruiterLogin(true)}
                            className='text-gray-600 hover:text-blue-600 transition-colors font-medium'
                        >
                            Recruiter Login
                        </button>
                        <button
                            onClick={() => openSignIn()}
                            className='bg-blue-600 hover:bg-blue-700 transition-colors text-white px-5 py-2 rounded-full font-medium'
                        >
                            Login
                        </button>
                    </div>
                }
            </div>
        </div>
    )
}

export default Navbar