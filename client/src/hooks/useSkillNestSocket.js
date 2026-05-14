import { useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

export function useSkillNestSocket({ backendUrl, authToken, applicationIds = [], handlers = {} }) {
    const socketRef = useRef(null)
    const handlersRef = useRef(handlers)
    handlersRef.current = handlers

    const joinRooms = useCallback((socket, ids) => {
        ids.filter(Boolean).forEach((id) => {
            socket.emit('join-application', { applicationId: String(id) }, () => {})
        })
    }, [])

    useEffect(() => {
        if (!backendUrl || !authToken) return undefined

        const socket = io(backendUrl, {
            auth: { token: authToken },
            reconnectionAttempts: 8,
            reconnectionDelay: 1000,
            transports: ['websocket'], // Prefer websockets for stability
        })

        socketRef.current = socket

        const onConnect = () => {
            joinRooms(socket, applicationIds)
        }

        socket.on('connect', onConnect)

        const entries = Object.entries(handlersRef.current || {})
        entries.forEach(([event, fn]) => {
            if (typeof fn === 'function') socket.on(event, fn)
        })

        return () => {
            entries.forEach(([event, fn]) => {
                if (typeof fn === 'function') socket.off(event, fn)
            })
            socket.off('connect', onConnect)
            socket.close()
            socketRef.current = null
        }
    }, [backendUrl, authToken, joinRooms, JSON.stringify(applicationIds)])

    useEffect(() => {
        const socket = socketRef.current
        if (socket?.connected) {
            joinRooms(socket, applicationIds)
        }
    }, [applicationIds, joinRooms])

    const emit = useCallback((event, data) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data)
        }
    }, [])

    return { emit, connected: socketRef.current?.connected || false }
}
