import { useContext, useEffect, useRef, useState } from 'react'
import Quill from 'quill'
import { JobCategories, JobLocations } from '../assets/assets';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';
import { recruiterService } from '../services/recruiterService';

const AddJob = () => {

    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('Bangalore');
    const [category, setCategory] = useState('Programming');
    const [level, setLevel] = useState('Beginner level');
    const [salary, setSalary] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false)

    const editorRef = useRef(null)
    const quillRef = useRef(null)

    const { companyToken } = useContext(AppContext)
    const { companyData } = useContext(AppContext)
    const isAdmin = (companyData?.currentRecruiter?.role || 'Admin') === 'Admin'

    const onSubmitHandler = async (e) => {
        e.preventDefault()

        const description = quillRef.current.root.innerHTML.trim()

        // Validation
        if (!title.trim()) {
            return toast.error('Enter a clear role title')
        }
        if (description === '' || description === '<p><br></p>') {
            return toast.error('Add a role description before publishing')
        }
        if (!salary || Number(salary) <= 0) {
            return toast.error('Enter a valid monthly salary')
        }

        try {
            setIsSubmitting(true)

            // Using recruiterService for standardized API calls
            const response = await recruiterService.postJob({ 
                title: title.trim(), 
                description, 
                location, 
                salary: Number(salary), 
                category, 
                level 
            })

            if (response.success) {
                toast.success('Role published successfully')
                setTitle('')
                setSalary('')
                quillRef.current.root.innerHTML = ''
            } else {
                toast.error(response.message)
            }

        } catch (error) {
            toast.error(error.message || 'Could not publish role')
        } finally {
            setIsSubmitting(false)
        }
    }

    useEffect(() => {
        if (!quillRef.current && editorRef.current) {
            quillRef.current = new Quill(editorRef.current, {
                theme: 'snow',
                placeholder: 'Describe responsibilities, required skills, interview expectations, and working location.',
            })
        }
    }, [])

    if (!isAdmin) {
        return (
            <div className='rounded-xl border border-amber-100 bg-amber-50 p-8 text-center'>
                <h2 className='text-xl font-black text-amber-900'>Admin access required</h2>
                <p className='text-amber-700 mt-2'>Only Admin recruiters can post new jobs.</p>
            </div>
        )
    }

    return (
        <form onSubmit={onSubmitHandler} className='container p-4 flex flex-col w-full items-start gap-4 max-w-3xl animate-fade-in'>
            <h2 className='text-xl font-semibold text-gray-800'>Publish a New Role</h2>

            {/* Job Title */}
            <div className='w-full'>
                <label className='block mb-1 text-sm font-medium text-gray-700'>Role title <span className='text-red-500'>*</span></label>
                <input
                    type='text'
                    placeholder='Example: Frontend Engineer Intern'
                    onChange={e => setTitle(e.target.value)}
                    value={title}
                    className='w-full max-w-lg px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors'
                />
            </div>

            {/* Job Description */}
            <div className='w-full max-w-lg'>
                <label className='block mb-2 text-sm font-medium text-gray-700'>Role description <span className='text-red-500'>*</span></label>
                <div ref={editorRef} className='min-h-[150px]' />
            </div>

            {/* Category / Location / Level */}
            <div className='flex flex-col sm:flex-row gap-4 w-full'>
                <div className='flex-1'>
                    <label className='block mb-1 text-sm font-medium text-gray-700'>Category</label>
                    <select
                        className='w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors'
                        onChange={e => setCategory(e.target.value)}
                        value={category}
                    >
                        {JobCategories.map((cat, i) => (
                            <option key={i} value={cat}>{cat}</option>
                        ))}
                    </select>
                </div>

                <div className='flex-1'>
                    <label className='block mb-1 text-sm font-medium text-gray-700'>Location</label>
                    <select
                        className='w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors'
                        onChange={e => setLocation(e.target.value)}
                        value={location}
                    >
                        {JobLocations.map((loc, i) => (
                            <option key={i} value={loc}>{loc}</option>
                        ))}
                    </select>
                </div>

                <div className='flex-1'>
                    <label className='block mb-1 text-sm font-medium text-gray-700'>Experience Level</label>
                    <select
                        className='w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors'
                        onChange={e => setLevel(e.target.value)}
                        value={level}
                    >
                        <option value='Beginner level'>Beginner</option>
                        <option value='Intermediate level'>Intermediate</option>
                        <option value='Senior level'>Senior</option>
                    </select>
                </div>
            </div>

            {/* Salary */}
            <div>
                <label className='block mb-1 text-sm font-medium text-gray-700'>Salary (₹/month) <span className='text-red-500'>*</span></label>
                <input
                    min={1}
                    className='w-full px-3 py-2 border-2 border-gray-300 rounded-lg sm:w-[160px] focus:outline-none focus:border-blue-500 transition-colors'
                    onChange={e => setSalary(e.target.value)}
                    value={salary}
                    type='number'
                    placeholder='Example: 50000'
                />
            </div>

            {/* Submit */}
            <button
                type='submit'
                disabled={isSubmitting}
                className={`px-8 py-3 mt-2 rounded-lg text-white font-medium transition-all shadow-md ${isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer'}`}
            >
                {isSubmitting ? 'Publishing...' : 'Publish role'}
            </button>
        </form>
    )
}

export default AddJob
