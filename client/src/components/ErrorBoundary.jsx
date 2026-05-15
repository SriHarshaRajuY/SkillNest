import { Component } from 'react'

class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, info) {
        console.error('[ErrorBoundary]', error, info)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className='min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-6'>
                    <div className='text-6xl mb-4'>!</div>
                    <h1 className='text-2xl font-semibold text-gray-800 mb-2'>Something went wrong</h1>
                    <p className='text-gray-500 max-w-md mb-6'>
                        An unexpected error occurred. Please refresh the page.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition-colors'
                    >
                        Reload Page
                    </button>
                    {this.state.error && (
                        <p className='mt-4 text-xs text-gray-400 max-w-sm font-mono'>
                            {this.state.error.message}
                        </p>
                    )}
                </div>
            )
        }
        return this.props.children
    }
}

export default ErrorBoundary
