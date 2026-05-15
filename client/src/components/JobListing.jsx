import { useContext, useEffect, useState, useCallback } from 'react'
import { AppContext } from '../context/AppContext'
import { assets, JobCategories, JobLocations } from '../assets/assets'
import JobCard from './JobCard'
import Pagination from './Pagination'
import { JobCardSkeleton } from './Skeleton'
import { jobService } from '../services/jobService'
import { applicationService } from '../services/applicationService'
import { useAuth, useUser } from '@clerk/clerk-react'

const JobListing = () => {
    const {
        isSearched,
        searchFilter,
        setSearchFilter,
        backendUrl,
        savedJobIds,
        setSavedJobIds,
    } = useContext(AppContext)
    const { user } = useUser()
    const { getToken } = useAuth()

    const [showFilter, setShowFilter] = useState(false)
    const [currentPage, setCurrentPage] = useState(1)
    const [selectedCategories, setSelectedCategories] = useState([])
    const [selectedLocations, setSelectedLocations] = useState([])
    
    const [jobs, setJobs] = useState([])
    const [recommendedJobs, setRecommendedJobs] = useState([])
    const [totalPages, setTotalPages] = useState(1)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetchJobs = useCallback(async () => {
        if (!backendUrl) return
        setLoading(true)
        setError(null)
        try {
            const params = {
                page: currentPage,
                limit: 6,
                search: searchFilter.title || '',
                location: searchFilter.location || '',
                category: selectedCategories.join(','),
                locationFilter: selectedLocations.join(',')
            }

            // Using jobService which uses apiClient and standardized responses
            const response = await jobService.getJobs(params)
            
            if (response.success) {
                setJobs(response.data.jobs || [])
                setTotalPages(response.data.totalPages || 1)
            } else {
                setError(response.message)
            }
        } catch (err) {
            setError(err.message || 'Failed to load jobs. Please try again later.')
        } finally {
            setLoading(false)
        }
    }, [currentPage, searchFilter, selectedCategories, selectedLocations, backendUrl])

    const fetchRecommendedJobs = useCallback(async () => {
        if (!user) {
            setRecommendedJobs([])
            return
        }
        try {
            const token = await getToken()
            const response = await applicationService.getRecommendedJobs(token, { limit: 3 })
            if (response.success) setRecommendedJobs(response.data.jobs || [])
        } catch {
            setRecommendedJobs([])
        }
    }, [user, getToken])

    useEffect(() => {
        fetchJobs()
    }, [fetchJobs])

    useEffect(() => {
        fetchRecommendedJobs()
    }, [fetchRecommendedJobs])

    // Reset to page 1 when filters change
    useEffect(() => {
        setCurrentPage(1)
    }, [searchFilter, selectedCategories, selectedLocations])

    const handleCategoryChange = (category) => {
        setSelectedCategories(prev => 
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        )
    }

    const handleLocationChange = (location) => {
        setSelectedLocations(prev => 
            prev.includes(location) ? prev.filter(c => c !== location) : [...prev, location]
        )
    }

    const jobsCount = jobs?.length || 0
    const handleSavedChange = (jobId, saved) => {
        setSavedJobIds((prev) => {
            const set = new Set(prev.map(String))
            if (saved) set.add(String(jobId))
            else set.delete(String(jobId))
            return [...set]
        })
    }

    return (
        <div className='container 2xl:px-20 mx-auto flex flex-col lg:flex-row max-lg:space-y-8 py-8 animate-fade-in'>
            {/* Sidebar */}
            <div className='w-full lg:w-1/4 bg-white px-4'>
                {isSearched && (searchFilter.title !== "" || searchFilter.location !== "") && (
                    <>
                        <h3 className='font-medium text-lg mb-4'>Current Search</h3>
                        <div className='mb-4 text-gray-600 flex flex-wrap gap-2'>
                            {searchFilter.title && (
                                <span className='inline-flex items-center gap-2 bg-blue-50 border border-blue-200 px-3 py-1 rounded-full text-sm'>
                                    {searchFilter.title}
                                    <img 
                                        onClick={() => setSearchFilter(prev => ({ ...prev, title: "" }))} 
                                        className='cursor-pointer w-3 h-3' 
                                        src={assets.cross_icon} 
                                        alt="clear" 
                                    />
                                </span>
                            )}
                            {searchFilter.location && (
                                <span className='inline-flex items-center gap-2 bg-red-50 border border-red-200 px-3 py-1 rounded-full text-sm'>
                                    {searchFilter.location}
                                    <img 
                                        onClick={() => setSearchFilter(prev => ({ ...prev, location: "" }))} 
                                        className='cursor-pointer w-3 h-3' 
                                        src={assets.cross_icon} 
                                        alt="clear" 
                                    />
                                </span>
                            )}
                        </div>
                    </>
                )}

                <button 
                    onClick={() => setShowFilter(prev => !prev)} 
                    className='px-6 py-2 rounded-xl border border-gray-300 lg:hidden w-full mb-4 font-bold text-slate-700 bg-white shadow-sm'
                >
                    {showFilter ? "Close Filters" : "Show Filters"}
                </button>

                {/* Filters */}
                <div className={showFilter ? "space-y-8" : "max-lg:hidden space-y-8"}>
                    <div>
                        <h4 className='font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider'>Categories</h4>
                        <ul className='space-y-3 text-gray-600'>
                            {JobCategories.map((category, index) => (
                                <li className='flex gap-3 items-center hover:text-blue-600 transition-colors group' key={index}>
                                    <input
                                        className='w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer'
                                        type="checkbox"
                                        onChange={() => handleCategoryChange(category)}
                                        checked={selectedCategories.includes(category)}
                                    />
                                    <span className="text-sm cursor-pointer group-hover:translate-x-1 transition-transform" onClick={() => handleCategoryChange(category)}>
                                        {category}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h4 className='font-bold text-slate-800 mb-4 text-sm uppercase tracking-wider'>Locations</h4>
                        <ul className='space-y-3 text-gray-600'>
                            {JobLocations.map((location, index) => (
                                <li className='flex gap-3 items-center hover:text-blue-600 transition-colors group' key={index}>
                                    <input
                                        className='w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer'
                                        type="checkbox"
                                        onChange={() => handleLocationChange(location)}
                                        checked={selectedLocations.includes(location)}
                                    />
                                    <span className="text-sm cursor-pointer group-hover:translate-x-1 transition-transform" onClick={() => handleLocationChange(location)}>
                                        {location}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>

            {/* Job listings */}
            <section className='w-full lg:w-3/4 text-gray-800 max-lg:px-4'>
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h3 className='font-bold text-3xl text-slate-900 tracking-tight' id='job-list'>Open Roles</h3>
                        <p className='text-gray-500 mt-1 font-medium'>Explore roles that match your goals and skills.</p>
                    </div>
                    {jobsCount > 0 && !loading && (
                        <p className="text-sm text-slate-500 font-medium">Page <span className='text-indigo-600 font-bold'>{currentPage}</span> of {totalPages}</p>
                    )}
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-100 text-red-600 px-6 py-4 rounded-2xl mb-8 flex justify-between items-center animate-shake">
                        <span className='font-medium'>{error}</span>
                        <button onClick={fetchJobs} className="text-sm font-bold underline hover:no-underline px-4 py-1.5 bg-white rounded-lg shadow-sm">Try again</button>
                    </div>
                )}

                {recommendedJobs.length > 0 && (
                    <div className='mb-10 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-5'>
                        <div className='flex items-center justify-between gap-4 mb-4'>
                            <div>
                                <h4 className='font-black text-slate-900 text-xl'>Recommended for you</h4>
                                <p className='text-sm text-emerald-700 font-medium'>Based on your skills, preferences, saved roles, and applications.</p>
                            </div>
                            <span className='hidden sm:inline-flex rounded-full bg-white px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-100'>
                                Lightweight matching
                            </span>
                        </div>
                        <div className='grid grid-cols-1 xl:grid-cols-3 gap-4'>
                            {recommendedJobs.map((job) => (
                                <JobCard
                                    key={job._id}
                                    job={job}
                                    isSaved={savedJobIds.map(String).includes(String(job._id))}
                                    onSavedChange={handleSavedChange}
                                />
                            ))}
                        </div>
                    </div>
                )}

                <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6'>
                    {loading ? (
                        Array.from({ length: 6 }).map((_, i) => <JobCardSkeleton key={i} />)
                    ) : jobsCount > 0 ? (
                        jobs.map((job) => (
                            <JobCard
                                key={job._id}
                                job={job}
                                isSaved={savedJobIds.map(String).includes(String(job._id))}
                                onSavedChange={handleSavedChange}
                            />
                        ))
                    ) : !error && (
                        <div className='col-span-full text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200'>
                            <p className='text-slate-400 text-lg mb-2 font-bold'>No roles match the current filters</p>
                            <button 
                                onClick={() => {
                                    setSelectedCategories([])
                                    setSelectedLocations([])
                                    setSearchFilter({ title: "", location: "" })
                                }}
                                className="text-indigo-600 font-bold hover:underline"
                            >
                                Clear all filters
                            </button>
                        </div>
                    )}
                </div>

                {jobsCount > 0 && (
                    <Pagination 
                        currentPage={currentPage} 
                        totalPages={totalPages} 
                        onPageChange={(page) => {
                            setCurrentPage(page)
                            window.scrollTo({ top: document.getElementById('job-list').offsetTop - 100, behavior: 'smooth' })
                        }} 
                    />
                )}
            </section>
        </div>
    )
}

export default JobListing
