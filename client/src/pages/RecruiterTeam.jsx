import { useContext, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import Loading from '../components/Loading'
import { AppContext } from '../context/AppContext'
import { recruiterService } from '../services/recruiterService'

const emptyForm = { name: '', email: '', password: '', role: 'Recruiter' }
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const roleCopy = {
    Admin: 'Can manage jobs, team members, audit logs, and all recruiter workflows.',
    Recruiter: 'Can review candidates, move pipeline stages, run AI analysis, and message candidates.',
    Viewer: 'Can read jobs, applicants, analytics, and conversations without changing data.',
}

const RecruiterTeam = () => {
    const { companyData } = useContext(AppContext)
    const [members, setMembers] = useState(null)
    const [form, setForm] = useState(emptyForm)
    const [formErrors, setFormErrors] = useState({})
    const [saving, setSaving] = useState(false)
    const role = companyData?.currentRecruiter?.role || 'Admin'

    const activeCount = useMemo(() => (members || []).filter((m) => m.status === 'Active').length, [members])

    const fetchTeam = async () => {
        try {
            const response = await recruiterService.getTeam()
            if (response.success) setMembers(response.data.members || [])
        } catch (error) {
            toast.error(error.message || 'Failed to load team')
            setMembers([])
        }
    }

    useEffect(() => {
        if (role === 'Admin') fetchTeam()
    }, [role])

    const createMember = async (e) => {
        e.preventDefault()
        const nextErrors = {}
        if (form.name.trim().length < 2) nextErrors.name = 'Enter the recruiter name.'
        if (!emailPattern.test(form.email.trim())) nextErrors.email = 'Enter a valid work email.'
        if (form.password.length < 8 || !/[a-z]/.test(form.password) || !/[A-Z]/.test(form.password) || !/\d/.test(form.password)) {
            nextErrors.password = 'Use at least 8 characters with uppercase, lowercase, and a number.'
        }
        setFormErrors(nextErrors)
        if (Object.keys(nextErrors).length > 0) return

        try {
            setSaving(true)
            const response = await recruiterService.createTeamMember({
                ...form,
                name: form.name.trim(),
                email: form.email.trim(),
            })
            if (response.success) {
                toast.success('Recruiter account created')
                setMembers((prev) => [...prev, response.data.member])
                setForm(emptyForm)
                setFormErrors({})
            }
        } catch (error) {
            toast.error(error.errors?.[0] || error.message || 'Could not create recruiter account')
        } finally {
            setSaving(false)
        }
    }

    const updateMember = async (memberId, changes) => {
        try {
            const response = await recruiterService.updateTeamMember(memberId, changes)
            if (response.success) {
                setMembers((prev) => prev.map((m) => String(m._id) === String(memberId) ? response.data.member : m))
                toast.success('Recruiter access updated')
            }
        } catch (error) {
            toast.error(error.message || 'Could not update recruiter access')
        }
    }

    if (role !== 'Admin') {
        return (
            <div className='rounded-xl border border-amber-100 bg-amber-50 p-8 text-center'>
                <h2 className='text-xl font-black text-amber-900'>Admin access required</h2>
                <p className='text-amber-700 mt-2'>Team management is limited to Admin recruiters.</p>
            </div>
        )
    }

    if (members === null) return <Loading />

    return (
        <div className='space-y-8 animate-fade-in'>
            <div className='flex flex-col lg:flex-row lg:items-end justify-between gap-4'>
                <div>
                    <h1 className='text-2xl font-black text-slate-900'>Recruiter Team</h1>
                    <p className='text-sm text-slate-500 mt-1'>Manage role-based access for {companyData?.name}.</p>
                </div>
                <div className='grid grid-cols-3 gap-3 text-center'>
                    {['Admin', 'Recruiter', 'Viewer'].map((r) => (
                        <div key={r} className='rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm'>
                            <p className='text-xl font-black text-slate-900'>{members.filter((m) => m.role === r).length}</p>
                            <p className='text-[11px] font-bold uppercase tracking-wider text-slate-500'>{r}</p>
                        </div>
                    ))}
                </div>
            </div>

            <section className='grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6'>
                <div className='rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden'>
                    <div className='px-5 py-4 border-b border-slate-100 flex justify-between items-center'>
                        <div>
                            <h2 className='font-black text-slate-900'>Members</h2>
                            <p className='text-sm text-slate-500'>{activeCount} active accounts</p>
                        </div>
                    </div>
                    <div className='overflow-x-auto'>
                        <table className='min-w-full'>
                            <thead className='bg-slate-50 text-xs uppercase tracking-wider text-slate-500'>
                                <tr>
                                    <th className='text-left px-5 py-3'>Member</th>
                                    <th className='text-left px-5 py-3'>Role</th>
                                    <th className='text-left px-5 py-3'>Status</th>
                                    <th className='text-left px-5 py-3'>Last Login</th>
                                </tr>
                            </thead>
                            <tbody className='divide-y divide-slate-100'>
                                {members.map((member) => (
                                    <tr key={member._id} className='hover:bg-slate-50/70'>
                                        <td className='px-5 py-4'>
                                            <p className='font-bold text-slate-900'>{member.name}</p>
                                            <p className='text-xs text-slate-500'>{member.email}</p>
                                        </td>
                                        <td className='px-5 py-4'>
                                            <select
                                                value={member.role}
                                                onChange={(e) => updateMember(member._id, { role: e.target.value })}
                                                className='rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'
                                            >
                                                <option value='Admin'>Admin</option>
                                                <option value='Recruiter'>Recruiter</option>
                                                <option value='Viewer'>Viewer</option>
                                            </select>
                                        </td>
                                        <td className='px-5 py-4'>
                                            <button
                                                type='button'
                                                onClick={() => updateMember(member._id, { status: member.status === 'Active' ? 'Suspended' : 'Active' })}
                                                className={`rounded-full px-3 py-1 text-xs font-black ${
                                                    member.status === 'Active'
                                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                                                }`}
                                            >
                                                {member.status}
                                            </button>
                                        </td>
                                        <td className='px-5 py-4 text-sm text-slate-500'>
                                            {member.lastLoginAt ? new Date(member.lastLoginAt).toLocaleDateString() : 'Never'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <aside className='space-y-5'>
                    <form onSubmit={createMember} className='rounded-xl border border-slate-200 bg-white p-5 shadow-sm'>
                        <h2 className='font-black text-slate-900'>Invite Recruiter</h2>
                        <p className='text-sm text-slate-500 mt-1 mb-4'>Create a scoped account for a teammate.</p>
                        <div className='space-y-3'>
                            <div>
                                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder='Recruiter name' className='w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
                                {formErrors.name && <p className='mt-1 text-xs font-semibold text-rose-600'>{formErrors.name}</p>}
                            </div>
                            <div>
                                <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder='recruiter@company.com' type='email' className='w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
                                {formErrors.email && <p className='mt-1 text-xs font-semibold text-rose-600'>{formErrors.email}</p>}
                            </div>
                            <div>
                                <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder='Temporary password' type='password' className='w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100' />
                                {formErrors.password && <p className='mt-1 text-xs font-semibold text-rose-600'>{formErrors.password}</p>}
                            </div>
                            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className='w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'>
                                <option value='Admin'>Admin</option>
                                <option value='Recruiter'>Recruiter</option>
                                <option value='Viewer'>Viewer</option>
                            </select>
                            <button disabled={saving} className='w-full rounded-lg bg-blue-600 py-2.5 font-black text-white hover:bg-blue-700 disabled:opacity-60'>
                                {saving ? 'Creating account...' : 'Create recruiter account'}
                            </button>
                        </div>
                    </form>

                    <div className='rounded-xl border border-slate-200 bg-slate-50 p-5'>
                        <h2 className='font-black text-slate-900 mb-3'>Role Design</h2>
                        <div className='space-y-3'>
                            {Object.entries(roleCopy).map(([r, copy]) => (
                                <div key={r}>
                                    <p className='text-sm font-black text-slate-800'>{r}</p>
                                    <p className='text-xs text-slate-500 leading-relaxed'>{copy}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </section>
        </div>
    )
}

export default RecruiterTeam
