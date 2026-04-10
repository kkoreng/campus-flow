'use client'

import type { ReactElement } from 'react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'
import { consumeFlashMessage } from '../lib/auth'
import type { UserProfile } from '../lib/types'
import OverviewPanel from './OverviewPanel'
import AssignmentPanel from './AssignmentPanel'
import EventPanel from './EventPanel'
import ProfileSettingsPanel from './ProfileSettingsPanel'
import InsightsPanel from './InsightsPanel'
import LogoIcon from './LogoIcon'

type Tab = 'dashboard' | 'assignments' | 'events' | 'insights' | 'settings'

const TABS: { id: Tab; label: string; icon: ReactElement }[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10.5L12 3l9 7.5" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 9.5V20h14V9.5" />
      </svg>
    ),
  },
  {
    id: 'assignments',
    label: 'Assignments',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h12M8 12h12M8 18h12" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
      </svg>
    ),
  },
  {
    id: 'events',
    label: 'Events',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path strokeLinecap="round" d="M16 3v4M8 3v4M3 10h18" />
      </svg>
    ),
  },
  {
    id: 'insights',
    label: 'Insights',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5A3.5 3.5 0 1012 8.5a3.5 3.5 0 000 7z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.7 1.7 0 00.34 1.87l.06.06a2 2 0 01-2.83 2.83l-.06-.06A1.7 1.7 0 0015 19.4a1.7 1.7 0 00-1 .6 1.7 1.7 0 00-.4 1.08V21a2 2 0 11-4 0v-.08A1.7 1.7 0 008 19.4a1.7 1.7 0 00-1-.6 1.7 1.7 0 00-1.87.34l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.7 1.7 0 004.6 15a1.7 1.7 0 00-.6-1 1.7 1.7 0 00-1.08-.4H2.9a2 2 0 010-4H3a1.7 1.7 0 001.6-1.4 1.7 1.7 0 00-.34-1.87l-.06-.06a2 2 0 112.83-2.83l.06.06A1.7 1.7 0 008 4.6a1.7 1.7 0 001-.6 1.7 1.7 0 00.4-1.08V2.9a2 2 0 114 0V3a1.7 1.7 0 001.4 1.6 1.7 1.7 0 001.87-.34l.06-.06a2 2 0 112.83 2.83l-.06.06A1.7 1.7 0 0019.4 8a1.7 1.7 0 00.6 1 1.7 1.7 0 001.08.4h.08a2 2 0 110 4H21a1.7 1.7 0 00-1.6 1.4z" />
      </svg>
    ),
  },
]

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1f6feb,#0f766e)] text-xs font-semibold text-white shadow-lg shadow-blue-500/20">
      {initials}
    </div>
  )
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

function UserNoteCard({ userId, initialNote, onSave }: { userId: string; initialNote: string; onSave: (note: string) => void }) {
  const [note, setNote] = useState(initialNote)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  async function handleSave() {
    setSaving(true)
    setStatus('')
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: { userNote: note.trim() || undefined } }),
      })
      if (!res.ok) throw new Error()
      const data = await res.json()
      onSave(data.user.profile?.userNote ?? '')
      setStatus('Saved.')
    } catch {
      setStatus('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/55 sm:p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">User Note</p>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
        Tell the AI about yourself — study habits, goals, constraints, strengths. Used for personalized recommendations.
      </p>
      <textarea
        value={note}
        onChange={e => { setNote(e.target.value); setStatus('') }}
        placeholder="e.g. I tend to procrastinate on writing assignments. I work best in the mornings. I'm aiming for grad school in ML. I have part-time work on weekends."
        rows={5}
        className="mt-3 w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-slate-900 dark:bg-white px-4 py-2 text-sm font-medium text-white dark:text-slate-900 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        {status && <p className={`text-xs ${status === 'Saved.' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>{status}</p>}
      </div>
    </div>
  )
}

function getInitialFlashMessage() {
  if (typeof window === 'undefined') return null
  return consumeFlashMessage()
}

