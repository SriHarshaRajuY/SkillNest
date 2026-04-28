const SkillNestLogo = ({ className = '' }) => {
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            {/* Icon */}
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="32" rx="8" fill="#2563EB" />
                {/* Nest / network icon */}
                <circle cx="16" cy="16" r="4" fill="white" />
                <circle cx="8" cy="10" r="2.5" fill="white" fillOpacity="0.85" />
                <circle cx="24" cy="10" r="2.5" fill="white" fillOpacity="0.85" />
                <circle cx="8" cy="22" r="2.5" fill="white" fillOpacity="0.85" />
                <circle cx="24" cy="22" r="2.5" fill="white" fillOpacity="0.85" />
                <line x1="10.5" y1="11" x2="14" y2="14" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
                <line x1="21.5" y1="11" x2="18" y2="14" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
                <line x1="10.5" y1="21" x2="14" y2="18" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
                <line x1="21.5" y1="21" x2="18" y2="18" stroke="white" strokeWidth="1.5" strokeOpacity="0.7" />
            </svg>
            {/* Text */}
            <span className="font-bold text-xl tracking-tight">
                <span className="text-blue-600">Skill</span><span className="text-gray-800">Nest</span>
            </span>
        </div>
    )
}

export default SkillNestLogo
