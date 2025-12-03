import React, { useState, useEffect } from 'react'
import { useAdminAuth } from '../context/AdminAuthContext'
import { useNavigate, Link } from 'react-router-dom'
import { Shield, Eye, EyeOff, UserPlus, Mail, AlertCircle, CheckCircle } from 'lucide-react'

function AdminRegister() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    reason: '',
    phone: '',
    reasonOther: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [confirmationEmail, setConfirmationEmail] = useState('')
  
  const { adminError, setAdminError } = useAdminAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Clear any existing errors on component mount
    setAdminError(null)
  }, [setAdminError])

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const sendEmailNotification = async (emailData) => {
    try {
      // In a real application, this would be a backend API call
      // Using EmailJS, SendGrid, or your own backend email service
      
      // For demo purposes, let's simulate with EmailJS or a fetch to your backend
      // Replace with your actual email sending service
      const response = await fetch('https://your-backend-api.com/send-admin-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        throw new Error('Failed to send email notification');
      }

      return await response.json();
    } catch (error) {
      console.error('Email sending error:', error);
      // Don't throw the error - we still want to show success to user
      // but log it for debugging
      return { success: false, error: error.message };
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (formData.password !== formData.confirmPassword) {
      setAdminError('Passwords do not match')
      return
    }

    setIsLoading(true)
    setAdminError(null)

    try {
      // Prepare email data
      const emailData = {
        to: 'admin@weatherguard.com', // This would go to your system admin
        cc: formData.email, // Send copy to requester
        subject: 'New Admin Access Request - WeatherGuard Pro',
        templateData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          organization: formData.organization,
          reason: formData.reason === 'other' ? formData.reasonOther : formData.reason,
          requestDate: new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        }
      }

      // Send email to system admin
      const emailResult = await sendEmailNotification(emailData);
      
      if (!emailResult.success) {
        console.warn('Email notification failed, but continuing with registration request');
      }

      // Also send confirmation email to the requester
      const confirmationEmailData = {
        to: formData.email,
        subject: 'Admin Access Request Received - WeatherGuard Pro',
        templateData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          requestId: `REQ-${Date.now()}`,
          estimatedTime: '2-3 business days',
          supportEmail: 'support@weatherguard.com',
          supportPhone: '+1 (800) 555-ADMIN'
        }
      };

      const confirmationResult = await sendEmailNotification(confirmationEmailData);

      if (!confirmationResult.success) {
        console.warn('Confirmation email failed to send');
      }

      // Store the request in localStorage (in a real app, this would be a backend database)
      const adminRequests = JSON.parse(localStorage.getItem('adminRequests') || '[]');
      const newRequest = {
        id: `req-${Date.now()}`,
        ...formData,
        status: 'pending',
        submittedAt: new Date().toISOString(),
        reason: formData.reason === 'other' ? formData.reasonOther : formData.reason
      };
      
      adminRequests.push(newRequest);
      localStorage.setItem('adminRequests', JSON.stringify(adminRequests));

      // Store email for confirmation display
      setConfirmationEmail(formData.email);
      setShowConfirmation(true);
      
    } catch (error) {
      console.error('Registration error:', error);
      setAdminError('Failed to submit registration request. Please try again or contact support.');
    } finally {
      setIsLoading(false);
    }
  }

  const passwordStrength = {
    minLength: formData.password.length >= 8,
    hasUpperCase: /[A-Z]/.test(formData.password),
    hasLowerCase: /[a-z]/.test(formData.password),
    hasNumber: /[0-9]/.test(formData.password),
    hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password),
  }

  const isPasswordStrong = Object.values(passwordStrength).every(Boolean)
  const isFormValid = formData.firstName && formData.lastName && formData.email && 
                     formData.organization && formData.reason && formData.phone &&
                     isPasswordStrong && formData.password === formData.confirmPassword

  if (showConfirmation) {
    return (
      <div className="min-h-screen bg-linear-to-br from-purple-600 to-indigo-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-green-100 p-3 rounded-full">
                <Mail className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Request Submitted</h1>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center justify-center mb-2">
                <CheckCircle className="h-6 w-6 text-green-600 mr-2" />
                <span className="text-green-800 font-medium">Admin Access Requested</span>
              </div>
              <p className="text-green-700 text-sm">
                Your admin account request has been submitted for review. 
                We'll contact you at <strong>{confirmationEmail}</strong> once your account is approved.
              </p>
              <div className="mt-3 p-3 bg-blue-50 rounded border border-blue-200">
                <p className="text-blue-800 text-xs">
                  <strong>Note:</strong> A confirmation email has been sent to {confirmationEmail}. 
                  Please check your inbox (and spam folder).
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/admin/login')}
                className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 transition duration-200"
              >
                Back to Admin Login
              </button>
              <Link
                to="/user/register"
                className="block text-center text-blue-600 hover:text-blue-800 text-sm font-medium transition duration-200"
              >
                ← Need user account?
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
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
          <h1 className="text-2xl font-bold text-gray-800">Admin Access Request</h1>
          <p className="text-gray-600 mt-2 text-sm">
            Request administrator access to WeatherGuard Pro
          </p>
        </div>

        {/* Error Message */}
        {adminError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
            <AlertCircle className="h-5 w-5 mr-2 mt-0.5 shrink-0" />
            <span className="text-sm">{adminError}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Name
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                placeholder="First name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Last Name
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                placeholder="Last name"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
              placeholder="professional@organization.com"
              required
            />
            <p className="text-xs text-gray-500 mt-1">
              This email will receive confirmation and approval updates
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
              placeholder="+1 (555) 123-4567"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Organization
            </label>
            <input
              type="text"
              name="organization"
              value={formData.organization}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
              placeholder="Your organization name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Admin Access
            </label>
            <select
              name="reason"
              value={formData.reason}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
              required
            >
              <option value="">Select a reason</option>
              <option value="system_administration">System Administration</option>
              <option value="emergency_management">Emergency Management</option>
              <option value="organization_management">Organization Management</option>
              <option value="other">Other</option>
            </select>
          </div>

          {formData.reason === 'other' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Please specify
              </label>
              <input
                type="text"
                name="reasonOther"
                value={formData.reasonOther}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                placeholder="Please specify your reason"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200"
                placeholder="Create a strong password"
                required
                minLength={8}
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
            {formData.password && (
              <div className="mt-2 space-y-1">
                <div className="flex items-center text-xs">
                  <div className={`w-2 h-2 rounded-full mr-2 ${passwordStrength.minLength ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={passwordStrength.minLength ? 'text-green-600' : 'text-gray-500'}>
                    At least 8 characters
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
                <div className="flex items-center text-xs">
                  <div className={`w-2 h-2 rounded-full mr-2 ${passwordStrength.hasSpecialChar ? 'bg-green-500' : 'bg-gray-300'}`} />
                  <span className={passwordStrength.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}>
                    Special character
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
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition duration-200 ${
                  formData.confirmPassword && formData.password !== formData.confirmPassword 
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
            {formData.confirmPassword && formData.password !== formData.confirmPassword && (
              <p className="text-red-600 text-xs mt-1">Passwords do not match</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || !isFormValid}
            className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg hover:bg-purple-700 focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting Request...
              </>
            ) : (
              <>
                <UserPlus className="h-5 w-5 mr-2" />
                Request Admin Access
              </>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="text-center mt-6 pt-4 border-t border-gray-200">
          <p className="text-gray-600 text-sm">
            Already have an admin account?{' '}
            <Link
              to="/admin/login"
              className="text-purple-600 hover:text-purple-800 font-medium transition duration-200"
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* User Portal Link */}
        <div className="text-center mt-4">
          <Link
            to="/user/register"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium transition duration-200"
          >
            ← Need user account?
          </Link>
        </div>

        {/* Email Notification Notice */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800 text-center">
            <strong>Email Confirmation:</strong> After submission, a confirmation email will be sent to the provided email address. 
            Please check your inbox and spam folder.
          </p>
        </div>

        {/* Security Notice */}
        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800 text-center">
            <strong>Note:</strong> Admin accounts require manual approval. 
            You'll be contacted via email once your request is reviewed.
          </p>
        </div>
      </div>
    </div>
  )
}

export default AdminRegister