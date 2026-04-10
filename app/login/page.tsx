'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { setFlashMessage } from '../lib/auth'
import LogoIcon from '../components/LogoIcon'

type AuthSlideDirection = 'forward' | 'back'

const AUTH_TRANSITION_KEY = 'campusflow-auth-transition'

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function SunIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="12" cy="12" r="5" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
    </svg>
  )
}

export default function LoginPage() {
  const { user, loading, login } = useAuth()
  const { theme, toggle } = useTheme()
  const router = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [transitionState, setTransitionState] = useState<'idle' | 'enter-forward' | 'enter-back' | 'exit-forward' | 'exit-back'>(() => {
    if (typeof window === 'undefined') return 'idle'
    const pending = sessionStorage.getItem(AUTH_TRANSITION_KEY)
    if (pending === 'forward') {
      sessionStorage.removeItem(AUTH_TRANSITION_KEY)
      return 'enter-forward'
    }
    if (pending === 'back') {
      sessionStorage.removeItem(AUTH_TRANSITION_KEY)
      return 'enter-back'
    }
    return 'idle'
  })

  useEffect(() => {
    if (!loading && user) router.replace('/')
  }, [user, loading, router])

  useEffect(() => {
    if (transitionState !== 'enter-forward' && transitionState !== 'enter-back') return
    const timeout = window.setTimeout(() => setTransitionState('idle'), 420)
    return () => window.clearTimeout(timeout)
  }, [transitionState])

  function navigateWithSlide(href: string, direction: AuthSlideDirection) {
    sessionStorage.setItem(AUTH_TRANSITION_KEY, direction)
    setTransitionState(direction === 'forward' ? 'exit-forward' : 'exit-back')
    window.setTimeout(() => {
      router.push(href)
    }, 180)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedEmail || !password) {
      setError('Enter both email and password.')
      return
    }
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }

    setSubmitting(true)
    const result = await login(normalizedEmail, password)
    setSubmitting(false)
    if (result.error) { setError(result.error); return }
    setFlashMessage('Signed in successfully.')
    router.replace('/')
  }

  if (loading) return null

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <button
        onClick={toggle}
        className="fixed top-4 right-4 h-10 w-10 flex items-center justify-center rounded-2xl glass-panel text-slate-500 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
      </button>

      <div
        className={`auth-stage w-full max-w-5xl grid gap-5 lg:grid-cols-[1.05fr_0.95fr] ${
          transitionState === 'enter-forward'
            ? 'auth-enter-from-right'
            : transitionState === 'enter-back'
              ? 'auth-enter-from-left'
              : transitionState === 'exit-forward'
                ? 'auth-exit-to-left'
                : transitionState === 'exit-back'
                  ? 'auth-exit-to-right'
                  : ''
        }`}
      >
        <section className="glass-panel rounded-[32px] p-8 sm:p-10 flex flex-col justify-between min-h-[560px]">
          <div>
            <div className="inline-flex items-center gap-2.5">
              <LogoIcon size={32} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">CampusFlow</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white">
              Run your academic life from one place.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-400">
              Track deadlines, sync Canvas calendars, and generate a semester-by-semester roadmap without juggling multiple tools.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[24px] bg-white/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">What You Get</p>
              <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">Roadmap + deadlines</p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Academic planning, assignment tracking, and event management in one workflow.</p>
            </div>
            <div className="rounded-[24px] bg-[linear-gradient(135deg,rgba(31,111,235,0.14),rgba(15,118,110,0.10))] border border-slate-200 dark:border-slate-800 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Demo Access</p>
              <p className="mt-3 text-lg font-semibold text-slate-900 dark:text-white">alex@iastate.edu</p>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">Password: <span className="font-mono">password123</span></p>
            </div>
          </div>
        </section>

        <section className="glass-panel-strong rounded-[32px] p-8 sm:p-10">
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Sign In</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Welcome back</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Use your account to continue into the dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-2xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-[linear-gradient(135deg,#1f6feb,#0f766e)] disabled:opacity-60 text-white text-sm font-medium py-3 transition-colors"
          >
            {submitting ? 'Signing in…' : 'Sign In'}
          </button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span>No account yet?</span>
            <Link
              href="/register"
              onClick={(event) => {
                event.preventDefault()
                navigateWithSlide('/register', 'forward')
              }}
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create one
            </Link>
          </div>
        </section>
      </div>
    </div>
  )
}
