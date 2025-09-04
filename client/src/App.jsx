import React from 'react'
  import { Route, Routes } from 'react-router-dom'
  import ApplyJob from './pages/Applyjob'
  import Home from './pages/Home'
  import Applications from './pages/Applications'
import RecruiterLogin from './components/RecruiterLogin'

  const App = () => {
    return (
      <div>
        <RecruiterLogin/>
        <Routes>
          <Route path='/' element={<Home/>}/>
          <Route path='/apply-job/:id' element={<ApplyJob/>}/>
          <Route path='/applications' element={<Applications/>}/>
        </Routes>
      </div>
    )
  }

  export default App