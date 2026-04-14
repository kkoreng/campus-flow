'use client'

import { useEffect, useRef, useState } from 'react'
import type { Assignment, AssignmentType } from '../lib/types'
import { parseICS } from '../lib/icsParser'

const TYPE_META: Record<AssignmentType, { label: string; cls: string }> = {
  homework: { label: 'HW',      cls: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800' },
  exam:     { label: 'Exam',    cls: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-800' },
  project:  { label: 'Project', cls: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 ring-1 ring-violet-200 dark:ring-violet-800' },
  quiz:     { label: 'Quiz',    cls: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800' },
  lab:      { label: 'Lab',     cls: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800' },
  other:    { label: 'Other',   cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700' },
}

const TYPES: AssignmentType[] = ['homework', 'exam', 'project', 'quiz', 'lab', 'other']

function daysUntil(date: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const due = new Date(date); due.setHours(0, 0, 0, 0)
  return Math.ceil((due.getTime() - today.getTime()) / 86400000)
}

function DueBadge({ dueDate }: { dueDate: string }) {
  const days = daysUntil(dueDate)
  if (days === 0) return <span className="text-[10px] font-semibold text-rose-500">Today</span>
  if (days === 1) return <span className="text-[10px] font-medium text-amber-500">Tomorrow</span>
  if (days > 0) return <span className="text-[10px] text-slate-400 dark:text-slate-500">{days}d left</span>
  return null
}

export default function AssignmentPanel({ userId, onAssignmentsChange }: { userId: string; onAssignmentsChange?: () => void }) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loaded, setLoaded] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all')
  const [autoSyncUrl, setAutoSyncUrl] = useState<string | null>(null)

  // form state
  const [fTitle, setFTitle] = useState('')
  const [fCourse, setFCourse] = useState('')
  const [fDate, setFDate] = useState('')
  const [fTime, setFTime] = useState('')
  const [fType, setFType] = useState<AssignmentType>('homework')
  const [fError, setFError] = useState('')

  // ICS import state
  const [showImport, setShowImport] = useState(false)
  const [icsUrl, setIcsUrl] = useState(() => autoSyncUrl ?? '')
  const [icsStatus, setIcsStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [icsMessage, setIcsMessage] = useState('')
  const icsInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      const res = await fetch(`/api/users/${userId}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (cancelled) return
      setAssignments(data.user.assignments ?? [])
      setAutoSyncUrl(data.user.icsUrl ?? null)
      setLoaded(true)
      setIcsUrl(data.user.icsUrl ?? '')
    }

    void loadUser()

    return () => {
      cancelled = true
    }
  }, [userId])

  function toggle(id: number) {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, completed: !a.completed } : a))
  }

  function remove(id: number) {
    setAssignments(prev => prev.filter(a => a.id !== id))
  }

  async function syncAssignmentsFromIcs(url: string, mode: 'auto' | 'manual') {
    setIcsStatus('loading')
    setIcsMessage('')
    try {
      const res = await fetch(`/api/ics?url=${encodeURIComponent(url.trim())}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? `HTTP ${res.status}`)
      }
      const text = await res.text()
      const parsed = parseICS(text)
      if (parsed.length === 0) throw new Error('No assignments found in this calendar feed')

      // Deduplicate by uid or title+date combo
      let addedCount = 0
      let skippedCount = 0
      setAssignments((prev) => {
        const existingKeys = new Set(prev.map((assignment) => `${assignment.title}|${assignment.dueDate}`))
        const nextItems: Assignment[] = []

        for (const item of parsed) {
          const key = `${item.title}|${item.dueDate}`
          if (existingKeys.has(key)) {
            skippedCount += 1
            continue
          }
          existingKeys.add(key)
          addedCount += 1
          nextItems.push({ ...item, id: Date.now() + nextItems.length })
        }

        return addedCount > 0 ? [...prev, ...nextItems] : prev
      })

      setIcsStatus('done')
      if (addedCount === 0) {
        setIcsMessage(mode === 'auto' ? 'ICS synced. No new assignments were found.' : 'Already up to date - no new assignments found.')
        return
      }
      setIcsMessage(
        `Imported ${addedCount} assignment${addedCount !== 1 ? 's' : ''}${skippedCount > 0 ? ` (${skippedCount} skipped as duplicates)` : ''}.`
      )
    } catch (err) {
      setIcsStatus('error')
      setIcsMessage(err instanceof Error ? err.message : String(err))
    }
  }

  async function importICS(e: React.FormEvent) {
    e.preventDefault()
    if (!icsUrl.trim()) return
    await syncAssignmentsFromIcs(icsUrl, 'manual')
  }

  // Auto-persist whenever assignments change (after initial load)
  useEffect(() => {
    if (!loaded) return
    void fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignments }),
    }).then(() => onAssignmentsChange?.())
  }, [assignments, loaded, userId, onAssignmentsChange])

  useEffect(() => {
    if (!autoSyncUrl) return

    let cancelled = false

    async function runAutoSync() {
      if (cancelled) return
      await syncAssignmentsFromIcs(autoSyncUrl!, 'auto')
    }

    void runAutoSync()

    return () => {
      cancelled = true
    }
  }, [autoSyncUrl, userId])

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!fTitle.trim()) { setFError('Title required'); return }
    if (!fCourse.trim()) { setFError('Course required'); return }
    if (!fDate) { setFError('Due date required'); return }
    setFError('')
    setAssignments(prev => [...prev, {
      id: Date.now(),
      title: fTitle.trim(),
      course: fCourse.trim(),
      dueDate: fDate,
      dueTime: fTime || undefined,
      type: fType,
      completed: false,
    }])
    setFTitle(''); setFCourse(''); setFDate(''); setFTime(''); setFType('homework')
    setShowForm(false)
  }

  const today = new Date().toISOString().split('T')[0]

  // Active = upcoming (due today or later, not completed) + early-completed
  // Past = due date already passed — auto-archived regardless of completed flag
  const activeAssignments = assignments.filter(a => a.dueDate >= today)
  const pastAssignments = assignments.filter(a => a.dueDate < today)

  const filtered = activeAssignments
    .filter(a => filter === 'all' ? true : filter === 'pending' ? !a.completed : a.completed)
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1
      return a.dueDate.localeCompare(b.dueDate)
    })

  const pending = activeAssignments.filter(a => !a.completed).length
  const done = activeAssignments.filter(a => a.completed).length

  const [showPast, setShowPast] = useState(false)

  // Group by date
  const groups: Record<string, Assignment[]> = {}
  for (const a of filtered) {
    if (!groups[a.dueDate]) groups[a.dueDate] = []
    groups[a.dueDate].push(a)
  }

  function formatGroupDate(d: string) {
    const days = daysUntil(d)
    const label = new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    if (days === 0) return `Today — ${label.split(', ').slice(1).join(', ')}`
    if (days === 1) return `Tomorrow — ${label.split(', ').slice(1).join(', ')}`
    return label
  }

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1.5 bg-slate-100/80 dark:bg-slate-800 rounded-2xl p-1">
            {(['all', 'pending', 'done'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  filter === f
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {f === 'all' ? `All (${assignments.length})` : f === 'pending' ? `Pending (${pending})` : `Done (${done})`}
              </button>
            ))}
          </div>
          <button
            onClick={() => { setShowImport(v => !v); setShowForm(false); setIcsStatus('idle'); setIcsMessage('') }}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 px-4 py-3 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-slate-900/70 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Import ICS
          </button>
          <button
            onClick={() => { setShowForm(v => !v); setShowImport(false) }}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-medium text-white dark:bg-white dark:text-slate-950 transition-colors"
          >
            <span className="text-base leading-none">{showForm ? '−' : '+'}</span>
            Add Assignment
          </button>
        </div>
      </div>

      {/* ICS import form */}
      {showImport && (
        <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/50 p-4">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Import from Canvas (ICS feed)</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
            In Canvas → Calendar → Calendar Feed → copy the URL and paste it below.
          </p>
          <form onSubmit={importICS} className="flex gap-2">
            <input
              ref={icsInputRef}
              autoFocus
              type="url"
              value={icsUrl}
              onChange={e => { setIcsUrl(e.target.value); setIcsStatus('idle'); setIcsMessage('') }}
              placeholder="https://canvas.example.com/feeds/calendars/user_..."
              className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-mono text-xs"
            />
            <button
              type="submit"
              disabled={icsStatus === 'loading'}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors shrink-0 flex items-center gap-1.5"
            >
              {icsStatus === 'loading' && (
                <svg className="animate-spin" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
              )}
              {icsStatus === 'loading' ? 'Importing…' : 'Import'}
            </button>
            <button type="button" onClick={() => { setShowImport(false); setIcsStatus('idle'); setIcsMessage('') }} className="px-3 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm transition-colors">
              Cancel
            </button>
          </form>
          {icsMessage && (
            <p className={`mt-2 text-xs ${icsStatus === 'error' ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {icsStatus === 'done' && '✓ '}{icsMessage}
            </p>
          )}
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/50 p-4">
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input
                autoFocus
                type="text"
                value={fTitle}
                onChange={e => { setFTitle(e.target.value); setFError('') }}
                placeholder="Assignment title"
                className="col-span-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="text"
                value={fCourse}
                onChange={e => { setFCourse(e.target.value); setFError('') }}
                placeholder="Course (e.g. COM S 311)"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <select
                value={fType}
                onChange={e => setFType(e.target.value as AssignmentType)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].label} — {t}</option>)}
              </select>
              <input
                type="date"
                value={fDate}
                min={today}
                onChange={e => { setFDate(e.target.value); setFError('') }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="time"
                value={fTime}
                onChange={e => setFTime(e.target.value)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            {fError && <p className="text-xs text-rose-500">{fError}</p>}
            <div className="flex gap-2 pt-1">
              <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors">
                Add
              </button>
              <button type="button" onClick={() => { setShowForm(false); setFError('') }} className="px-3 py-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm transition-colors">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Active assignment groups */}
      {filtered.length === 0 ? (
        <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/50 py-16 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-600">No assignments here</p>
        </div>
      ) : (
        <div className="space-y-3">
          {Object.entries(groups)
            .sort(([a], [b]) => daysUntil(a) - daysUntil(b))
            .map(([date, items]) => (
              <div key={date} className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/50 overflow-hidden">
                <div className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{formatGroupDate(date)}</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-600">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map(a => (
                    <div key={a.id} className="group flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <button
                        onClick={() => toggle(a.id)}
                        className={`rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          a.completed
                            ? 'bg-emerald-500 border-emerald-500 text-white'
                            : 'border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500'
                        }`}
                        style={{ width: 18, height: 18 }}
                      >
                        {a.completed && (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="1.5 6 4.5 9 10.5 3" />
                          </svg>
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${a.completed ? 'line-through text-slate-400 dark:text-slate-600' : 'text-slate-800 dark:text-slate-200'}`}>
                          {a.title}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-slate-400 dark:text-slate-500">{a.course}</span>
                          {a.dueTime && <span className="text-xs text-slate-400 dark:text-slate-600">· {a.dueTime}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {!a.completed && <DueBadge dueDate={a.dueDate} />}
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${TYPE_META[a.type].cls}`}>
                          {TYPE_META[a.type].label}
                        </span>
                        <button
                          onClick={() => remove(a.id)}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Past assignments — auto-archived */}
      {pastAssignments.length > 0 && (
        <div>
          <button
            onClick={() => setShowPast(v => !v)}
            className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${showPast ? 'rotate-90' : ''}`}>
              <path d="M9 18l6-6-6-6" />
            </svg>
            Past ({pastAssignments.length}) — auto-archived
          </button>

          {showPast && (
            <div className="mt-3 rounded-[24px] border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 overflow-hidden">
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {pastAssignments
                  .sort((a, b) => b.dueDate.localeCompare(a.dueDate))
                  .map(a => (
                    <div key={a.id} className="group flex items-center gap-3 px-4 py-3">
                      <div className="w-[18px] h-[18px] rounded-full border border-slate-200 dark:border-slate-700 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-400 dark:text-slate-600 truncate">{a.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-slate-300 dark:text-slate-700">{a.course}</span>
                          <span className="text-xs text-slate-300 dark:text-slate-700">·</span>
                          <span className="text-xs text-slate-300 dark:text-slate-700">
                            {new Date(a.dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md opacity-50 ${TYPE_META[a.type].cls}`}>
                          {TYPE_META[a.type].label}
                        </span>
                        <button
                          onClick={() => remove(a.id)}
                          className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded-md text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 transition-all"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                            <path d="M18 6L6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
