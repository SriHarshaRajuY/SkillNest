import { useContext, useRef } from 'react'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'

const Hero = () => {
    const { setSearchFilter, setIsSearched } = useContext(AppContext)

    const titleRef = useRef(null)
    const locationRef = useRef(null)

    const onSearch = () => {
        setSearchFilter({
            title: titleRef.current.value,
            location: locationRef.current.value,
        })
        setIsSearched(true)
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') onSearch()
    }

    return (
        <div className='container 2xl:px-20 mx-auto my-10 animate-fade-in'>
            <div className='relative bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white py-20 text-center mx-2 rounded-2xl overflow-hidden shadow-2xl'>
                <div className='relative z-10'>
                    <h2 className='text-3xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight text-white'>
                        Discover roles and manage every application
                    </h2>
                    <p className='mb-10 max-w-2xl mx-auto text-base md:text-lg font-light text-gray-200 px-5'>
                        SkillNest gives candidates a clear application timeline and gives recruiters a secure workflow for reviewing talent.
                    </p>
                    
                    <div className='glass flex flex-col sm:flex-row items-center justify-between rounded-xl text-gray-800 max-w-2xl mx-4 sm:mx-auto p-2 shadow-lg transition-transform hover:scale-[1.01] duration-300'>
                        <div className='flex items-center flex-1 px-4 py-2 w-full'>
                            <img className='h-5 opacity-70' src={assets.search_icon} alt='' />
                            <input
                                type='text'
                                placeholder='Job title, skill, or company'
                                className='bg-transparent max-sm:text-sm p-2 rounded outline-none w-full placeholder-gray-500 font-medium'
                                ref={titleRef}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div className='flex items-center flex-1 px-4 py-2 sm:border-l border-gray-300 w-full'>
                            <img className='h-5 opacity-70' src={assets.location_icon} alt='' />
                            <input
                                type='text'
                                placeholder='City or remote preference'
                                className='bg-transparent max-sm:text-sm p-2 rounded outline-none w-full placeholder-gray-500 font-medium'
                                ref={locationRef}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <button 
                            onClick={onSearch} 
                            className='bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all px-8 py-3 rounded-lg text-white font-semibold m-1 shadow-md w-full sm:w-auto hover:-translate-y-0.5 active:translate-y-0'
                        >
                            Search jobs
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Hero
