import { useContext, useEffect, useMemo, useState } from 'react'
import { assets } from '../assets/assets'
import { AppContext } from '../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { authService } from '../services/authService'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const validatePassword = (value) => {
    if (value.length < 8) return 'Password must be at least 8 characters.'
    if (!/[a-z]/.test(value) || !/[A-Z]/.test(value) || !/\d/.test(value)) {
        return 'Use uppercase, lowercase, and a number.'
    }
    return ''
}

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
    const [errors, setErrors] = useState({})

    const isSignup = state === 'Sign Up'
    const passwordHint = useMemo(() => validatePassword(password), [password])

    const switchMode = (newState) => {
        setState(newState)
        setName('')
        setEmail('')
        setPassword('')
        setImage(null)
        setErrors({})
        setIsTextDataSubmitted(false)
    }

    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = 'unset' }
    }, [])

    const validateTextStep = () => {
        const nextErrors = {}
        if (isSignup && name.trim().length < 2) {
            nextErrors.name = 'Enter the company or organization name.'
        }
        if (!emailPattern.test(email.trim())) {
            nextErrors.email = 'Enter a valid work email address.'
        }
        if (!password.trim()) {
            nextErrors.password = 'Password is required.'
        } else if (isSignup) {
            const passwordError = validatePassword(password)
            if (passwordError) nextErrors.password = passwordError
        } else if (password.length < 8) {
            nextErrors.password = 'Password must be at least 8 characters.'
        }

        setErrors(nextErrors)
        return Object.keys(nextErrors).length === 0
    }

    const onSubmitHandler = async (e) => {
        e.preventDefault()

        if (!isTextDataSubmitted && !validateTextStep()) return

        if (isSignup && !isTextDataSubmitted) {
            setIsTextDataSubmitted(true)
            return
        }

        if (isSignup && !image) {
            setErrors({ image: 'Upload a company logo to complete registration.' })
            return
        }

        setIsLoading(true)
        try {
            let response
            if (!isSignup) {
                response = await authService.loginRecruiter({
                    email: email.trim(),
                    password,
                })
            } else {
                const formData = new FormData()
                formData.append('name', name.trim())
                formData.append('password', password)
                formData.append('email', email.trim())
                formData.append('image', image)
                response = await authService.registerRecruiter(formData)
            }

            if (response.success) {
                setCompanyData(response.data.company)
                setCompanyToken(response.data.token)
                localStorage.setItem('companyToken', response.data.token)
                setShowRecruiterLogin(false)
                toast.success(isSignup ? 'Recruiter workspace created' : 'Welcome back')
                navigate('/dashboard')
            }
        } catch (error) {
            toast.error(error.errors?.[0] || error.message || 'Authentication failed. Please review your details.')
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm'>
            <form
                onSubmit={onSubmitHandler}
                className='relative grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl md:grid-cols-[0.9fr_1.1fr]'
            >
                <button
                    type='button'
                    onClick={() => setShowRecruiterLogin(false)}
                    className='absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-50 hover:text-slate-800'
                    aria-label='Close recruiter authentication'
                >
                    x
                </button>

                <aside className='hidden bg-slate-950 p-8 text-white md:flex md:flex-col md:justify-between'>
                    <div>
                        <div className='mb-8 inline-flex rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-widest text-white/80'>
                            Recruiter Workspace
                        </div>
                        <h2 className='text-3xl font-black leading-tight'>
                            Manage hiring with secure, role-aware workflows.
                        </h2>
                        <p className='mt-4 text-sm leading-6 text-white/65'>
                            Review applicants, track pipeline movement, collaborate with your team, and keep sensitive resume access accountable.
                        </p>
                    </div>
                    <div className='grid gap-3 text-sm text-white/75'>
                        <span>Secure resume links</span>
                        <span>Role-based recruiter access</span>
                        <span>Audit-ready hiring actions</span>
                    </div>
                </aside>

                <section className='p-6 sm:p-8'>
                    <div className='mb-7 pr-10'>
                        <p className='text-xs font-black uppercase tracking-widest text-indigo-600'>
                            {isSignup ? 'Create workspace' : 'Recruiter sign in'}
                        </p>
                        <h1 className='mt-2 text-2xl font-black text-slate-900'>
                            {isSignup ? 'Set up your company account' : 'Access your recruiter dashboard'}
                        </h1>
                        <p className='mt-2 text-sm leading-6 text-slate-500'>
                            {isSignup
                                ? 'Use a work email and a strong password. You can add more recruiters after setup.'
                                : 'Sign in with your recruiter credentials to continue reviewing candidates.'}
                        </p>
                    </div>

                    {isSignup && (
                        <div className='mb-6 grid grid-cols-2 gap-2 text-xs font-bold'>
                            <div className={`rounded-lg px-3 py-2 ${!isTextDataSubmitted ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                1. Account details
                            </div>
                            <div className={`rounded-lg px-3 py-2 ${isTextDataSubmitted ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-500'}`}>
                                2. Company logo
                            </div>
                        </div>
                    )}

                    {isSignup && isTextDataSubmitted ? (
                        <div className='rounded-2xl border border-slate-200 bg-slate-50 p-5'>
                            <label htmlFor='image' className='flex cursor-pointer flex-col items-center gap-4 rounded-xl border border-dashed border-slate-300 bg-white p-6 text-center hover:border-indigo-300'>
                                <img
                                    className='h-24 w-24 rounded-2xl object-cover border border-slate-100'
                                    src={image ? URL.createObjectURL(image) : assets.upload_area}
                                    alt='Company logo preview'
                                />
                                <div>
                                    <p className='text-sm font-black text-slate-900'>Upload company logo</p>
                                    <p className='mt-1 text-xs text-slate-500'>PNG, JPG, or WEBP. This appears on job cards and recruiter pages.</p>
                                </div>
                            </label>
                            <input onChange={e => setImage(e.target.files?.[0] || null)} type='file' id='image' accept='image/png,image/jpeg,image/webp' hidden />
                            {errors.image && <p className='mt-2 text-xs font-semibold text-rose-600'>{errors.image}</p>}
                            <button
                                type='button'
                                onClick={() => setIsTextDataSubmitted(false)}
                                className='mt-4 text-sm font-bold text-slate-500 hover:text-slate-800'
                            >
                                Back to account details
                            </button>
                        </div>
                    ) : (
                        <div className='space-y-4'>
                            {isSignup && (
                                <label className='block'>
                                    <span className='text-sm font-bold text-slate-700'>Company name</span>
                                    <input
                                        className='mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                                        onChange={e => setName(e.target.value)}
                                        value={name}
                                        type='text'
                                        placeholder='Example: Acme Technologies'
                                        autoComplete='organization'
                                    />
                                    {errors.name && <p className='mt-1 text-xs font-semibold text-rose-600'>{errors.name}</p>}
                                </label>
                            )}

                            <label className='block'>
                                <span className='text-sm font-bold text-slate-700'>Work email</span>
                                <input
                                    className='mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                                    onChange={e => setEmail(e.target.value)}
                                    value={email}
                                    type='email'
                                    placeholder='recruiting@company.com'
                                    autoComplete='email'
                                />
                                {errors.email && <p className='mt-1 text-xs font-semibold text-rose-600'>{errors.email}</p>}
                            </label>

                            <label className='block'>
                                <span className='text-sm font-bold text-slate-700'>Password</span>
                                <input
                                    className='mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-medium outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
                                    onChange={e => setPassword(e.target.value)}
                                    value={password}
                                    type='password'
                                    placeholder={isSignup ? 'At least 8 characters' : 'Enter your password'}
                                    autoComplete={isSignup ? 'new-password' : 'current-password'}
                                />
                                {errors.password
                                    ? <p className='mt-1 text-xs font-semibold text-rose-600'>{errors.password}</p>
                                    : isSignup && password && <p className={`mt-1 text-xs font-semibold ${passwordHint ? 'text-slate-500' : 'text-emerald-600'}`}>
                                        {passwordHint || 'Password strength looks good.'}
                                    </p>}
                            </label>
                        </div>
                    )}

                    <button
                        type='submit'
                        disabled={isLoading}
                        className='mt-7 w-full rounded-xl bg-indigo-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60'
                    >
                        {isLoading
                            ? 'Please wait...'
                            : !isSignup
                                ? 'Sign in to dashboard'
                                : isTextDataSubmitted
                                    ? 'Create recruiter workspace'
                                    : 'Continue to logo upload'}
                    </button>

                    <p className='mt-6 text-center text-sm text-slate-500'>
                        {isSignup ? 'Already manage a SkillNest workspace?' : 'New company on SkillNest?'}
                        <button
                            type='button'
                            className='ml-2 font-black text-indigo-600 hover:text-indigo-700'
                            onClick={() => switchMode(isSignup ? 'Login' : 'Sign Up')}
                        >
                            {isSignup ? 'Sign in' : 'Create recruiter account'}
                        </button>
                    </p>
                </section>
            </form>
        </div>
    )
}

export default RecruiterLogin
