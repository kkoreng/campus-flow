'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { User, getSession, loginUser, logoutUser, registerUser } from '../lib/auth'

interface AuthContextValue {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ error?: string }>
  register: (input: {
    name: string
    email: string
    password: string
    school?: string
    major?: string
    icsUrl?: string
  }) => Promise<{ error?: string }>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => getSession())
  const loading = false

  async function login(email: string, password: string): Promise<{ error?: string }> {
    const result = await loginUser(email, password)
    if ('error' in result) return { error: result.error }
    setUser(result.user)
    return {}
  }

  async function register(input: {
    name: string
    email: string
    password: string
    school?: string
    major?: string
    icsUrl?: string
  }): Promise<{ error?: string }> {
    const result = await registerUser(input)
    if ('error' in result) return { error: result.error }
    setUser(result.user)
    return {}
  }

  function logout() {
    logoutUser()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
