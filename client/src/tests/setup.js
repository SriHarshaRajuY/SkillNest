import '@testing-library/jest-dom'
import { vi } from 'vitest'

vi.mock('@clerk/clerk-react', () => ({
    useClerk: () => ({ openSignIn: vi.fn() }),
    useUser: () => ({ user: { id: 'test-user', firstName: 'Test' } }),
    useAuth: () => ({ getToken: vi.fn(() => Promise.resolve('test-token')) }),
    UserButton: () => null,
    ClerkProvider: ({ children }) => children,
}))
