export interface User {
  id: string
  name: string
  email: string
}

const SESSION_KEY = 'campusflow-session'
export const FLASH_KEY = 'campusflow-flash'

export async function loginUser(email: string, password: string): Promise<{ user: User } | { error: string }> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { error: data.error ?? 'Invalid email or password.' }
    }

    const data = await res.json()
    localStorage.setItem(SESSION_KEY, JSON.stringify(data.user))
    return { user: data.user }
  } catch {
    return { error: 'Failed to reach the server.' }
  }
}

export async function registerUser(input: {
  name: string
  email: string
  password: string
  school?: string
  major?: string
  icsUrl?: string
}): Promise<{ user: User } | { error: string }> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      return { error: data.error ?? 'Failed to create account.' }
    }

    const data = await res.json()
    localStorage.setItem(SESSION_KEY, JSON.stringify(data.user))

    return {
      user: data.user,
    }
  } catch {
    return { error: 'Failed to reach the server.' }
  }
}

export function logoutUser() {
  localStorage.removeItem(SESSION_KEY)
}

export function getSession(): User | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setFlashMessage(message: string) {
  sessionStorage.setItem(FLASH_KEY, message)
}

export function consumeFlashMessage() {
  const message = sessionStorage.getItem(FLASH_KEY)
  if (!message) return null
  sessionStorage.removeItem(FLASH_KEY)
  return message
}
