'use client'

import { useEffect, useState } from 'react'
import type { CampusEvent, EventCategory } from '../lib/types'

const CAT_META: Record<EventCategory, { label: string; cls: string; dot: string }> = {
  academic: { label: 'Academic', dot: 'bg-indigo-500',  cls: 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800' },
  career:   { label: 'Career',   dot: 'bg-violet-500', cls: 'bg-violet-50 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 ring-1 ring-violet-200 dark:ring-violet-800' },
  social:   { label: 'Social',   dot: 'bg-amber-400',  cls: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800' },
  sports:   { label: 'Sports',   dot: 'bg-emerald-500',cls: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-200 dark:ring-emerald-800' },
  club:     { label: 'Club',     dot: 'bg-sky-500',    cls: 'bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 ring-1 ring-sky-200 dark:ring-sky-800' },
  other:    { label: 'Other',    dot: 'bg-slate-400',  cls: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700' },
}

const CATEGORIES: EventCategory[] = ['academic', 'career', 'social', 'sports', 'club', 'other']

function daysUntil(date: string) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const d = new Date(date); d.setHours(0, 0, 0, 0)
  return Math.ceil((d.getTime() - today.getTime()) / 86400000)
}

function formatDate(date: string) {
  const days = daysUntil(date)
  const label = new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  if (days === 0) return `Today`
  if (days === 1) return `Tomorrow`
  if (days < 0) return label
  return label
}

export default function EventPanel({ userId }: { userId: string }) {
  const [events, setEvents] = useState<CampusEvent[]>([])
  const [showForm, setShowForm] = useState(false)
  const [catFilter, setCatFilter] = useState<EventCategory | 'all'>('all')
  const [expanded, setExpanded] = useState<number | null>(null)

  // form state
  const [fTitle, setFTitle] = useState('')
  const [fDate, setFDate] = useState('')
  const [fTime, setFTime] = useState('')
  const [fLocation, setFLocation] = useState('')
  const [fCategory, setFCategory] = useState<EventCategory>('academic')
  const [fDesc, setFDesc] = useState('')
  const [fError, setFError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function loadUser() {
      const res = await fetch(`/api/users/${userId}`, { cache: 'no-store' })
      if (!res.ok) return
      const data = await res.json()
      if (cancelled) return
      setEvents(data.user.events ?? [])
    }

    void loadUser()

    return () => {
      cancelled = true
    }
  }, [userId])

  function remove(id: number) {
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!fTitle.trim()) { setFError('Title required'); return }
    if (!fDate) { setFError('Date required'); return }
    setFError('')
    setEvents(prev => [...prev, {
      id: Date.now(),
      title: fTitle.trim(),
      date: fDate,
      time: fTime || undefined,
      location: fLocation.trim() || undefined,
      category: fCategory,
      description: fDesc.trim() || undefined,
    }])
    setFTitle(''); setFDate(''); setFTime(''); setFLocation(''); setFDesc('')
    setShowForm(false)
  }

  const today = new Date().toISOString().split('T')[0]

  const filtered = events
    .filter(e => catFilter === 'all' || e.category === catFilter)
    .filter(e => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="space-y-6">

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setCatFilter('all')}
              className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${
                catFilter === 'all'
                  ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              All
            </button>
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(catFilter === c ? 'all' : c)}
                className={`px-3 py-2 rounded-full text-xs font-medium transition-all ${
                  catFilter === c ? CAT_META[c].cls + ' !bg-opacity-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {CAT_META[c].label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowForm(v => !v)}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-slate-950 px-4 py-3 text-xs font-medium text-white dark:bg-white dark:text-slate-950 transition-colors shrink-0"
          >
            <span className="text-base leading-none">{showForm ? '−' : '+'}</span>
            Add Event
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/50 p-4">
          <form onSubmit={submit} className="space-y-3">
            <input
              autoFocus
              type="text"
              value={fTitle}
              onChange={e => { setFTitle(e.target.value); setFError('') }}
              placeholder="Event title"
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="date"
                value={fDate}
                min={today}
                onChange={e => { setFDate(e.target.value); setFError('') }}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="text"
                value={fTime}
                onChange={e => setFTime(e.target.value)}
                placeholder="Time (e.g. 3:00 PM)"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <input
                type="text"
                value={fLocation}
                onChange={e => setFLocation(e.target.value)}
                placeholder="Location (optional)"
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <select
                value={fCategory}
                onChange={e => setFCategory(e.target.value as EventCategory)}
                className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {CATEGORIES.map(c => <option key={c} value={c}>{CAT_META[c].label}</option>)}
              </select>
            </div>
            <textarea
              value={fDesc}
              onChange={e => setFDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={2}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            {fError && <p className="text-xs text-rose-500">{fError}</p>}
            <div className="flex gap-2">
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

      {/* Event list */}
      {filtered.length === 0 ? (
        <div className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-950/50 py-16 text-center">
          <p className="text-sm text-slate-400 dark:text-slate-600">No upcoming events</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ev => {
            const days = daysUntil(ev.date)
            const isOpen = expanded === ev.id
            return (
              <div
                key={ev.id}
                className="rounded-[24px] border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/50 overflow-hidden"
              >
                <div
                  className="group flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
                  onClick={() => setExpanded(isOpen ? null : ev.id)}
                >
                  {/* Category dot */}
                  <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                    <div className={`w-2 h-2 rounded-full ${CAT_META[ev.category].dot}`} />
                  </div>

                  {/* Main content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">{ev.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {formatDate(ev.date)}
                        {ev.time && <> · {ev.time}</>}
                      </span>
                      {ev.location && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                          </svg>
                          {ev.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right */}
                  <div className="flex items-center gap-2 shrink-0">
                    {days === 0 && <span className="text-[10px] font-semibold text-rose-500">Today</span>}
                    {days === 1 && <span className="text-[10px] font-medium text-amber-500">Tomorrow</span>}
                    {days > 1 && <span className="text-[10px] text-slate-400 dark:text-slate-600">{days}d</span>}
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md ${CAT_META[ev.category].cls}`}>
                      {CAT_META[ev.category].label}
                    </span>
                    <svg
                      width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"
                      className={`text-slate-300 dark:text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                    <button
                      onClick={e => { e.stopPropagation(); remove(ev.id) }}
                      className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center rounded-md text-slate-300 dark:text-slate-600 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all"
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Expanded description */}
                {isOpen && ev.description && (
                  <div className="px-4 pb-3 border-t border-slate-100 dark:border-slate-800 pt-2.5 bg-slate-50 dark:bg-slate-800/30">
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{ev.description}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
