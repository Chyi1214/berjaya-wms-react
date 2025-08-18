// Login Component - Google OAuth authentication
import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import VersionFooter from './VersionFooter';

// Login Component
export function Login() {
  // Get auth functions from context
  const { login, loading, error } = useAuth();
  
  // Local loading state for better UX
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Handle login button click
  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      await login();
    } catch (error) {
      // Error is handled by AuthContext
      console.error('Login component error:', error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Logo/Header Section */}
        <div className="text-center mb-8">
          <div className="mb-4">
            {/* You can replace this with your actual logo */}
            <div className="w-16 h-16 bg-primary-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-2xl font-bold">B</span>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Berjaya WMS
          </h1>
          <p className="text-gray-600 text-lg">
            Warehouse Management System
          </p>
          <p className="text-gray-500 text-sm mt-2">
            Welcome to the inventory counting system
          </p>
        </div>

        {/* Login Card */}
        <div className="card">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Please Login
            </h2>
            <p className="text-gray-600">
              Sign in with your Google account to continue
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700 text-sm">
                <span className="font-medium">Login failed:</span> {error}
              </p>
            </div>
          )}

          {/* Login Button */}
          <button
            onClick={handleLogin}
            disabled={loading || isLoggingIn}
            className="w-full btn-primary flex items-center justify-center space-x-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* Loading Spinner */}
            {(loading || isLoggingIn) ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              // Google Icon (simplified SVG)
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
            )}
            
            <span>
              {(loading || isLoggingIn) ? 'Signing in...' : 'Login with Google'}
            </span>
          </button>

          {/* Development Info */}
          {import.meta.env.VITE_DEV_MODE === 'true' && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-800 text-xs">
                <span className="font-medium">Development Mode:</span> 
                {' '}Make sure you have configured your Firebase credentials in the .env file
              </p>
            </div>
          )}
        </div>

        <VersionFooter className="mt-8" />
      </div>
    </div>
  );
}

export default Login;