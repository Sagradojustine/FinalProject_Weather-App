import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react'

function AdminLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const { adminSignIn, adminLoading, adminError, setAdminError, isAuthenticated } = useAdminAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Clear any existing errors on component mount
    setAdminError(null)
    
    // Redirect if already authenticated
    if (isAuthenticated()) {
      navigate('/admin/dashboard')
    }
  }, [isAuthenticated, navigate, setAdminError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setAdminError(null)

    try {
      const result = await adminSignIn(email, password)
      if (result.success) {
        navigate('/admin/dashboard')
      }
    } catch (error) {
      console.error('Admin login error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDemoLogin = (demoEmail, demoPassword) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    // Auto-submit after a short delay
    setTimeout(() => {
      document.querySelector('form').requestSubmit()
    }, 100)
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-600 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-purple-100 p-3 rounded-full">
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Admin Portal</h1>
          <p className="text-gray-600 mt-2 text-sm">
          </p>
        </div>

        {/* Error Message */}
        {adminError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 shrink-0" />
            <span className="text-sm">{adminError}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Admin Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
              placeholder="admin@weatherguard.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                placeholder="Enter your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition duration-200"
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || adminLoading}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading || adminLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Logging In...
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5 mr-2" />
               Login as Admin
              </>
            )}
          </button>
        </form>

        {/* Demo Accounts */}
        <div className="mt-6 space-y-3">
         
          <button
            onClick={() => handleDemoLogin('admin@weatherguard.com', 'Admin123!')}
            className="w-full bg-linear-to-r from-green-500 to-green-600 text-white py-2 px-4 rounded-lg hover:from-green-600 hover:to-green-700 transition duration-200 text-sm font-medium"
          >
            System Admin (admin@weatherguard.com)
          </button>
        </div>

        {/* Register Link */}
        <div className="text-center mt-6 pt-4 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            Need an admin account?{' '}
            <Link
              to="/admin/register"
              className="text-purple-600 hover:text-purple-800 font-medium transition duration-200"
            >
              Request access
            </Link>
          </p>
        </div>

        {/* Back to User Login */}
        <div className="text-center mt-4">
          <Link
            to="/user/login"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition duration-200"
          >
            ← Back to User Login
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin