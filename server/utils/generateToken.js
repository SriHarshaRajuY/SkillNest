import jwt from 'jsonwebtoken'

const generateToken = (payload) => {
    const tokenPayload = typeof payload === 'object' ? payload : { id: payload }
    return jwt.sign(tokenPayload, process.env.JWT_SECRET, {
        expiresIn: '30d'
    })
}

export default generateToken