export default function Dashboard() {
  const { user, loading, logout } = useAuth()
  const { theme, toggle } = useTheme()
  const router = useRouter()

  const [tab, setTab] = useState<Tab>('dashboard')
  const [profileVersion, setProfileVersion] = useState(0)
  const [analysisVersion, setAnalysisVersion] = useState(0)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [icsUrl, setIcsUrl] = useState('')
  const [flashMessage, setFlashMessage] = useState<string | null>(getInitialFlashMessage)

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  useEffect(() => {
    const userId = user?.id
    if (!userId) return

    let cancelled = false

    async function load() {
      const res = await fetch(`/api/users/${userId}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (cancelled) return
      setProfile(data.user.profile ?? {
        school: '', major: '', currentYear: 1,
        currentSemester: 'Fall', completedCourses: [], currentCourses: [],
      })
      setIcsUrl(data.user.icsUrl ?? '')
    }

    void load()
    return () => { cancelled = true }
  }, [user?.id, profileVersion])

  if (loading || !user || !profile) return null

  const pendingSetup = !profile.school.trim() || !profile.major.trim()
  const title = profile.major.trim() || 'Set up your workspace'
  const subtitle = profile.school.trim() || 'Add your school and major to get started.'

  const settingsPanel = (
    <ProfileSettingsPanel
      key={`${user.id}-${profileVersion}`}
      userId={user.id}
      profile={profile}
      icsUrl={icsUrl}
      onProfileChange={(next) => { setProfile(next); setProfileVersion((v) => v + 1) }}
      onIcsChange={(next) => { setIcsUrl(next); setProfileVersion((v) => v + 1) }}
    />
  )

  return (
    <div className="dashboard-shell text-slate-900 dark:text-slate-100">
      {/* ── Sidebar ── */}
      <aside className="dashboard-rail">
        <div className="dashboard-rail-inner">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2 pb-4">
            <LogoIcon size={30} />
            <p className="text-[17px] font-bold tracking-[-0.03em] text-slate-900 dark:text-white">
              Campus<span className="bg-[linear-gradient(135deg,#1f6feb,#0f766e)] bg-clip-text text-transparent">Flow</span>
            </p>
          </div>

          <nav className="dashboard-rail-nav">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  tab === t.id
                    ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white font-medium'
                    : 'text-slate-500 hover:bg-slate-100/70 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {t.icon}
                  {t.label}
                </div>
              </button>
            ))}
          </nav>

          <div className="dashboard-rail-meta">
            <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{user.name}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400 dark:text-slate-500">{user.email}</p>
            <p className="mt-2 text-xs text-slate-400 dark:text-slate-500">
              {pendingSetup ? 'Setup needed' : `${profile.completedCourses.length} courses logged`}
            </p>
          </div>
        </div>
      </aside>

      {/* ── Content ── */}
      <div className="dashboard-content">
        {/* Top bar */}
        <header className="dashboard-topbar">
          <h1 className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">
            {TABS.find(t => t.id === tab)?.label ?? 'Dashboard'}
          </h1>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={toggle}
              className="h-8 w-8 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-800 transition-colors"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              onClick={() => { logout(); router.replace('/login') }}
              className="h-8 px-3 rounded-md border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="dashboard-main">
          {/* Flash message */}
          {flashMessage && (
            <div className="mb-6 flex items-center justify-between gap-4 border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 rounded-md">
              <p className="text-sm text-emerald-700 dark:text-emerald-300">{flashMessage}</p>
              <button onClick={() => setFlashMessage(null)} className="text-xs text-emerald-500 hover:underline shrink-0">
                Dismiss
              </button>
            </div>
          )}

          {/* Dashboard tab */}
          {tab === 'dashboard' && (
            <div className="space-y-8">
              {pendingSetup ? (
                <div className="grid gap-8 xl:grid-cols-3">
                  <div className="xl:col-span-2">{settingsPanel}</div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 mb-4">Getting started</p>
                    <div className="space-y-4">
                      {[
                        { color: 'bg-sky-500', text: 'Save academic info' },
                        { color: 'bg-emerald-500', text: 'Add completed courses' },
                        { color: 'bg-violet-500', text: 'Sync Canvas or add assignments' },
                      ].map((step, i) => (
                        <div key={step.text} className="flex items-center gap-3">
                          <div className={`w-5 h-5 rounded-full ${step.color} flex items-center justify-center shrink-0`}>
                            <span className="text-[10px] font-bold text-white">{i + 1}</span>
                          </div>
                          <p className="text-sm text-slate-600 dark:text-slate-400">{step.text}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8">

                  {/* User info header */}
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-[linear-gradient(135deg,#1f6feb,#0f766e)] flex items-center justify-center shrink-0">
                      <span className="text-lg font-bold text-white">{user.name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="text-lg font-semibold tracking-[-0.02em] text-slate-900 dark:text-white">{user.name}</p>
                      <p className="text-sm text-slate-400 dark:text-slate-500">{profile.major} · {profile.school}</p>
                    </div>
                  </div>

                  <div className="h-px bg-slate-100 dark:bg-slate-800" />

                  <OverviewPanel userId={user.id} profile={profile} refreshTrigger={analysisVersion} onNavigate={(t) => setTab(t as Tab)} />
                </div>
              )}
            </div>
          )}

          {tab === 'assignments' && <AssignmentPanel userId={user.id} onAssignmentsChange={() => setAnalysisVersion(v => v + 1)} />}
          {tab === 'events' && <EventPanel userId={user.id} />}
          {tab === 'insights' && <InsightsPanel userId={user.id} profile={profile} />}

          {tab === 'settings' && (
            <div className="space-y-6 max-w-2xl">
              {settingsPanel}
              <UserNoteCard
                userId={user.id}
                initialNote={profile.userNote ?? ''}
                onSave={(note) => setProfile(p => p ? { ...p, userNote: note || undefined } : p)}
              />
              <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/55 sm:p-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400 mb-4">Account</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{user.name}</p>
                <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">{user.email}</p>
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={toggle}
                    className="w-full text-left px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Toggle theme — {theme === 'dark' ? 'Dark' : 'Light'}
                  </button>
                  <button
                    onClick={() => { logout(); router.replace('/login') }}
                    className="w-full text-left px-3 py-2 rounded-md border border-slate-200 dark:border-slate-700 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
