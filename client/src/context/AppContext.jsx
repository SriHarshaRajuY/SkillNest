import { createContext, useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { useAuth, useUser } from '@clerk/clerk-react'

// Services
import { jobService } from '../services/jobService'
import { authService } from '../services/authService'
import { applicationService } from '../services/applicationService'

/* eslint-disable-next-line react-refresh/only-export-components */
export const AppContext = createContext()

export const AppContextProvider = ({ children }) => {
    const { user } = useUser()
    const { getToken } = useAuth()

    const backendUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '')

    const [searchFilter, setSearchFilter] = useState({ title: '', location: '' })
    const [isSearched, setIsSearched] = useState(false)
    const [jobs, setJobs] = useState([])
    const [showRecruiterLogin, setShowRecruiterLogin] = useState(false)
    const [companyToken, setCompanyToken] = useState(null)
    const [companyData, setCompanyData] = useState(null)
    const [companyLoaded, setCompanyLoaded] = useState(false)
    const [userData, setUserData] = useState(null)
    const [userApplications, setUserApplications] = useState([])
    const [userDataLoaded, setUserDataLoaded] = useState(false)

    // ─── Fetch all public jobs ────────────────────────────────────────────────
    const fetchJobs = async () => {
        try {
            const response = await jobService.getJobs()
            if (response.success) {
                setJobs(response.data.jobs)
            } else {
                toast.error(response.message)
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load jobs')
        }
    }

    // ─── Fetch company profile (recruiter) ───────────────────────────────────
    const fetchCompanyData = async () => {
        try {
            const response = await authService.getRecruiterProfile()
            if (response.success) {
                setCompanyData(response.data.company)
            }
        } catch (error) {
            if (error.status === 401) {
                setCompanyToken(null)
                localStorage.removeItem('companyToken')
                toast.error('Session expired. Please login again.')
            } else {
                toast.error('Failed to load company data')
            }
        } finally {
            setCompanyLoaded(true)
        }
    }

    // ─── Fetch Clerk user's MongoDB profile ──────────────────────────────────
    const fetchUserData = async () => {
        try {
            const token = await getToken()
            const response = await authService.getCandidateProfile(token)
            if (response.success) {
                setUserData(response.data.user)
            }
        } catch (error) {
            console.error('[fetchUserData]', error.message)
        } finally {
            setUserDataLoaded(true)
        }
    }

    // ─── Fetch user's job applications ───────────────────────────────────────
    const fetchUserApplications = async () => {
        try {
            const token = await getToken()
            const response = await applicationService.getMyApplications({}, token)
            if (response.success) {
                setUserApplications(response.data.applications)
            }
        } catch (error) {
            toast.error('Failed to load applications')
        }
    }

    // ─── Lifecycle ──────────────────────────────────────────────────────────
    useEffect(() => {
        fetchJobs()
        const storedToken = localStorage.getItem('companyToken')
        if (storedToken) {
            setCompanyToken(storedToken)
        } else {
            setCompanyLoaded(true)
        }
    }, [])

    useEffect(() => {
        if (companyToken) {
            setCompanyLoaded(false)
            fetchCompanyData()
        }
    }, [companyToken])

    useEffect(() => {
        if (user) {
            setUserDataLoaded(false)
            void Promise.all([fetchUserData(), fetchUserApplications()])
        } else {
            setUserData(null)
            setUserApplications([])
            setUserDataLoaded(true)
        }
    }, [user])

    const value = {
        backendUrl,
        searchFilter, setSearchFilter,
        isSearched, setIsSearched,
        jobs, setJobs,
        showRecruiterLogin, setShowRecruiterLogin,
        companyToken, setCompanyToken,
        companyData, setCompanyData,
        companyLoaded,
        userData, setUserData,
        userApplications, setUserApplications,
        userDataLoaded,
        fetchUserData,
        fetchUserApplications,
    }

    return (
        <AppContext.Provider value={value}>
            {children}
        </AppContext.Provider>
    )
}
