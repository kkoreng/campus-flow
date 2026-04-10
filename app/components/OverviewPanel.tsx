'use client'

import { useEffect, useState } from 'react'
import type { Assignment, CampusEvent } from '../lib/types'

function daysUntil(date: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / 86400000)
}

const TYPE_META: Record<string, { label: string; cls: string }> = {
  homework: { label: 'HW',      cls: 'text-blue-500 dark:text-blue-400' },
  exam:     { label: 'Exam',    cls: 'text-rose-500 dark:text-rose-400' },
  project:  { label: 'Project', cls: 'text-violet-500 dark:text-violet-400' },
  quiz:     { label: 'Quiz',    cls: 'text-amber-500 dark:text-amber-400' },
  lab:      { label: 'Lab',     cls: 'text-emerald-500 dark:text-emerald-400' },
  other:    { label: 'Other',   cls: 'text-slate-400 dark:text-slate-500' },
}

const CAT_DOT: Record<string, string> = {
  academic: 'bg-indigo-500', career: 'bg-violet-500', social: 'bg-amber-400',
  sports: 'bg-emerald-500', club: 'bg-sky-500', other: 'bg-slate-400',
}

const GROUPS = [
  { key: 'overdue',  label: 'Overdue',    urgency: 'rose',  check: (d: number) => d < 0 },
  { key: 'today',    label: 'Today',      urgency: 'rose',  check: (d: number) => d === 0 },
  { key: 'tomorrow', label: 'Tomorrow',   urgency: 'amber', check: (d: number) => d === 1 },
  { key: 'thisweek', label: 'This week',  urgency: 'slate', check: (d: number) => d >= 2 && d <= 7 },
  { key: 'later',    label: 'Later',      urgency: 'slate', check: (d: number) => d > 7 },
]

interface Props {
  userId: string
  onNavigate: (tab: 'assignments' | 'event') => void
}

export default function OverviewPanel({ userId, onNavigate }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [events, setEvents] = useState<CampusEvent[]>([])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await fetch(`/api/users/${userId}`, { cache: 'no-store' })
      if (!res.ok || cancelled) return
      const data = await res.json()
      if (cancelled) return
      setAssignments(data.user.assignments ?? [])
      setEvents(data.user.events ?? [])
    }
    void load()
    return () => { cancelled = true }
  }, [userId])

  function toggleDone(id: number) {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, completed: !a.completed } : a))
  }

  const now = new Date()
  const today = now.toISOString().split('T')[0]
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  const pending = assignments.filter(a => !a.completed)
  const overdueCount = pending.filter(a => a.dueDate < today).length
  const todayCount = pending.filter(a => a.dueDate === today).length
  const todayEvents = events.filter(e => e.date === today)
  const tomorrowEvents = events.filter(e => daysUntil(e.date) === 1)
  const upcomingEvents = todayEvents.length > 0 ? todayEvents : tomorrowEvents
  const eventLabel = todayEvents.length > 0 ? 'Today' : 'Tomorrow'

  return (
    <div className="space-y-10">

      {/* ── Header ── */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">
            {greeting}
          </h2>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
        </div>
        {(overdueCount > 0 || todayCount > 0) && (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
            overdueCount > 0
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-500 ring-1 ring-rose-200 dark:ring-rose-900'
              : 'bg-amber-50 dark:bg-amber-950/40 text-amber-500 ring-1 ring-amber-200 dark:ring-amber-900'
          }`}>
            {overdueCount > 0 ? `${overdueCount} overdue` : `${todayCount} due today`}
          </span>
        )}
      </div>

      {/* ── Upcoming events strip ── */}
      {upcomingEvents.length > 0 && (
        <button
          onClick={() => onNavigate('event')}
          className="w-full text-left group"
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-500 dark:text-indigo-400">{eventLabel}</span>
            <div className="flex-1 h-px bg-indigo-100 dark:bg-indigo-900/50" />
            <span className="text-[11px] text-slate-400 group-hover:text-indigo-500 transition-colors">View all →</span>
          </div>
          <div className="space-y-2">
            {upcomingEvents.slice(0, 3).map(ev => (
              <div key={ev.id} className="flex items-center gap-3">
                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${CAT_DOT[ev.category] ?? 'bg-slate-400'}`} />
                <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{ev.title}</span>
                {ev.time && <span className="ml-auto text-xs text-slate-400 shrink-0">{ev.time}</span>}
              </div>
            ))}
          </div>
        </button>
      )}

      {/* ── Assignments ── */}
      <div>
        <div className="flex items-center gap-3 mb-6">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">To do</span>
          <div className="flex-1 h-px bg-slate-100 dark:bg-slate-800" />
          <button onClick={() => onNavigate('assignments')} className="text-[11px] text-slate-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors">
            All assignments →
          </button>
        </div>

        {pending.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-3xl mb-3">🎉</p>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">All clear</p>
            <p className="text-xs text-slate-400 dark:text-slate-600 mt-1">No pending assignments</p>
          </div>
        ) : (
          <div className="space-y-8">
            {GROUPS.map(group => {
              const items = pending
                .filter(a => group.check(daysUntil(a.dueDate)))
                .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
              if (items.length === 0) return null

              const labelCls =
                group.urgency === 'rose'  ? 'text-rose-500' :
                group.urgency === 'amber' ? 'text-amber-500' :
                'text-slate-400 dark:text-slate-500'

              return (
                <div key={group.key}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-semibold ${labelCls}`}>{group.label}</span>
                    <span className="text-xs text-slate-300 dark:text-slate-700">{items.length}</span>
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {items.map(a => {
                      const meta = TYPE_META[a.type] ?? TYPE_META.other
                      const days = daysUntil(a.dueDate)
                      return (
                        <div key={a.id} className="flex items-center gap-3 py-3 group/row hover:bg-slate-50 dark:hover:bg-slate-900/40 -mx-3 px-3 rounded-xl transition-colors">
                          {/* Checkbox */}
                          <button
                            onClick={() => toggleDone(a.id)}
                            className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 hover:border-indigo-400 dark:hover:border-indigo-500 shrink-0 transition-colors"
                          />

                          {/* Text */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{a.title}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{a.course}{a.dueTime ? ` · ${a.dueTime}` : ''}</p>
                          </div>

                          {/* Type */}
                          <span className={`text-xs font-semibold shrink-0 ${meta.cls}`}>{meta.label}</span>

                          {/* Days */}
                          <span className={`text-xs tabular-nums w-16 text-right shrink-0 font-medium ${
                            days < 0  ? 'text-rose-500' :
                            days === 0 ? 'text-rose-500' :
                            days === 1 ? 'text-amber-500' :
                            'text-slate-400 dark:text-slate-500'
                          }`}>
                            {days < 0 ? `${Math.abs(days)}d ago` : days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `in ${days}d`}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
