import React from 'react'

export const Skeleton = ({ className, ...props }) => {
    return (
        <div 
            className={`animate-pulse bg-gray-200 dark:bg-gray-700 rounded ${className}`} 
            {...props} 
        />
    )
}

export const JobCardSkeleton = () => (
    <div className="border border-gray-100 p-6 rounded-xl shadow-sm bg-white">
        <div className="flex items-center gap-4 mb-4">
            <Skeleton className="w-12 h-12 rounded-lg" />
            <div className="flex-1">
                <Skeleton className="w-48 h-6 mb-2" />
                <Skeleton className="w-32 h-4" />
            </div>
        </div>
        <Skeleton className="w-full h-20 mb-4" />
        <div className="flex justify-between items-center">
            <Skeleton className="w-24 h-4" />
            <Skeleton className="w-20 h-8 rounded-lg" />
        </div>
    </div>
)

export const TableRowSkeleton = ({ cols = 5 }) => (
    <tr className="animate-pulse border-b border-gray-100">
        {Array.from({ length: cols }).map((_, i) => (
            <td key={i} className="py-4 px-4">
                <Skeleton className="h-4 w-full rounded" />
            </td>
        ))}
    </tr>
)
