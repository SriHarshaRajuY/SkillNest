import { useContext, useEffect, useState } from 'react'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { authService } from '../services/authService'

const RecruiterLogin = () => {
    const navigate = useNavigate()
    const { setShowRecruiterLogin, setCompanyToken, setCompanyData } = useContext(AppContext)

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
            let response;
            if (state === 'Login') {
                response = await authService.loginRecruiter({ email, password })
            } else {
                const formData = new FormData()
                formData.append('name', name)
                formData.append('password', password)
                formData.append('email', email)
                formData.append('image', image)
                response = await authService.registerRecruiter(formData)
            }

            if (response.success) {
                setCompanyData(response.data.company)
                setCompanyToken(response.data.token)
                localStorage.setItem('companyToken', response.data.token)
                setShowRecruiterLogin(false)
                toast.success(response.message || 'Successfully logged in')
                navigate('/dashboard')
            }
        } catch (error) {
            toast.error(error.message || 'Something went wrong')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className='fixed inset-0 z-50 backdrop-blur-sm bg-black/40 flex justify-center items-center px-4'>
            <form
                onSubmit={onSubmitHandler}
                className='relative bg-white w-full max-w-md p-8 rounded-2xl shadow-2xl text-slate-600 animate-fade-in'
            >
                {/* Close button */}
                <button
                    type='button'
                    onClick={() => setShowRecruiterLogin(false)}
                    className='absolute top-5 right-5 text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none'
                    aria-label='Close'
                >
                    ×
                </button>

                <h1 className='text-center text-3xl text-neutral-800 font-bold mb-1'>
                    Recruiter {state}
                </h1>
                <p className='text-center text-sm text-gray-400 mb-8 font-medium'>
                    {state === 'Login' ? 'Access your recruitment dashboard.' : 'Partner with SkillNest to find top talent.'}
                </p>

                {/* Sign Up — Step 2: Company logo upload */}
                {state === 'Sign Up' && isTextDataSubmitted ? (
                    <div className='flex flex-col items-center gap-4 my-6'>
                        <label htmlFor='image' className='cursor-pointer group'>
                            <div className="relative">
                                <img
                                    className='w-28 h-28 rounded-full object-cover border-2 border-dashed border-gray-300 group-hover:border-indigo-400 transition-all'
                                    src={image ? URL.createObjectURL(image) : assets.upload_area}
                                    alt='Company logo'
                                />
                                {!image && <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-[10px] bg-indigo-600 text-white px-2 py-1 rounded-full font-bold">Upload</span>
                                </div>}
                            </div>
                        </label>
                        <input onChange={e => setImage(e.target.files[0])} type='file' id='image' accept='image/*' hidden />
                        <p className='text-xs font-bold text-gray-400 uppercase tracking-widest'>Company Brand Mark</p>
                    </div>
                ) : (
                    <div className='space-y-4'>
                        {/* Company name — Sign Up only */}
                        {state !== 'Login' && (
                            <div className='bg-slate-50 border border-gray-200 px-5 py-3 flex items-center gap-3 rounded-2xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all'>
                                <img src={assets.person_icon} alt='' className='w-4 h-4 opacity-40' />
                                <input
                                    className='bg-transparent outline-none text-sm w-full font-medium'
                                    onChange={e => setName(e.target.value)}
                                    value={name}
                                    type='text'
                                    placeholder='Company Name'
                                    required
                                />
                            </div>
                        )}

                        <div className='bg-slate-50 border border-gray-200 px-5 py-3 flex items-center gap-3 rounded-2xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all'>
                            <img src={assets.email_icon} alt='' className='w-4 h-4 opacity-40' />
                            <input
                                className='bg-transparent outline-none text-sm w-full font-medium'
                                onChange={e => setEmail(e.target.value)}
                                value={email}
                                type='email'
                                placeholder='Corporate Email'
                                required
                            />
                        </div>

                        <div className='bg-slate-50 border border-gray-200 px-5 py-3 flex items-center gap-3 rounded-2xl focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 transition-all'>
                            <img src={assets.lock_icon} alt='' className='w-4 h-4 opacity-40' />
                            <input
                                className='bg-transparent outline-none text-sm w-full font-medium'
                                onChange={e => setPassword(e.target.value)}
                                value={password}
                                type='password'
                                placeholder='Security Key'
                                required
                            />
                        </div>
                    </div>
                )}

                <button
                    type='submit'
                    disabled={isLoading}
                    className={`w-full py-3.5 rounded-2xl mt-8 font-bold text-sm tracking-wide transition-all text-white shadow-lg shadow-blue-200 ${isLoading ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95'}`}
                >
                    {isLoading ? 'Processing...' : state === 'Login' ? 'Login to Dashboard' : isTextDataSubmitted ? 'Create Account' : 'Next Step'}
                </button>

                <div className="mt-8 pt-6 border-t border-slate-100">
                    {state === 'Login'
                        ? (
                            <p className='text-center text-sm text-gray-500'>
                                New to SkillNest?{' '}
                                <span className='text-indigo-600 cursor-pointer font-bold hover:underline ml-1' onClick={() => switchMode('Sign Up')}>
                                    Start hiring today
                                </span>
                            </p>
                        )
                        : (
                            <p className='text-center text-sm text-gray-500'>
                                Already have an account?{' '}
                                <span className='text-indigo-600 cursor-pointer font-bold hover:underline ml-1' onClick={() => switchMode('Login')}>
                                    Login here
                                </span>
                            </p>
                        )
                    }
                </div>
            </form>
        </div>
    )
}

export default RecruiterLogin