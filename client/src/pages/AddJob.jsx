import { useContext, useEffect, useRef, useState } from 'react'
import Quill from 'quill'
import { JobCategories, JobLocations } from '../assets/assets';
import axios from 'axios';
import { AppContext } from '../context/AppContext';
import { toast } from 'react-toastify';

const AddJob = () => {

    const [title, setTitle] = useState('');
    const [location, setLocation] = useState('Bangalore');
    const [category, setCategory] = useState('Programming');
    const [level, setLevel] = useState('Beginner level');
    const [salary, setSalary] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditScore, setAuditScore] = useState(null);
    const [auditSuggestions, setAuditSuggestions] = useState([]);

    const editorRef = useRef(null)
    const quillRef = useRef(null)

    const { backendUrl, companyToken } = useContext(AppContext)

    const onSubmitHandler = async (e) => {
        e.preventDefault()

        const description = quillRef.current.root.innerHTML.trim()

        // Validation
        if (!title.trim()) {
            return toast.error('Please enter a job title')
        }
        if (description === '' || description === '<p><br></p>') {
            return toast.error('Please enter a job description')
        }
        if (!salary || Number(salary) <= 0) {
            return toast.error('Please enter a valid salary')
        }

        try {
            setIsSubmitting(true)

            const { data } = await axios.post(backendUrl + '/api/company/post-job',
                { title: title.trim(), description, location, salary: Number(salary), category, level },
                { headers: { token: companyToken } }
            )

            if (data.success) {
                toast.success('Job posted successfully!')
                setTitle('')
                setSalary('')
                quillRef.current.root.innerHTML = ''
                setAuditScore(null)
                setAuditSuggestions([])
            } else {
                toast.error(data.message)
            }

        } catch (error) {
            toast.error(error.message)
        } finally {
            setIsSubmitting(false)
        }
    }

    const runDiversityAudit = async () => {
        const description = quillRef.current.root.innerHTML.trim();
        if (!description || description === '<p><br></p>') {
            return toast.error('Please enter a job description to audit');
        }

        try {
            setIsAuditing(true);
            const { data } = await axios.post(backendUrl + '/api/company/audit-job', 
                { description },
                { headers: { token: companyToken } }
            );

            if (data.success) {
                setAuditScore(data.audit.score);
                setAuditSuggestions(data.audit.suggestions);
                toast.success('Diversity audit complete!');
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error(error.message);
        } finally {
            setIsAuditing(false);
        }
    }

    useEffect(() => {
        if (!quillRef.current && editorRef.current) {
            quillRef.current = new Quill(editorRef.current, {
                theme: 'snow',
                placeholder: 'Describe the role, responsibilities, and requirements...',
            })
        }
    }, [])

    return (
        <form onSubmit={onSubmitHandler} className='container p-4 flex flex-col w-full items-start gap-4 max-w-3xl'>
            <h2 className='text-xl font-semibold text-gray-800'>Post a New Job</h2>

            {/* Job Title */}
            <div className='w-full'>
                <label className='block mb-1 text-sm font-medium text-gray-700'>Job Title <span className='text-red-500'>*</span></label>
                <input
                    type='text'
                    placeholder='e.g. Senior React Developer'
                    onChange={e => setTitle(e.target.value)}
                    value={title}
                    className='w-full max-w-lg px-3 py-2 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 transition-colors'
                />
            </div>

            {/* Job Description */}
            <div className='w-full max-w-lg'>
                <div className='flex justify-between items-end mb-1'>
                    <label className='block text-sm font-medium text-gray-700'>Job Description <span className='text-red-500'>*</span></label>
                    <button 
                        type='button' 
                        onClick={runDiversityAudit}
                        disabled={isAuditing}
                        className='text-xs bg-purple-100 text-purple-700 hover:bg-purple-200 px-3 py-1 rounded-full font-medium transition-colors disabled:opacity-50'
                    >
                        {isAuditing ? 'Auditing...' : '✨ Run AI Diversity Audit'}
                    </button>
                </div>
                <div ref={editorRef} className='min-h-[150px]' />

                {auditScore !== null && (
                    <div className='mt-3 p-4 bg-purple-50 rounded-lg border border-purple-100'>
                        <div className='flex items-center gap-2 mb-2'>
                            <span className='font-semibold text-purple-800'>Diversity Score:</span>
                            <span className={`font-bold px-2 py-0.5 rounded ${auditScore >= 80 ? 'bg-green-100 text-green-700' : auditScore >= 60 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                                {auditScore}/100
                            </span>
                        </div>
                        {auditSuggestions.length > 0 ? (
                            <ul className='list-disc pl-5 space-y-1 text-sm text-purple-900'>
                                {auditSuggestions.map((s, i) => <li key={i}>{s}</li>)}
                            </ul>
                        ) : (
                            <p className='text-sm text-green-700 font-medium'>Great job! This description looks very inclusive.</p>
                        )}
                    </div>
                )}
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
                    placeholder='e.g. 50000'
                />
            </div>

            {/* Submit */}
            <button
                type='submit'
                disabled={isSubmitting}
                className={`px-8 py-3 mt-2 rounded-lg text-white font-medium transition-colors ${isSubmitting
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'}`}
            >
                {isSubmitting ? 'Posting...' : 'Post Job'}
            </button>
        </form>
    )
}

export default AddJob