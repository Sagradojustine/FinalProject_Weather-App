import React, { createContext, useContext, useState, useCallback } from 'react'

const AdminAuthContext = createContext(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}

export const AdminAuthProvider = ({ children }) => {
  const [admin, setAdmin] = useState(null)
  const [adminLoading, setAdminLoading] = useState(false)
  const [adminError, setAdminError] = useState(null)

  // Predefined admin credentials (in a real app, this would be from a secure backend)
  const adminCredentials = [
    { email: 'admin@weatherguard.com', password: 'Admin123!', name: 'System Administrator' },
    { email: 'admin@demo.com', password: '123456', name: 'Demo Administrator' },
    { email: 'superadmin@weatherguard.com', password: 'SuperAdmin123!', name: 'Super Administrator' }
  ]

  const adminSignIn = async (email, password) => {
    try {
      setAdminLoading(true)
      setAdminError(null)

      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Check credentials against predefined admin accounts
      const adminAccount = adminCredentials.find(
        cred => cred.email === email && cred.password === password
      )

      if (adminAccount) {
        const adminUser = {
          id: `admin-${Date.now()}`,
          email: adminAccount.email,
          name: adminAccount.name,
          role: 'admin',
          permissions: ['manage_users', 'view_reports', 'manage_alerts', 'system_config']
        }
        
        setAdmin(adminUser)
        localStorage.setItem('adminAuth', JSON.stringify(adminUser))
        return { success: true, error: null }
      } else {
        const error = new Error('Invalid admin credentials')
        setAdminError(error.message)
        return { success: false, error }
      }
    } catch (error) {
      setAdminError(error.message)
      return { success: false, error }
    } finally {
      setAdminLoading(false)
    }
  }

  const adminSignOut = async () => {
    setAdmin(null)
    localStorage.removeItem('adminAuth')
    return { success: true }
  }

  // Use useCallback to memoize the function and prevent unnecessary re-renders
  const checkAdminAuth = useCallback(() => {
    // Check if admin is authenticated on app load
    const storedAdmin = localStorage.getItem('adminAuth')
    if (storedAdmin) {
      try {
        const adminData = JSON.parse(storedAdmin)
        setAdmin(adminData)
      } catch (error) {
        console.error('Error parsing stored admin auth:', error)
        localStorage.removeItem('adminAuth')
      }
    }
  }, []) // Empty dependency array since we don't use any external variables

  const isAuthenticated = useCallback(() => {
    return admin !== null
  }, [admin])

  const hasPermission = useCallback((permission) => {
    return admin?.permissions?.includes(permission) || false
  }, [admin])

  const value = {
    admin,
    adminSignIn,
    adminSignOut,
    isAuthenticated,
    hasPermission,
    adminLoading,
    adminError,
    setAdminError,
    checkAdminAuth
  }

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}