import { createContext, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth, useUser } from '@clerk/clerk-react'

/* eslint-disable-next-line react-refresh/only-export-components */
export const AppContext = createContext()

export const AppContextProvider = ({ children }) => {
    // Strip trailing slash to avoid double-slash URLs like http://localhost:5000//api/...
    const backendUrl = (import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '')

    const { user } = useUser()
    const { getToken } = useAuth()

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
            const { data } = await axios.get(`${backendUrl}/api/jobs`)
            if (data.success) {
                setJobs(data.jobs)
            } else {
                toast.error(data.message)
            }
        } catch {
            toast.error('Failed to load jobs. Please check your connection.')
        }
    }

    // ─── Fetch company profile (recruiter) ───────────────────────────────────
    const fetchCompanyData = async () => {
        try {
            const { data } = await axios.get(`${backendUrl}/api/company/company`, {
                headers: { token: companyToken },
            })
            if (data.success) {
                setCompanyData(data.company)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            if (error.response?.status === 401) {
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
            const { data } = await axios.get(`${backendUrl}/api/users/user`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (data.success) {
                setUserData(data.user)
            } else {
                if (data.message !== 'User Not Found') {
                    toast.error(data.message)
                }
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
            const { data } = await axios.get(`${backendUrl}/api/users/applications`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (data.success) {
                setUserApplications(data.applications)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error('Failed to load applications')
        }
    }

    // ─── On mount: load jobs and restore company session ─────────────────────
    useEffect(() => {
        fetchJobs()
        const storedToken = localStorage.getItem('companyToken')
        if (storedToken) {
            setCompanyToken(storedToken)
        } else {
            setCompanyLoaded(true) // No token — nothing to load
        }
    }, [])

    // ─── When company token changes, fetch company profile ───────────────────
    useEffect(() => {
        if (companyToken) {
            setCompanyLoaded(false)
            fetchCompanyData()
        }
    }, [companyToken])

    // ─── When Clerk user changes, fetch their profile + applications ──────────
    useEffect(() => {
        if (user) {
            setUserDataLoaded(false)
            fetchUserData()
            fetchUserApplications()
        } else {
            setUserData(null)
            setUserApplications([])
            setUserDataLoaded(false)
        }
    }, [user])

    const value = {
        searchFilter, setSearchFilter,
        isSearched, setIsSearched,
        jobs, setJobs,
        showRecruiterLogin, setShowRecruiterLogin,
        companyToken, setCompanyToken,
        companyData, setCompanyData,
        companyLoaded,
        backendUrl,
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