import { useContext, useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

const RecruiterLogin = () => {
    const navigate = useNavigate()
    const { setShowRecruiterLogin, backendUrl, setCompanyToken, setCompanyData } = useContext(AppContext)

    const [state, setState] = useState('Login')
    const [name, setName] = useState('')
    const [password, setPassword] = useState('')
    const [email, setEmail] = useState('')
    const [image, setImage] = useState(null)
    const [isTextDataSubmitted, setIsTextDataSubmitted] = useState(false)
    const [isLoading, setIsLoading] = useState(false)

    // Clear all form fields when switching between Login and Sign Up
    const switchMode = (newState) => {
        setState(newState)
        setName('')
        setEmail('')
        setPassword('')
        setImage(null)
        setIsTextDataSubmitted(false)
    }

    // Prevent background scroll while modal is open
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = 'unset' }
    }, [])

    const onSubmitHandler = async (e) => {
        e.preventDefault()

        // Sign Up step 1: collect text data, advance to logo upload step
        if (state === 'Sign Up' && !isTextDataSubmitted) {
            return setIsTextDataSubmitted(true)
        }

        // Sign Up step 2: require logo
        if (state === 'Sign Up' && !image) {
            return toast.error('Please upload your company logo')
        }

        setIsLoading(true)
        try {
            if (state === 'Login') {
                const { data } = await axios.post(`${backendUrl}/api/company/login`, { email, password })
                if (data.success) {
                    setCompanyData(data.company)
                    setCompanyToken(data.token)
                    localStorage.setItem('companyToken', data.token)
                    setShowRecruiterLogin(false)
                    navigate('/dashboard')
                } else {
                    toast.error(data.message)
                }
            } else {
                const formData = new FormData()
                formData.append('name', name)
                formData.append('password', password)
                formData.append('email', email)
                formData.append('image', image)

                const { data } = await axios.post(`${backendUrl}/api/company/register`, formData)
                if (data.success) {
                    setCompanyData(data.company)
                    setCompanyToken(data.token)
                    localStorage.setItem('companyToken', data.token)
                    setShowRecruiterLogin(false)
                    navigate('/dashboard')
                } else {
                    toast.error(data.message)
                }
            }
        } catch (error) {
            toast.error(error.response?.data?.message || error.message || 'Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className='fixed inset-0 z-50 backdrop-blur-sm bg-black/40 flex justify-center items-center px-4'>
            <form
                onSubmit={onSubmitHandler}
                className='relative bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl text-slate-600'
            >
                {/* Close button */}
                <button
                    type='button'
                    onClick={() => setShowRecruiterLogin(false)}
                    className='absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl leading-none'
                    aria-label='Close'
                >
                    ×
                </button>

                <h1 className='text-center text-2xl text-neutral-700 font-semibold mb-1'>
                    Recruiter {state}
                </h1>
                <p className='text-center text-sm text-gray-400 mb-6'>
                    {state === 'Login' ? 'Welcome back! Sign in to your recruiter account.' : 'Create your recruiter account to start hiring.'}
                </p>

                {/* Sign Up — Step 2: Company logo upload */}
                {state === 'Sign Up' && isTextDataSubmitted ? (
                    <div className='flex flex-col items-center gap-3 my-6'>
                        <label htmlFor='image' className='cursor-pointer'>
                            <img
                                className='w-24 h-24 rounded-full object-cover border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors'
                                src={image ? URL.createObjectURL(image) : assets.upload_area}
                                alt='Company logo'
                            />
                        </label>
                        <input onChange={e => setImage(e.target.files[0])} type='file' id='image' accept='image/*' hidden />
                        <p className='text-sm text-gray-500'>Upload Company Logo</p>
                    </div>
                ) : (
                    <div className='space-y-4'>
                        {/* Company name — Sign Up only */}
                        {state !== 'Login' && (
                            <div className='border border-gray-300 px-4 py-2.5 flex items-center gap-2 rounded-full focus-within:border-blue-500 transition-colors'>
                                <img src={assets.person_icon} alt='' className='w-4 h-4 opacity-50' />
                                <input
                                    className='outline-none text-sm w-full'
                                    onChange={e => setName(e.target.value)}
                                    value={name}
                                    type='text'
                                    placeholder='Company Name'
                                    required
                                />
                            </div>
                        )}

                        <div className='border border-gray-300 px-4 py-2.5 flex items-center gap-2 rounded-full focus-within:border-blue-500 transition-colors'>
                            <img src={assets.email_icon} alt='' className='w-4 h-4 opacity-50' />
                            <input
                                className='outline-none text-sm w-full'
                                onChange={e => setEmail(e.target.value)}
                                value={email}
                                type='email'
                                placeholder='Email Address'
                                required
                            />
                        </div>

                        <div className='border border-gray-300 px-4 py-2.5 flex items-center gap-2 rounded-full focus-within:border-blue-500 transition-colors'>
                            <img src={assets.lock_icon} alt='' className='w-4 h-4 opacity-50' />
                            <input
                                className='outline-none text-sm w-full'
                                onChange={e => setPassword(e.target.value)}
                                value={password}
                                type='password'
                                placeholder='Password'
                                required
                            />
                        </div>
                    </div>
                )}

                <button
                    type='submit'
                    disabled={isLoading}
                    className={`w-full py-2.5 rounded-full mt-6 font-medium transition-colors text-white ${isLoading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                >
                    {isLoading ? 'Please wait...' : state === 'Login' ? 'Login' : isTextDataSubmitted ? 'Create Account' : 'Next'}
                </button>

                {state === 'Login'
                    ? (
                        <p className='mt-5 text-center text-sm'>
                            Don't have an account?{' '}
                            <span className='text-blue-600 cursor-pointer font-medium hover:underline' onClick={() => switchMode('Sign Up')}>
                                Sign Up
                            </span>
                        </p>
                    )
                    : (
                        <p className='mt-5 text-center text-sm'>
                            Already have an account?{' '}
                            <span className='text-blue-600 cursor-pointer font-medium hover:underline' onClick={() => switchMode('Login')}>
                                Login
                            </span>
                        </p>
                    )
                }
            </form>
        </div>
    )
}

export default RecruiterLogin