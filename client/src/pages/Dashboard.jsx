import { useContext, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'
import SkillNestLogo from '../components/SkillNestLogo'
import Loading from '../components/Loading'

const Dashboard = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const { companyData, companyLoaded, setCompanyData, setCompanyToken } = useContext(AppContext)

    const logout = () => {
        setCompanyToken(null)
        localStorage.removeItem('companyToken')
        setCompanyData(null)
        navigate('/')
    }

    // Redirect to manage-jobs only when landing directly on /dashboard (no sub-route)
    useEffect(() => {
        if (companyLoaded && companyData && location.pathname === '/dashboard') {
            navigate('/dashboard/manage-jobs', { replace: true })
        }
    }, [companyLoaded, companyData, location.pathname])

    if (!companyLoaded) {
        return <Loading />
    }

    return (
        <div className='min-h-screen'>
            {/* Recruiter Navbar */}
            <div className='shadow-md py-4 bg-white/90 backdrop-blur-md sticky top-0 z-40 border-b border-gray-100'>
                <div className='px-5 flex justify-between items-center'>
                    <div onClick={() => navigate('/')} className='cursor-pointer transition-transform hover:scale-105 duration-200'>
                        <SkillNestLogo />
                    </div>
                    {companyData && (
                        <div className='flex items-center gap-4'>
                            <p className='max-sm:hidden text-sm text-gray-600 bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100'>
                                Welcome, <span className='font-semibold text-gray-800'>{companyData.name}</span>
                            </p>
                            <div className='relative group'>
                                <img
                                    className='w-10 h-10 rounded-full object-cover border-2 border-blue-100 cursor-pointer transition-shadow hover:shadow-md'
                                    src={companyData.image || assets.company_icon}
                                    onError={(e) => { e.currentTarget.src = assets.company_icon }}
                                    alt={companyData.name}
                                />
                                <div className='absolute hidden group-hover:block top-0 right-0 z-10 pt-14 opacity-0 group-hover:opacity-100 transition-opacity duration-300'>
                                    <ul className='bg-white border border-gray-100 rounded-xl shadow-xl text-sm min-w-[140px] overflow-hidden'>
                                        <li
                                            onClick={logout}
                                            className='px-5 py-3 cursor-pointer hover:bg-red-50 text-red-600 font-medium transition-colors flex items-center gap-2'
                                        >
                                            <span aria-hidden>🚪</span> Logout
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className='flex items-start bg-gray-50/50 min-h-[calc(100vh-73px)]'>
                {/* Sidebar */}
                <aside className='min-h-full border-r border-gray-200 bg-white sticky top-[73px] self-start w-16 sm:w-64 shadow-[2px_0_8px_rgba(0,0,0,0.02)] z-30 transition-all duration-300'>
                    <ul className='flex flex-col items-start pt-6 text-gray-600 gap-1 px-2 sm:px-4'>
                        <NavLink
                            className={({ isActive }) =>
                                `flex items-center p-3 sm:px-4 gap-3 w-full rounded-xl transition-all duration-200 group ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-gray-50 hover:text-gray-900'}`
                            }
                            to='/dashboard/add-job'
                        >
                            <img className={`min-w-5 w-5 transition-transform group-hover:scale-110`} src={assets.add_icon} alt='' />
                            <p className='max-sm:hidden text-sm font-semibold'>Add Job</p>
                        </NavLink>

                        <NavLink
                            className={({ isActive }) =>
                                `flex items-center p-3 sm:px-4 gap-3 w-full rounded-xl transition-all duration-200 group ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-gray-50 hover:text-gray-900'}`
                            }
                            to='/dashboard/manage-jobs'
                        >
                            <img className={`min-w-5 w-5 transition-transform group-hover:scale-110`} src={assets.home_icon} alt='' />
                            <p className='max-sm:hidden text-sm font-semibold'>Manage Jobs</p>
                        </NavLink>

                        <NavLink
                            className={({ isActive }) =>
                                `flex items-center p-3 sm:px-4 gap-3 w-full rounded-xl transition-all duration-200 group ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-gray-50 hover:text-gray-900'}`
                            }
                            to='/dashboard/view-applications'
                        >
                            <img className={`min-w-5 w-5 transition-transform group-hover:scale-110`} src={assets.person_tick_icon} alt='' />
                            <p className='max-sm:hidden text-sm font-semibold'>View Applications</p>
                        </NavLink>

                        <NavLink
                            className={({ isActive }) =>
                                `flex items-center p-3 sm:px-4 gap-3 w-full rounded-xl transition-all duration-200 group ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-gray-50 hover:text-gray-900'}`
                            }
                            to='/dashboard/messages'
                        >
                            <span className='min-w-5 w-5 text-center text-xl transition-transform group-hover:scale-110' aria-hidden>💬</span>
                            <p className='max-sm:hidden text-sm font-semibold'>Messages</p>
                        </NavLink>

                        <NavLink
                            className={({ isActive }) =>
                                `flex items-center p-3 sm:px-4 gap-3 w-full rounded-xl transition-all duration-200 group ${isActive ? 'bg-blue-50 text-blue-700 shadow-sm' : 'hover:bg-gray-50 hover:text-gray-900'}`
                            }
                            to='/dashboard/analytics'
                        >
                            <span className='min-w-5 w-5 text-center text-xl transition-transform group-hover:scale-110' aria-hidden>📊</span>
                            <p className='max-sm:hidden text-sm font-semibold'>Analytics</p>
                        </NavLink>
                    </ul>
                </aside>

                {/* Page Content */}
                <main className='flex-1 h-full p-4 sm:p-8 overflow-x-hidden animate-fade-in'>
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 min-h-[70vh]">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}

export default Dashboard
