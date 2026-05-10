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
                {/* Decorative background elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-pulse-subtle"></div>
                    <div className="absolute top-1/2 -right-24 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-40 animate-pulse-subtle" style={{ animationDelay: '2s' }}></div>
                </div>

                <div className='relative z-10'>
                    <h2 className='text-3xl md:text-5xl lg:text-6xl font-extrabold mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-300'>
                        Over 10,000+ jobs to apply
                    </h2>
                    <p className='mb-10 max-w-2xl mx-auto text-base md:text-lg font-light text-gray-200 px-5'>
                        Your Next Big Career Move Starts Right Here - Explore the Best Job Opportunities and Take the First Step Toward Your Future!
                    </p>
                    
                    <div className='glass flex flex-col sm:flex-row items-center justify-between rounded-xl text-gray-800 max-w-2xl mx-4 sm:mx-auto p-2 shadow-lg transition-transform hover:scale-[1.01] duration-300'>
                        <div className='flex items-center flex-1 px-4 py-2 w-full'>
                            <img className='h-5 opacity-70' src={assets.search_icon} alt='' />
                            <input
                                type='text'
                                placeholder='Search for jobs'
                                className='bg-transparent max-sm:text-sm p-2 rounded outline-none w-full placeholder-gray-500 font-medium'
                                ref={titleRef}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <div className='flex items-center flex-1 px-4 py-2 sm:border-l border-gray-300 w-full'>
                            <img className='h-5 opacity-70' src={assets.location_icon} alt='' />
                            <input
                                type='text'
                                placeholder='Location'
                                className='bg-transparent max-sm:text-sm p-2 rounded outline-none w-full placeholder-gray-500 font-medium'
                                ref={locationRef}
                                onKeyDown={handleKeyDown}
                            />
                        </div>
                        <button 
                            onClick={onSearch} 
                            className='bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 transition-all px-8 py-3 rounded-lg text-white font-semibold m-1 shadow-md w-full sm:w-auto hover:-translate-y-0.5 active:translate-y-0'
                        >
                            Search
                        </button>
                    </div>
                </div>
            </div>

            <div className='border border-gray-200 bg-white shadow-sm mx-2 mt-8 p-8 rounded-xl flex animate-fade-in-delay-1'>
                <div className='flex justify-center items-center gap-10 lg:gap-16 flex-wrap w-full'>
                    <p className='font-semibold text-gray-500 uppercase tracking-wider text-sm'>Trusted by</p>
                    <img className='h-7 grayscale hover:grayscale-0 transition-all duration-300 cursor-pointer' src={assets.microsoft_logo} alt='Microsoft' />
                    <img className='h-7 grayscale hover:grayscale-0 transition-all duration-300 cursor-pointer' src={assets.walmart_logo} alt='Walmart' />
                    <img className='h-7 grayscale hover:grayscale-0 transition-all duration-300 cursor-pointer' src={assets.accenture_logo} alt='Accenture' />
                    <img className='h-7 grayscale hover:grayscale-0 transition-all duration-300 cursor-pointer' src={assets.samsung_logo} alt='Samsung' />
                    <img className='h-7 grayscale hover:grayscale-0 transition-all duration-300 cursor-pointer' src={assets.amazon_logo} alt='Amazon' />
                    <img className='h-7 grayscale hover:grayscale-0 transition-all duration-300 cursor-pointer' src={assets.adobe_logo} alt='Adobe' />
                </div>
            </div>
        </div>
    )
}

export default Hero