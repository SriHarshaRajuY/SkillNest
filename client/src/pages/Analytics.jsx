import { useEffect, useState } from 'react';
import { recruiterService } from '../services/recruiterService';
import Loading from '../components/Loading';
import { toast } from 'react-toastify';

const Analytics = () => {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = async () => {
        try {
            const response = await recruiterService.getAnalytics();
            if (response.success) {
                setStats(response.data);
            }
        } catch (error) {
            toast.error(error.message || 'Failed to load analytics');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchStats();
    }, []);

    if (loading) return <Loading />;
    if (!stats) return <div className="text-center py-10 text-gray-500">No analytics data available.</div>;

    const { summary, appsPerJob, pipelineDistribution } = stats;

    return (
        <div className="space-y-8 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800">Recruiter Analytics</h2>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Applicants', value: summary.totalApplicants, color: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Interviews Held', value: summary.interviews, color: 'text-purple-600', bg: 'bg-purple-50' },
                    { label: 'Hires Confirmed', value: summary.hires, color: 'text-green-600', bg: 'bg-green-50' },
                    { label: 'Rejection Rate', value: `${summary.rejectionRate}%`, color: 'text-red-600', bg: 'bg-red-50' },
                ].map((card, i) => (
                    <div key={i} className={`${card.bg} p-6 rounded-2xl border border-white/50 shadow-sm transition-transform hover:scale-[1.02]`}>
                        <p className="text-sm font-medium text-gray-600 uppercase tracking-wider">{card.label}</p>
                        <p className={`text-3xl font-bold mt-2 ${card.color}`}>{card.value}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Pipeline Distribution */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Hiring Pipeline Distribution</h3>
                    <div className="space-y-4">
                        {pipelineDistribution.map((item, i) => (
                            <div key={i} className="group">
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="font-medium text-gray-700">{item.stage}</span>
                                    <span className="text-gray-500">{item.count}</span>
                                </div>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div 
                                        className="bg-blue-600 h-full rounded-full transition-all duration-1000" 
                                        style={{ width: `${(item.count / (summary.totalApplicants || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Applications per Job */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Applications Per Job</h3>
                    <div className="max-h-[300px] overflow-y-auto space-y-4 pr-2">
                        {appsPerJob.map((job, i) => (
                            <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                                <p className="text-sm font-medium text-gray-800 truncate flex-1">{job.title}</p>
                                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2.5 py-1 rounded-full ml-4">
                                    {job.count}
                                </span>
                            </div>
                        ))}
                        {appsPerJob.length === 0 && <p className="text-gray-400 text-sm text-center py-4">No jobs posted yet.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Analytics;
