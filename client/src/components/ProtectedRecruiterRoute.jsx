import { useContext } from 'react'
import { Navigate } from 'react-router-dom'
import { AppContext } from '../context/AppContext'

/**
 * Wraps dashboard routes. If no company token exists, redirect to home.
 * Shows nothing (or a spinner) while company data is loading.
 */
const ProtectedRecruiterRoute = ({ children }) => {
    const { companyToken } = useContext(AppContext)

    if (!companyToken) {
        return <Navigate to='/' replace />
    }

    return children
}

export default ProtectedRecruiterRoute
