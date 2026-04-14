'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../context/AuthContext'
import type { CompletedCourse, CourseDifficulty, CurrentCourse, Season, UserProfile } from '../lib/types'
import LogoIcon from '../components/LogoIcon'
import SearchSelect from '../components/SearchSelect'
import { SCHOOLS } from '../lib/schools'
import { MAJORS } from '../lib/majors'

const SEASONS: Season[] = ['Fall', 'Spring', 'Summer', 'Winter']
const YEARS = [1, 2, 3, 4]
const DIFFICULTY_LABELS: Record<CourseDifficulty, string> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
}
const DIFFICULTY_CHIP: Record<CourseDifficulty, string> = {
  easy: 'border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40',
  medium: 'border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40',
  hard: 'border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40',
}

export default function OnboardingPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Step 1
  const [school, setSchool] = useState('')
  const [major, setMajor] = useState('')
  const [currentYear, setCurrentYear] = useState(1)
  const [currentSemester, setCurrentSemester] = useState<Season>('Fall')

  // Step 2
  const [completedInput, setCompletedInput] = useState('')
  const [completedCredits, setCompletedCredits] = useState('')
  const [completedCourses, setCompletedCourses] = useState<CompletedCourse[]>([])

  // Step 3
  const [currentInput, setCurrentInput] = useState('')
  const [currentDifficulty, setCurrentDifficulty] = useState<CourseDifficulty>('medium')
  const [currentCourses, setCurrentCourses] = useState<CurrentCourse[]>([])

  useEffect(() => {
    if (!loading && !user) router.replace('/login')
  }, [user, loading, router])

  function addCompleted() {
    const t = completedInput.trim().toUpperCase()
    const credits = Number(completedCredits)
    if (!t || completedCourses.some((course) => course.name === t)) return
    if (!Number.isFinite(credits) || credits <= 0 || credits > 12) {
      setError('Credit hours must be a number between 0 and 12.')
      return
    }
    setCompletedCourses(p => [...p, { name: t, credits }])
    setCompletedInput('')
    setCompletedCredits('')
    setError('')
  }

  function addCurrent() {
    const t = currentInput.trim().toUpperCase()
    if (!t || currentCourses.some(c => c.name === t)) return
    setCurrentCourses(p => [...p, { name: t, difficulty: currentDifficulty }])
    setCurrentInput('')
  }

  function removeCurrent(name: string) {
    setCurrentCourses(p => p.filter(c => c.name !== name))
  }

  async function handleFinish() {
    if (!user) return
    setSaving(true)
    setError('')
    try {
      const profile: UserProfile = {
        school: school.trim(),
        major: major.trim(),
        currentYear,
        currentSemester,
        completedCourses,
        currentCourses,
      }
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      })
      if (!res.ok) throw new Error('Failed to save.')
      router.replace('/')
    } catch {
      setError('Something went wrong. Try again.')
      setSaving(false)
    }
  }

  if (loading || !user) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-10">
          <LogoIcon size={28} />
          <span className="text-base font-bold tracking-[-0.02em] text-slate-900 dark:text-white">
            Campus<span className="bg-[linear-gradient(135deg,#1f6feb,#0f766e)] bg-clip-text text-transparent">Flow</span>
          </span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-8">
          {[1, 2, 3].map(n => (
            <div key={n} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                n < step ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' :
                n === step ? 'bg-[linear-gradient(135deg,#1f6feb,#0f766e)] text-white' :
                'bg-slate-100 dark:bg-slate-800 text-slate-400'
              }`}>{n}</div>
              {n < 3 && <div className={`h-px w-10 ${n < step ? 'bg-slate-900 dark:bg-white' : 'bg-slate-200 dark:bg-slate-700'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1 — Academic info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">Academic info</h1>
              <p className="mt-1 text-sm text-slate-400">Tell us where you&apos;re studying and what you&apos;re majoring in.</p>
            </div>
            <div className="space-y-3">
              <SearchSelect
                value={school}
                onChange={setSchool}
                onSearch={q => SCHOOLS.filter(s => s.toLowerCase().includes(q.toLowerCase())).slice(0, 8)}
                placeholder="School (e.g. Iowa State University)"
              />
              <SearchSelect
                value={major}
                onChange={setMajor}
                onSearch={q => MAJORS.filter(m => m.toLowerCase().includes(q.toLowerCase())).slice(0, 8)}
                placeholder="Major (e.g. Computer Science)"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={currentYear}
                  onChange={e => setCurrentYear(Number(e.target.value))}
                  className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {YEARS.map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
                <select
                  value={currentSemester}
                  onChange={e => setCurrentSemester(e.target.value as Season)}
                  className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SEASONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
            <button
              onClick={() => {
                if (!school.trim() || !major.trim()) { setError('School and major are required.'); return }
                setError('')
                setStep(2)
              }}
              className="w-full rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 text-sm font-medium"
            >
              Continue
            </button>
            {error && <p className="text-xs text-rose-500">{error}</p>}
          </div>
        )}

        {/* Step 2 — Completed courses */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">Completed courses</h1>
              <p className="mt-1 text-sm text-slate-400">Add completed classes with their credit hours. Skip if none yet.</p>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={completedInput}
                  onChange={e => setCompletedInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCompleted() } }}
                  placeholder="e.g. COM S 227"
                  className="flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="number"
                  min="0"
                  max="12"
                  step="1"
                  value={completedCredits}
                  onChange={e => setCompletedCredits(e.target.value)}
                  placeholder="Credits"
                  className="w-28 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={addCompleted}
                  className="rounded-md border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Add
                </button>
              </div>
              {completedCourses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {completedCourses.map(c => (
                    <span key={c.name} className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {c.name}
                      <span className="text-slate-400 dark:text-slate-500">{c.credits} cr</span>
                      <button type="button" onClick={() => setCompletedCourses(p => p.filter(x => x.name !== c.name))} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors leading-none">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 rounded-md border border-slate-200 dark:border-slate-700 py-3 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                Back
              </button>
              <button onClick={() => setStep(3)} className="flex-1 rounded-md bg-slate-900 dark:bg-white text-white dark:text-slate-900 py-3 text-sm font-medium">
                Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3 — Current courses + difficulty */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">Current courses</h1>
              <p className="mt-1 text-sm text-slate-400">Courses you&apos;re taking this semester. Rate the difficulty so AI can prioritize your workload.</p>
            </div>
            <div className="space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentInput}
                  onChange={e => setCurrentInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCurrent() } }}
                  placeholder="e.g. COM S 311"
                  className="flex-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <button
                  type="button"
                  onClick={addCurrent}
                  className="rounded-md border border-slate-200 dark:border-slate-700 px-4 py-3 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  Add
                </button>
              </div>
              {currentCourses.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {currentCourses.map(c => (
                    <span key={c.name} className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 ${DIFFICULTY_CHIP[c.difficulty]}`}>
                      {c.name}
                      <button type="button" onClick={() => removeCurrent(c.name)} className="text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors leading-none ml-0.5">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>
            {error && <p className="text-xs text-rose-500">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="flex-1 rounded-md border border-slate-200 dark:border-slate-700 py-3 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800">
                Back
              </button>
              <button
                onClick={handleFinish}
                disabled={saving}
                className="flex-1 rounded-md bg-[linear-gradient(135deg,#1f6feb,#0f766e)] text-white py-3 text-sm font-medium disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Get started'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
