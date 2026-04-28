import React from 'react'

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo)
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className='min-h-screen flex items-center justify-center bg-gray-50'>
                    <div className='text-center px-6 py-12 bg-white rounded-xl shadow-md max-w-md w-full'>
                        <div className='text-6xl mb-4'>⚠️</div>
                        <h1 className='text-2xl font-bold text-gray-800 mb-2'>Something went wrong</h1>
                        <p className='text-gray-500 text-sm mb-6'>
                            {this.state.error?.message || 'An unexpected error occurred.'}
                        </p>
                        <button
                            onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
                            className='bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full transition-colors'
                        >
                            Go to Homepage
                        </button>
                    </div>
                </div>
            )
        }
        return this.props.children
    }
}

export default ErrorBoundary
