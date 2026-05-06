/**
 * Skill matching logic
 */

export const calculateMatchScore = (userSkills = [], requiredSkills = []) => {
    if (!requiredSkills.length) return 100 // If no skills required, it's a 100% match

    const userSkillsLower = userSkills.map(s => s.toLowerCase().trim())
    
    let totalWeight = 0
    let matchedWeight = 0

    for (const req of requiredSkills) {
        totalWeight += req.weight || 3
        if (userSkillsLower.includes(req.skill.toLowerCase().trim())) {
            matchedWeight += req.weight || 3
        }
    }

    if (totalWeight === 0) return 100

    return Math.round((matchedWeight / totalWeight) * 100)
}

export const calculateProfileCompleteness = (user) => {
    let score = 0
    if (user.name) score += 25
    if (user.image) score += 25
    if (user.resume) score += 25
    if (user.skills && user.skills.length > 0) score += 25
    return score
}
