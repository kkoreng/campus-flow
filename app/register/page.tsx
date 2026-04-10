'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
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

export default function RegisterPage() {
  const { user, loading, register } = useAuth()
  const { theme, toggle } = useTheme()
  const router = useRouter()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
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
    const normalizedName = name.trim()
    const normalizedEmail = email.trim().toLowerCase()

    if (!normalizedName || !normalizedEmail || !password) {
      setError('Name, email, and password are required.')
      return
    }
    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    setSubmitting(true)
    const result = await register({
      name: normalizedName,
      email: normalizedEmail,
      password,
    })
    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    router.replace('/onboarding')
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
        <section className="glass-panel-strong rounded-[32px] p-8 sm:p-10">
          <div className="mb-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Create Account</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-slate-950 dark:text-white">Start with the basics</h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Name, email, and password first. The rest happens in-product.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alex Johnson"
                autoComplete="name"
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2 space-y-1.5">
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
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 uppercase tracking-wide">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-2xl px-4 py-3">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-2xl bg-[linear-gradient(135deg,#1f6feb,#0f766e)] hover:opacity-95 disabled:opacity-60 text-white text-sm font-medium py-3 transition-colors"
          >
            {submitting ? 'Creating account…' : 'Create Account'}
          </button>
          </form>

          <div className="mt-6 flex items-center justify-between gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span>Already have an account?</span>
            <Link
              href="/login"
              onClick={(event) => {
                event.preventDefault()
                navigateWithSlide('/login', 'back')
              }}
              className="font-medium text-blue-600 dark:text-blue-400 hover:underline"
            >
              Sign in
            </Link>
          </div>
        </section>

        <section className="glass-panel rounded-[32px] p-8 sm:p-10 flex flex-col justify-between min-h-[620px]">
          <div>
            <div className="inline-flex items-center gap-2.5">
              <LogoIcon size={32} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">CampusFlow</span>
            </div>
            <h1 className="mt-6 text-4xl sm:text-5xl font-semibold tracking-[-0.05em] text-slate-950 dark:text-white">
              Build an academic command center that actually feels usable.
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate-600 dark:text-slate-400">
              Create an account first, then complete school, major, roadmap, and Canvas settings directly inside the dashboard.
            </p>
          </div>

          <div className="rounded-[28px] bg-[linear-gradient(135deg,rgba(31,111,235,0.14),rgba(15,118,110,0.10))] border border-slate-200 dark:border-slate-800 p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">After Signup</p>
            <div className="mt-4 space-y-3 text-sm text-slate-700 dark:text-slate-300">
              <p>1. Enter school, major, and semester inside the dashboard.</p>
              <p>2. Add your Canvas ICS link when you want automatic assignment sync.</p>
              <p>3. Generate an AI roadmap once your profile is ready.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
