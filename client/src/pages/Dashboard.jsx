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

    // Show loading spinner while company profile is being fetched
    if (!companyLoaded) {
        return <Loading />
    }

    return (
        <div className='min-h-screen'>
            {/* Recruiter Navbar */}
            <div className='shadow py-4 bg-white sticky top-0 z-40'>
                <div className='px-5 flex justify-between items-center'>
                    <div onClick={() => navigate('/')} className='cursor-pointer'>
                        <SkillNestLogo />
                    </div>
                    {companyData && (
                        <div className='flex items-center gap-3'>
                            <p className='max-sm:hidden text-sm text-gray-600'>Welcome, <span className='font-medium'>{companyData.name}</span></p>
                            <div className='relative group'>
                                <img
                                    className='w-9 h-9 rounded-full object-cover border cursor-pointer'
                                    src={companyData.image}
                                    alt={companyData.name}
                                />
                                <div className='absolute hidden group-hover:block top-0 right-0 z-10 pt-12'>
                                    <ul className='bg-white border rounded-lg shadow-lg text-sm min-w-[120px]'>
                                        <li
                                            onClick={logout}
                                            className='px-4 py-2 cursor-pointer hover:bg-gray-100 rounded-lg text-red-500'
                                        >
                                            Logout
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className='flex items-start'>
                {/* Sidebar */}
                <aside className='min-h-screen border-r-2 bg-white sticky top-16 self-start'>
                    <ul className='flex flex-col items-start pt-5 text-gray-800'>
                        <NavLink
                            className={({ isActive }) =>
                                `flex items-center p-3 sm:px-6 gap-2 w-full hover:bg-gray-100 transition-colors ${isActive ? 'bg-blue-100 border-r-4 border-blue-500 text-blue-700' : ''}`
                            }
                            to='/dashboard/add-job'
                        >
                            <img className='min-w-4 w-5' src={assets.add_icon} alt='' />
                            <p className='max-sm:hidden text-sm font-medium'>Add Job</p>
                        </NavLink>

                        <NavLink
                            className={({ isActive }) =>
                                `flex items-center p-3 sm:px-6 gap-2 w-full hover:bg-gray-100 transition-colors ${isActive ? 'bg-blue-100 border-r-4 border-blue-500 text-blue-700' : ''}`
                            }
                            to='/dashboard/manage-jobs'
                        >
                            <img className='min-w-4 w-5' src={assets.home_icon} alt='' />
                            <p className='max-sm:hidden text-sm font-medium'>Manage Jobs</p>
                        </NavLink>

                        <NavLink
                            className={({ isActive }) =>
                                `flex items-center p-3 sm:px-6 gap-2 w-full hover:bg-gray-100 transition-colors ${isActive ? 'bg-blue-100 border-r-4 border-blue-500 text-blue-700' : ''}`
                            }
                            to='/dashboard/view-applications'
                        >
                            <img className='min-w-4 w-5' src={assets.person_tick_icon} alt='' />
                            <p className='max-sm:hidden text-sm font-medium'>View Applications</p>
                        </NavLink>
                    </ul>
                </aside>

                {/* Page Content */}
                <main className='flex-1 h-full p-4 sm:p-6'>
                    <Outlet />
                </main>
            </div>
        </div>
    )
}

export default Dashboard