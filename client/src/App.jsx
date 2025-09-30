import React, { useContext } from 'react';
import { Route, Routes } from 'react-router-dom';
import ApplyJob from './pages/Applyjob';
import Home from './pages/Home';
import Applications from './pages/Applications';
import RecruiterLogin from './components/RecruiterLogin';
import { AppContext } from './context/AppContext';
import AddJob from './pages/AddJob';
import Dashboard from './pages/Dashboard';
import ManageJobs from './pages/ManageJobs';
import ViewApplications from './pages/ViewApplications';
import 'quill/dist/quill.snow.css';

const App = () => {
  const { showRecruiterLogin } = useContext(AppContext);
  return (
    <div>
      {showRecruiterLogin && <RecruiterLogin />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/apply-job/:id" element={<ApplyJob />} />
        <Route path="/applications" element={<Applications />} />
        {/* Nest all dashboard-related routes here */}
        <Route path="/dashboard" element={<Dashboard />}>
          {/* These are relative paths: /dashboard/add-job, etc. */}
          <Route path="add-job" element={<AddJob />} />
          <Route path="manage-jobs" element={<ManageJobs />} />
          <Route path="view-applications" element={<ViewApplications />} />
        </Route>
      </Routes>
    </div>
  );
};

export default App;