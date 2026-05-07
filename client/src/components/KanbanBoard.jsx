import { PIPELINE_STAGES, PIPELINE_LABELS } from '../constants/pipeline'
import ApplicationCard from './ApplicationCard'

const COLUMN_RING = {
    Applied: 'border-blue-300',
    Screening: 'border-amber-300',
    Interview: 'border-violet-400',
    Offer: 'border-emerald-400',
    Hired: 'border-emerald-600',
    Rejected: 'border-rose-400',
}

const KanbanBoard = ({
    validApplicants,
    displayPipelineStage,
    handleDragOver,
    handleDrop,
    handleDragStart,
    selectedId,
    setSelectedId,
    viewApplicantResume,
    handleAIMatch,
    matchResults
}) => {
    return (
        <div className='flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-220px)]'>
            {PIPELINE_STAGES.map((stage) => (
                <div
                    key={stage}
                    className={`flex-1 min-w-[280px] rounded-xl p-4 border-2 border-dashed bg-gray-50/80 flex flex-col ${COLUMN_RING[stage] || 'border-gray-200'}`}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, stage)}
                >
                    <h2 className='font-semibold mb-4 pb-2 border-b border-gray-200 text-gray-800 flex justify-between items-center'>
                        <span>{PIPELINE_LABELS[stage]}</span>
                        <span className='text-xs font-normal text-gray-500'>
                            {validApplicants.filter((a) => displayPipelineStage(a) === stage).length}
                        </span>
                    </h2>
                    <div className='flex-1 overflow-y-auto space-y-3 pr-1 max-h-[calc(100vh-280px)]'>
                        {validApplicants
                            .filter((a) => displayPipelineStage(a) === stage)
                            .map((applicant) => (
                                <ApplicationCard
                                    key={applicant._id}
                                    applicant={applicant}
                                    selectedId={selectedId}
                                    setSelectedId={setSelectedId}
                                    handleDragStart={handleDragStart}
                                    viewApplicantResume={viewApplicantResume}
                                    handleAIMatch={handleAIMatch}
                                    matchResults={matchResults}
                                />
                            ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

export default KanbanBoard
