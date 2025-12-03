import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, LogIn, AlertCircle, Cloud } from 'lucide-react'

function UserLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  
  const { signIn, loading, error, clearError } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Clear any existing errors on component mount
    clearError()
  }, [clearError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn(email, password)
      if (!result.error) {
        navigate('/dashboard')
      }
    } catch (error) {
      console.error('Login error:', error)
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="min-h-screen bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Cloud className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Welcome Back</h1>
          <p className="text-gray-600 mt-2 text-sm">
            Sign in to your WeatherGuard Pro account
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
              placeholder="Enter your email"
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
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200"
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
            disabled={isLoading || loading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading || loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Logging In...
              </>
            ) : (
              <>
                <LogIn className="h-5 w-5 mr-2" />
                LogIn
              </>
            )}
          </button>
        </form>

        {/* Register Link */}
        <div className="text-center mt-6 pt-4 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            Don't have an account?{' '}
            <Link
              to="/user/register"
              className="text-blue-600 hover:text-blue-800 font-medium transition duration-200"
            >
              Create account
            </Link>
          </p>
        </div>

        {/* Admin Portal Link */}
        <div className="text-center mt-4">
          <Link
            to="/admin/login"
            className="text-purple-600 hover:text-purple-800 text-sm font-medium transition duration-200"
          >
            Admin Portal →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default UserLogin