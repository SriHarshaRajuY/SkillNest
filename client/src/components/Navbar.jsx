import { useContext, useState, useRef, useEffect } from 'react'
import { useClerk, UserButton, useUser } from '@clerk/clerk-react'
import { Link, useNavigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'
import SkillNestLogo from './SkillNestLogo'

const Navbar = () => {
    const { openSignIn } = useClerk()
    const { user } = useUser()
    const navigate = useNavigate()
    const { setShowRecruiterLogin } = useContext(AppContext)
    const [mobileOpen, setMobileOpen] = useState(false)
    const menuRef = useRef(null)

    // Close mobile menu on outside click
    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMobileOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])

    return (
        <div className='shadow-sm border-b bg-white sticky top-0 z-50' ref={menuRef}>
            <div className='container px-4 2xl:px-20 mx-auto flex justify-between items-center h-16'>
                {/* Logo */}
                <div onClick={() => navigate('/')} className='cursor-pointer'>
                    <SkillNestLogo />
                </div>

                {/* Desktop Right Nav */}
                {user
                    ? (
                        <div className='hidden sm:flex items-center gap-3 text-sm'>
                            <Link to='/applications' className='text-gray-600 hover:text-blue-600 transition-colors font-medium'>
                                Applied Jobs
                            </Link>
                            <span className='text-gray-300'>|</span>
                            <span className='text-gray-600'>Hi, {user.firstName}</span>
                            <UserButton afterSignOutUrl='/' />
                        </div>
                    )
                    : (
                        <div className='hidden sm:flex items-center gap-4 text-sm'>
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
                    )
                }

                {/* Mobile Hamburger */}
                <button
                    className='sm:hidden flex flex-col gap-1.5 p-2 rounded'
                    onClick={() => setMobileOpen(prev => !prev)}
                    aria-label='Toggle menu'
                >
                    <span className={`block w-6 h-0.5 bg-gray-700 transition-transform ${mobileOpen ? 'rotate-45 translate-y-2' : ''}`} />
                    <span className={`block w-6 h-0.5 bg-gray-700 transition-opacity ${mobileOpen ? 'opacity-0' : ''}`} />
                    <span className={`block w-6 h-0.5 bg-gray-700 transition-transform ${mobileOpen ? '-rotate-45 -translate-y-2' : ''}`} />
                </button>
            </div>

            {/* Mobile Menu Dropdown — solid white, no transparency bleed */}
            {mobileOpen && (
                <div className='sm:hidden absolute top-16 left-0 right-0 bg-white border-b border-gray-200 shadow-lg z-50 px-4 py-4 flex flex-col gap-3'>
                    {user
                        ? (
                            <>
                                <Link
                                    to='/applications'
                                    onClick={() => setMobileOpen(false)}
                                    className='text-gray-700 font-medium hover:text-blue-600'
                                >
                                    Applied Jobs
                                </Link>
                                <div className='flex items-center gap-2'>
                                    <span className='text-gray-600 text-sm'>Hi, {user.firstName}</span>
                                    <UserButton afterSignOutUrl='/' />
                                </div>
                            </>
                        )
                        : (
                            <>
                                <button
                                    onClick={() => { setShowRecruiterLogin(true); setMobileOpen(false) }}
                                    className='text-left text-gray-700 font-medium hover:text-blue-600'
                                >
                                    Recruiter Login
                                </button>
                                <button
                                    onClick={() => { openSignIn(); setMobileOpen(false) }}
                                    className='bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full font-medium text-sm w-fit'
                                >
                                    Login
                                </button>
                            </>
                        )
                    }
                </div>
            )}
        </div>
    )
}

export default Navbar