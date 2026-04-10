'use client'

import { useState } from 'react'
import type { CourseDifficulty, CurrentCourse, Season, UserProfile } from '../lib/types'
import SearchSelect from './SearchSelect'
import { SCHOOLS } from '../lib/schools'
import { MAJORS } from '../lib/majors'

const SEASONS: Season[] = ['Fall', 'Spring', 'Summer']
const YEARS = [1, 2, 3, 4]
const DIFFICULTY_LABELS: Record<CourseDifficulty, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' }

const DIFFICULTY_CHIP: Record<CourseDifficulty, string> = {
  easy: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300',
  medium: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300',
  hard: 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300',
}

interface Props {
  userId: string
  profile: UserProfile
  icsUrl: string
  onProfileChange: (profile: UserProfile) => void
  onIcsChange: (icsUrl: string) => void
}

export default function ProfileSettingsPanel({
  userId,
  profile,
  icsUrl,
  onProfileChange,
  onIcsChange,
}: Props) {
  const [editing, setEditing] = useState(false)

  // Edit form state
  const [school, setSchool] = useState(profile.school)
  const [major, setMajor] = useState(profile.major)
  const [currentYear, setCurrentYear] = useState(profile.currentYear)
  const [currentSemester, setCurrentSemester] = useState<Season>(profile.currentSemester)
  const [ics, setIcs] = useState(icsUrl)
  const [courseInput, setCourseInput] = useState('')
  const [completedCourses, setCompletedCourses] = useState<string[]>(profile.completedCourses)
  const [currentCourseInput, setCurrentCourseInput] = useState('')
  const [currentDifficulty, setCurrentDifficulty] = useState<CourseDifficulty>('medium')
  const [currentCourses, setCurrentCourses] = useState<CurrentCourse[]>(profile.currentCourses ?? [])
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  function openEdit() {
    setSchool(profile.school)
    setMajor(profile.major)
    setCurrentYear(profile.currentYear)
    setCurrentSemester(profile.currentSemester)
    setIcs(icsUrl)
    setCompletedCourses(profile.completedCourses)
    setCurrentCourses(profile.currentCourses ?? [])
    setError('')
    setStatus('')
    setEditing(true)
  }

  function addCourse() {
    const trimmed = courseInput.trim()
    if (!trimmed || completedCourses.includes(trimmed)) return
    setCompletedCourses((prev) => [...prev, trimmed])
    setCourseInput('')
  }

  function addCurrentCourse() {
    const t = currentCourseInput.trim().toUpperCase()
    if (!t || currentCourses.some(c => c.name === t)) return
    setCurrentCourses(p => [...p, { name: t, difficulty: currentDifficulty }])
    setCurrentCourseInput('')
  }

  async function handleSave() {
    if (!school.trim() || !major.trim()) {
      setError('School and major are required.')
      return
    }
    if (ics.trim() && !/^https?:\/\//i.test(ics.trim())) {
      setError('ICS URL must start with http:// or https://.')
      return
    }

    setError('')
    setSaving(true)
    try {
      const nextProfile: UserProfile = {
        ...profile,
        school: school.trim(),
        major: major.trim(),
        currentYear,
        currentSemester,
        completedCourses,
        currentCourses,
      }

      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: nextProfile, icsUrl: ics }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save settings.')
      }

      const data = await res.json()
      onProfileChange(data.user.profile)
      onIcsChange(data.user.icsUrl ?? '')
      setStatus('Saved.')
      setEditing(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  // ── View mode ──
  if (!editing) {
    const hasCanvas = !!icsUrl.trim()
    return (
      <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/55 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Profile</p>
            <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">{profile.major || '—'}</h2>
            <p className="mt-0.5 text-sm text-slate-400 dark:text-slate-500">{profile.school || '—'}</p>
          </div>
          <button
            onClick={openEdit}
            className="shrink-0 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Edit
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-5 grid grid-cols-3 gap-3">
          <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Term</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{profile.currentSemester} Y{profile.currentYear}</p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Courses done</p>
            <p className="mt-1 text-sm font-semibold text-slate-800 dark:text-slate-200">{profile.completedCourses.length}</p>
          </div>
          <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">Canvas ICS</p>
            <p className={`mt-1 text-sm font-semibold ${hasCanvas ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-slate-600'}`}>
              {hasCanvas ? 'Connected' : 'Not set'}
            </p>
          </div>
        </div>

        {/* Current courses */}
        {profile.currentCourses && profile.currentCourses.length > 0 && (
          <div className="mt-5 border-t border-slate-100 dark:border-slate-800 pt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-3">This semester</p>
            <div className="flex flex-wrap gap-2">
              {profile.currentCourses.map(c => (
                <span key={c.name} className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium ${DIFFICULTY_CHIP[c.difficulty]}`}>
                  {c.name}
                  <span className="ml-1.5 opacity-50">{c.difficulty}</span>
                </span>
              ))}
            </div>
          </div>
        )}

      </div>
    )
  }

  // ── Edit mode ──
  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/55 sm:p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Edit Profile</p>
          <h2 className="mt-1 text-xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Settings</h2>
        </div>
        <button
          onClick={() => { setEditing(false); setError('') }}
          className="shrink-0 rounded-md border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <SearchSelect
          value={school}
          onChange={v => { setSchool(v); setError(''); setStatus('') }}
          onSearch={q => SCHOOLS.filter(s => s.toLowerCase().includes(q.toLowerCase())).slice(0, 8)}
          placeholder="School (e.g. Iowa State University)"
        />
        <SearchSelect
          value={major}
          onChange={v => { setMajor(v); setError(''); setStatus('') }}
          onSearch={q => MAJORS.filter(m => m.toLowerCase().includes(q.toLowerCase())).slice(0, 8)}
          placeholder="Major (e.g. Computer Science)"
        />
        <select
          value={currentYear}
          onChange={(e) => { setCurrentYear(Number(e.target.value)); setError(''); setStatus('') }}
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <select
          value={currentSemester}
          onChange={(e) => { setCurrentSemester(e.target.value as Season); setError(''); setStatus('') }}
          className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {SEASONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mt-3">
        <input
          type="url"
          value={ics}
          onChange={(e) => { setIcs(e.target.value); setError(''); setStatus('') }}
          placeholder="Canvas ICS URL (optional)"
          className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 font-mono text-sm text-slate-900 dark:text-slate-100 placeholder:font-sans placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Completed Courses</p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={courseInput}
            onChange={(e) => setCourseInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCourse() } }}
            placeholder="e.g. COM S 227"
            className="min-w-0 flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addCourse}
            className="rounded-md border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Add
          </button>
        </div>
        {completedCourses.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {completedCourses.map((course) => (
              <span key={course} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300">
                {course}
                <button type="button" onClick={() => setCompletedCourses(p => p.filter(c => c !== course))} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors leading-none">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Current Courses</p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={currentCourseInput}
            onChange={e => setCurrentCourseInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCurrentCourse() } }}
            placeholder="e.g. COM S 311"
            className="min-w-0 flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={currentDifficulty}
            onChange={e => setCurrentDifficulty(e.target.value as CourseDifficulty)}
            className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {(Object.keys(DIFFICULTY_LABELS) as CourseDifficulty[]).map(d => (
              <option key={d} value={d}>{DIFFICULTY_LABELS[d]}</option>
            ))}
          </select>
          <button type="button" onClick={addCurrentCourse} className="rounded-md border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800">
            Add
          </button>
        </div>
        {currentCourses.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {currentCourses.map(c => (
              <span key={c.name} className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium ${DIFFICULTY_CHIP[c.difficulty]}`}>
                {c.name}
                <button type="button" onClick={() => setCurrentCourses(p => p.filter(x => x.name !== c.name))} className="opacity-50 hover:opacity-100 hover:text-rose-500 transition-colors leading-none ml-0.5">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {(error || status) && (
        <div className="mt-4">
          {error && <p className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
          {status && <p className="text-sm text-emerald-600 dark:text-emerald-400">{status}</p>}
        </div>
      )}

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-md bg-slate-900 dark:bg-white px-5 py-3 text-sm font-medium text-white dark:text-slate-900 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={() => { setEditing(false); setError('') }}
          className="rounded-md border border-slate-200 dark:border-slate-700 px-5 py-3 text-sm font-medium text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
