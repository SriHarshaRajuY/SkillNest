import { createContext, useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useAuth, useUser } from "@clerk/clerk-react";

export const AppContext = createContext()

export const AppContextProvider = (props) => {

    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const { user } = useUser()
    const { getToken } = useAuth()

    const [searchFilter, setSearchFilter] = useState({ title: '', location: '' })
    const [isSearched, setIsSearched] = useState(false)
    const [jobs, setJobs] = useState([])
    const [showRecruiterLogin, setShowRecruiterLogin] = useState(false)
    const [companyToken, setCompanyToken] = useState(null)
    const [companyData, setCompanyData] = useState(null)
    const [userData, setUserData] = useState(null)
    const [userApplications, setUserApplications] = useState([])
    // Track whether the initial user data fetch is done (success or failure)
    const [userDataLoaded, setUserDataLoaded] = useState(false)

    // Fetch all visible jobs
    const fetchJobs = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/jobs')
            if (data.success) {
                setJobs(data.jobs)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error('Failed to load jobs. Please check your connection.')
        }
    }

    // Fetch logged-in company's profile data
    const fetchCompanyData = async () => {
        try {
            const { data } = await axios.get(backendUrl + '/api/company/company',
                { headers: { token: companyToken } })
            if (data.success) {
                setCompanyData(data.company)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    // Fetch logged-in user's profile data from MongoDB
    // Backend will auto-create the user if they don't exist yet (handles webhook race condition)
    const fetchUserData = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get(backendUrl + '/api/users/user',
                { headers: { Authorization: `Bearer ${token}` } })

            if (data.success) {
                setUserData(data.user)
            } else {
                // Only show error if it's not a temporary "not found" state
                if (data.message !== 'User Not Found') {
                    toast.error(data.message)
                }
            }
        } catch (error) {
            // Don't show error toast for network issues on initial load
            console.error('fetchUserData error:', error.message)
        } finally {
            setUserDataLoaded(true)
        }
    }

    // Fetch user's job applications
    const fetchUserApplications = async () => {
        try {
            const token = await getToken()
            const { data } = await axios.get(backendUrl + '/api/users/applications',
                { headers: { Authorization: `Bearer ${token}` } })
            if (data.success) {
                setUserApplications(data.applications)
            } else {
                toast.error(data.message)
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    // On mount: load jobs and restore company token from localStorage
    useEffect(() => {
        fetchJobs()
        const storedCompanyToken = localStorage.getItem('companyToken')
        if (storedCompanyToken) {
            setCompanyToken(storedCompanyToken)
        }
    }, [])

    // When company token changes, fetch company profile
    useEffect(() => {
        if (companyToken) {
            fetchCompanyData()
        }
    }, [companyToken])

    // When Clerk user changes, fetch their MongoDB profile + applications
    useEffect(() => {
        if (user) {
            setUserDataLoaded(false)
            fetchUserData()
            fetchUserApplications()
        } else {
            // User logged out — reset state
            setUserData(null)
            setUserApplications([])
            setUserDataLoaded(false)
        }
    }, [user])

    const value = {
        setSearchFilter, searchFilter,
        isSearched, setIsSearched,
        jobs, setJobs,
        showRecruiterLogin, setShowRecruiterLogin,
        companyToken, setCompanyToken,
        companyData, setCompanyData,
        backendUrl,
        userData, setUserData,
        userApplications, setUserApplications,
        userDataLoaded,
        fetchUserData,
        fetchUserApplications,
    }

    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}