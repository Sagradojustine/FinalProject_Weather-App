import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, Mail, AlertCircle, CheckCircle, Cloud } from 'lucide-react'

function UserRegister() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  
  const { signUp, loading, error, clearError } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Clear any existing errors on component mount
    clearError()
  }, [clearError])

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      clearError()
      // You might want to set a specific error state for password mismatch
      return
    }

    setIsLoading(true)

    try {
      const result = await signUp(email, password, 'user')
      if (!result.error) {
        setShowConfirmation(true)
      }
    } catch (error) {
      console.error('Registration error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const passwordStrength = {
    minLength: password.length >= 6,
    hasUpperCase: /[A-Z]/.test(password),
    hasLowerCase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
  }

  const isPasswordStrong = Object.values(passwordStrength).every(Boolean)

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Check Your Email</h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">Registration Successful</span>
              </div>
              <p className="text-green-700 text-sm">
                We've sent a confirmation email to <strong>{email}</strong>. 
                Please check your inbox and click the confirmation link to activate your account.
              </p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/user/login')}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-200"
              >
                Back to Sign In
              </button>
              <Link
                to="/admin/register"
                className="block text-center text-purple-600 hover:text-purple-800 text-sm font-medium transition duration-200"
              >
                Need admin account? →
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
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
          <h1 className="text-2xl font-bold text-gray-800">Create Account</h1>
          <p className="text-gray-600 mt-2 text-sm">
            Join WeatherGuard Pro today
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Registration Form */}
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
                placeholder="Create a password"
                required
                minLength={6}
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
            
            {/* Password Strength Indicator */}
            {password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-xs">
                  <div className={`w-2 h-2 rounded-full mr-2 ${passwordStrength.minLength ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={passwordStrength.minLength ? 'text-green-600' : 'text-gray-500'}>
                    At least 6 characters
                  </span>
                </div>
                <div className="flex items-center text-xs">
                  <div className={`w-2 h-2 rounded-full mr-2 ${passwordStrength.hasUpperCase ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={passwordStrength.hasUpperCase ? 'text-green-600' : 'text-gray-500'}>
                    Uppercase letter
                  </span>
                </div>
                <div className="flex items-center text-xs">
                  <div className={`w-2 h-2 rounded-full mr-2 ${passwordStrength.hasLowerCase ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={passwordStrength.hasLowerCase ? 'text-green-600' : 'text-gray-500'}>
                    Lowercase letter
                  </span>
                </div>
                <div className="flex items-center text-xs">
                  <div className={`w-2 h-2 rounded-full mr-2 ${passwordStrength.hasNumber ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={passwordStrength.hasNumber ? 'text-green-600' : 'text-gray-500'}>
                    Number
                  </span>
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-200 ${
                  confirmPassword && password !== confirmPassword 
                    ? 'border-red-300' 
                    : 'border-gray-300'
                }`}
                placeholder="Confirm your password"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition duration-200"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {confirmPassword && password !== confirmPassword && (
              <p className="text-red-600 text-xs mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || loading || !isPasswordStrong || password !== confirmPassword}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading || loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5 mr-2" />
                Create Account
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="text-center mt-6 pt-4 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            Already have an account?{' '}
            <Link
              to="/user/login"
              className="text-blue-600 hover:text-blue-800 font-medium transition duration-200"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Admin Portal Link */}
        <div className="text-center mt-4">
          <Link
            to="/admin/register"
            className="text-purple-600 hover:text-purple-800 text-sm font-medium transition duration-200"
          >
            Need admin account? →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default UserRegister