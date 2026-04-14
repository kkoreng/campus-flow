'use client'

import { useEffect, useMemo, useState } from 'react'
import type { Assignment, UserProfile } from '../lib/types'

interface Props {
  userId: string
  profile: UserProfile
  onProfileChange: (profile: UserProfile) => void
}

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toDateKey(date: Date) {
  return date.toLocaleDateString('en-CA')
}

function sameMonth(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

function startOfCalendarMonth(value: Date) {
  const first = new Date(value.getFullYear(), value.getMonth(), 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay())
  return start
}

function buildCalendarDays(value: Date) {
  const start = startOfCalendarMonth(value)
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return date
  })
}

function getCourseLabel(course: string) {
  return course.trim() || 'General'
}

function getDifficultyAccent(difficulty: Assignment['difficulty']) {
  if (difficulty === 'hard') return 'bg-rose-500'
  if (difficulty === 'medium') return 'bg-amber-400'
  return 'bg-emerald-400'
}

export default function EventPanel({ userId, profile, onProfileChange }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [month, setMonth] = useState(() => new Date())
  const [selectedDate, setSelectedDate] = useState(() => toDateKey(new Date()))
  const [note, setNote] = useState(profile.dailyNotes?.[toDateKey(new Date())] ?? '')
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      const res = await fetch(`/api/users/${userId}`, { cache: 'no-store' })
      if (!res.ok || cancelled) return
      const data = await res.json()
      if (cancelled) return
      setAssignments((data.user.assignments ?? []).map((assignment: Assignment) => ({
        ...assignment,
        difficulty: assignment.difficulty ?? 'medium',
      })))
    }

    void loadUser()
    return () => { cancelled = true }
  }, [userId])

  useEffect(() => {
    setNote(profile.dailyNotes?.[selectedDate] ?? '')
    setStatus('')
  }, [profile.dailyNotes, selectedDate])

  const monthDays = useMemo(() => buildCalendarDays(month), [month])
  const assignmentsByDate = useMemo(() => {
    const grouped = new Map<string, Assignment[]>()
    for (const assignment of assignments) {
      const key = assignment.dueDate
      const current = grouped.get(key) ?? []
      current.push(assignment)
      grouped.set(key, current)
    }
    return grouped
  }, [assignments])

  const selectedAssignments = assignmentsByDate.get(selectedDate) ?? []
  const selectedDateLabel = new Date(`${selectedDate}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  async function saveNote() {
    setSaving(true)
    setStatus('')
    try {
      const nextDailyNotes = {
        ...(profile.dailyNotes ?? {}),
        [selectedDate]: note.trim(),
      }

      if (!note.trim()) {
        delete nextDailyNotes[selectedDate]
      }

      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile: { dailyNotes: nextDailyNotes } }),
      })
      if (!res.ok) throw new Error()
      onProfileChange({ ...profile, dailyNotes: nextDailyNotes })
      setStatus('Saved.')
    } catch {
      setStatus('Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  function moveMonth(direction: -1 | 1) {
    setMonth((current) => new Date(current.getFullYear(), current.getMonth() + direction, 1))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Calendar
          </p>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => moveMonth(-1)}
            className="h-8 w-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Previous month"
          >
            ←
          </button>
          <p className="min-w-32 text-center text-sm font-medium text-slate-700 dark:text-slate-300">
            {month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </p>
          <button
            onClick={() => moveMonth(1)}
            className="h-8 w-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.9fr)]">
        <div className="overflow-hidden rounded-[28px] border border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-950/55">
          <div className="grid grid-cols-7 border-b border-slate-100 dark:border-slate-800">
            {WEEKDAY_LABELS.map((label) => (
              <div key={label} className="px-3 py-3 text-center text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400 dark:text-slate-500">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((date) => {
              const dateKey = toDateKey(date)
              const items = assignmentsByDate.get(dateKey) ?? []
              const isCurrentMonth = sameMonth(date, month)
              const isSelected = dateKey === selectedDate
              const isToday = dateKey === toDateKey(new Date())

              return (
                <button
                  key={dateKey}
                  onClick={() => setSelectedDate(dateKey)}
                  className={`relative min-h-[118px] border-b border-r border-slate-100 px-3 py-2 text-left transition-colors last:border-r-0 dark:border-slate-800 ${
                    isSelected
                      ? 'bg-blue-50/70 dark:bg-blue-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/40'
                  }`}
                >
                  <span className={`absolute left-3 top-2 inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium ${
                    isToday
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                      : isCurrentMonth
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-slate-300 dark:text-slate-700'
                  }`}>
                    {date.getDate()}
                  </span>
                  {items.length > 0 && (
                    <span className="absolute right-3 top-3 text-[10px] text-slate-400 dark:text-slate-500">{items.length}</span>
                  )}

                  <div className="pt-8 space-y-1.5">
                    {items.slice(0, 2).map((assignment) => (
                      <div
                        key={assignment.id}
                        className={`flex items-center gap-2 rounded-md px-2 py-1 text-[11px] ${
                          assignment.completed
                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'
                            : 'bg-white/80 text-slate-700 dark:bg-slate-900/70 dark:text-slate-300'
                        }`}
                      >
                        <span className={`h-2 w-2 rounded-full ${getDifficultyAccent(assignment.difficulty)}`} />
                        <span className="truncate">{assignment.title}</span>
                      </div>
                    ))}
                    {items.length > 2 && (
                      <p className="px-1 text-[10px] text-slate-400 dark:text-slate-500">+{items.length - 2} more</p>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-950/55">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Selected Day</p>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">{selectedDateLabel}</h3>

          <div className="mt-5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Assignments</p>
            {selectedAssignments.length > 0 ? (
              <div className="mt-3 space-y-2">
                {selectedAssignments.map((assignment) => (
                  <div key={assignment.id} className="rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex items-start gap-3">
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${getDifficultyAccent(assignment.difficulty)}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{assignment.title}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                          {getCourseLabel(assignment.course)}
                          {assignment.dueTime ? ` · ${assignment.dueTime}` : ''}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-slate-400 dark:text-slate-500">No assignments due.</p>
            )}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">Quick Note</p>
            <textarea
              value={note}
              onChange={(event) => { setNote(event.target.value); setStatus('') }}
              rows={5}
              placeholder="Add a short note for this day..."
              className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={saveNote}
                disabled={saving}
                className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60 dark:bg-white dark:text-slate-900"
              >
                {saving ? 'Saving…' : 'Save note'}
              </button>
              {status && <p className={`text-xs ${status === 'Saved.' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>{status}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
