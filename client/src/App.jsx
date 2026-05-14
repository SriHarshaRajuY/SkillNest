import { useContext } from 'react'
import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import ApplyJob from './pages/ApplyJob'
import Applications from './pages/Applications'
import RecruiterLogin from './components/RecruiterLogin'
import { AppContext } from './context/AppContext'
import Dashboard from './pages/Dashboard'
import AddJob from './pages/AddJob'
import ManageJobs from './pages/ManageJobs'
import ViewApplications from './pages/ViewApplications'
import NotFound from './pages/NotFound'
import CandidateMessages from './pages/CandidateMessages'
import RecruiterMessages from './pages/RecruiterMessages'
import Analytics from './pages/Analytics'
import ProtectedRecruiterRoute from './components/ProtectedRecruiterRoute'
import 'quill/dist/quill.snow.css'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import ErrorBoundary from './components/ErrorBoundary'

const App = () => {
    const { showRecruiterLogin } = useContext(AppContext)

    return (
        <div className='min-h-screen bg-white text-gray-900'>
            {showRecruiterLogin && <RecruiterLogin />}
            <ToastContainer position='top-right' autoClose={3500} closeOnClick />
            <ErrorBoundary>
                <Routes>
                    <Route path='/' element={<Home />} />
                    <Route path='/apply-job/:id' element={<ApplyJob />} />
                    <Route path='/applications' element={<Applications />} />
                    <Route path='/messages' element={<CandidateMessages />} />
                    <Route path='/messages/:applicationId' element={<CandidateMessages />} />
                    <Route
                        path='/dashboard'
                        element={
                            <ProtectedRecruiterRoute>
                                <Dashboard />
                            </ProtectedRecruiterRoute>
                        }
                    >
                        <Route path='add-job' element={<AddJob />} />
                        <Route path='manage-jobs' element={<ManageJobs />} />
                        <Route path='view-applications' element={<ViewApplications />} />
                        <Route path='messages' element={<RecruiterMessages />} />
                        <Route path='messages/:applicationId' element={<RecruiterMessages />} />
                        <Route path='analytics' element={<Analytics />} />
                    </Route>
                    <Route path='*' element={<NotFound />} />
                </Routes>
            </ErrorBoundary>
        </div>
    )
}

export default App