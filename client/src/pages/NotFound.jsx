import { Link } from 'react-router-dom'

const NotFound = () => {
    return (
        <div className='min-h-screen bg-gray-50 flex flex-col items-center justify-center text-center px-6'>
            <div className='text-8xl font-bold text-blue-600 mb-4'>404</div>
            <h1 className='text-3xl font-semibold text-gray-800 mb-3'>Page Not Found</h1>
            <p className='text-gray-500 max-w-md mb-8'>
                The page you're looking for doesn't exist or has been moved.
            </p>
            <Link
                to='/'
                className='bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-full font-medium transition-colors'
            >
                Back to Home
            </Link>
        </div>
    )
}

export default NotFound
