'use client'

import { useState } from 'react'
import type { Season, UserProfile } from '../lib/types'

const SEASONS: Season[] = ['Fall', 'Spring', 'Summer']
const YEARS = [1, 2, 3, 4]

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
  const [school, setSchool] = useState(profile.school)
  const [major, setMajor] = useState(profile.major)
  const [currentYear, setCurrentYear] = useState(profile.currentYear)
  const [currentSemester, setCurrentSemester] = useState<Season>(profile.currentSemester)
  const [ics, setIcs] = useState(icsUrl)
  const [courseInput, setCourseInput] = useState('')
  const [completedCourses, setCompletedCourses] = useState<string[]>(profile.completedCourses)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  function addCourse() {
    const trimmed = courseInput.trim()
    if (!trimmed || completedCourses.includes(trimmed)) return
    setCompletedCourses((prev) => [...prev, trimmed])
    setCourseInput('')
  }

  function removeCourse(course: string) {
    setCompletedCourses((prev) => prev.filter((c) => c !== course))
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
      setStatus('Settings saved.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_14px_36px_rgba(15,23,42,0.05)] dark:border-slate-800 dark:bg-slate-950/55 sm:p-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Academic Info</p>
        <h2 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-950 dark:text-white">Profile Setup</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          This info is used for AI analysis of your academic progress and planning.
        </p>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <input
          type="text"
          value={school}
          onChange={(e) => { setSchool(e.target.value); setError(''); setStatus('') }}
          placeholder="School (e.g. Iowa State University)"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900/40"
        />
        <input
          type="text"
          value={major}
          onChange={(e) => { setMajor(e.target.value); setError(''); setStatus('') }}
          placeholder="Major (e.g. Computer Science)"
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900/40"
        />
        <select
          value={currentYear}
          onChange={(e) => { setCurrentYear(Number(e.target.value)); setError(''); setStatus('') }}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {YEARS.map((y) => <option key={y} value={y}>Year {y}</option>)}
        </select>
        <select
          value={currentSemester}
          onChange={(e) => { setCurrentSemester(e.target.value as Season); setError(''); setStatus('') }}
          className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-900 outline-none placeholder:font-sans placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900/40"
        />
      </div>

      <div className="mt-5 border-t border-slate-200 pt-5 dark:border-slate-800">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Completed Courses</p>
        <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Used for AI analysis of your academic progress.</p>
        <div className="mt-3 flex gap-2">
          <input
            type="text"
            value={courseInput}
            onChange={(e) => setCourseInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCourse() } }}
            placeholder="e.g. COM S 227"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-900/40"
          />
          <button
            type="button"
            onClick={addCourse}
            className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white dark:bg-white dark:text-slate-900"
          >
            Add
          </button>
        </div>
        {completedCourses.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {completedCourses.map((course) => (
              <button
                key={course}
                type="button"
                onClick={() => removeCourse(course)}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-rose-800 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
              >
                {course} ×
              </button>
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

      <div className="mt-5">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded-xl bg-[linear-gradient(135deg,#111827,#1d4ed8)] px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
