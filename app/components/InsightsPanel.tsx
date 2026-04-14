'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Assignment, UserProfile } from '../lib/types'
import type { InsightsResponse } from '../api/insights/route'

interface Props {
  userId: string
  profile: UserProfile
}

const STATUS_CONFIG = {
  strong:   { label: 'Strong',   bar: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50' },
  steady:   { label: 'Steady',   bar: 'bg-blue-500',    text: 'text-blue-600 dark:text-blue-400',       bg: 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50' },
  'at-risk':{ label: 'At risk',  bar: 'bg-amber-500',   text: 'text-amber-600 dark:text-amber-400',     bg: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50' },
  critical: { label: 'Critical', bar: 'bg-rose-500',    text: 'text-rose-600 dark:text-rose-400',       bg: 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50' },
}

const CACHE_KEY = (uid: string) => `campusflow_insights_${uid}`
const CACHE_TTL = 6 * 60 * 60 * 1000 // 6 hours

function hashContext(assignments: Assignment[], userNote?: string): string {
  const aHash = assignments.map(a => `${a.id}:${a.completed}:${a.dueDate}`).sort().join('|')
  return `${aHash}||note:${userNote ?? ''}`
}

function loadCache(userId: string): { data: InsightsResponse; hash: string } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY(userId))
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (Date.now() - parsed.ts > CACHE_TTL) return null
    return { data: parsed.data, hash: parsed.hash }
  } catch { return null }
}

function saveCache(userId: string, data: InsightsResponse, hash: string) {
  try {
    localStorage.setItem(CACHE_KEY(userId), JSON.stringify({ data, hash, ts: Date.now() }))
  } catch { /* ignore */ }
}

export default function InsightsPanel({ userId, profile }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [insights, setInsights] = useState<InsightsResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await fetch(`/api/users/${userId}`, { cache: 'no-store' })
      if (!res.ok || cancelled) return
      const data = await res.json()
      if (cancelled) return
      const loaded: Assignment[] = data.user.assignments ?? []
      const hash = hashContext(loaded, profile.userNote)
      const cached = loadCache(userId)
      if (cached && cached.hash === hash) {
        setAssignments(loaded)
        setInsights(cached.data)
        return
      }
      setAssignments(loaded)
    }
    void load()
    return () => { cancelled = true }
  }, [userId, profile.userNote])

  const runInsights = useCallback(async (all: Assignment[], force = false) => {
    if (all.length === 0) return
    if (!force) {
      const cached = loadCache(userId)
      if (cached && cached.hash === hashContext(all, profile.userNote)) {
        setInsights(cached.data)
        return
      }
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, assignments: all }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed.')
      setInsights(data as InsightsResponse)
      saveCache(userId, data, hashContext(all, profile.userNote))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not run analysis.')
    } finally {
      setLoading(false)
    }
  }, [profile, userId])

  useEffect(() => {
    if (assignments.length > 0) void runInsights(assignments)
  }, [assignments, runInsights])

  const today = new Date().toISOString().split('T')[0]
  const total = assignments.length
  const completed = assignments.filter((assignment) => assignment.completed)
  const overdue = assignments.filter((assignment) => !assignment.completed && assignment.dueDate < today)
  const upcoming = assignments.filter((assignment) => !assignment.completed && assignment.dueDate >= today)
  const completionRate = total > 0 ? Math.round((completed.length / total) * 100) : null
  const statusBreakdown = [
    { label: 'Completed', count: completed.length, bar: 'bg-emerald-500' },
    { label: 'Active', count: upcoming.length, bar: 'bg-blue-500' },
    { label: 'Overdue', count: overdue.length, bar: 'bg-rose-500' },
  ]
  const difficultyBreakdown = (['easy', 'medium', 'hard'] as const)
    .map((difficulty) => ({
      difficulty,
      count: assignments.filter((assignment) => assignment.difficulty === difficulty).length,
      bar:
        difficulty === 'hard'
          ? 'bg-rose-500'
          : difficulty === 'medium'
          ? 'bg-amber-400'
          : 'bg-emerald-500',
    }))
    .filter((item) => item.count > 0)
  const pendingByCourse = Array.from(
    upcoming.reduce((map, assignment) => {
      const key = assignment.course.trim() || 'General'
      map.set(key, (map.get(key) ?? 0) + 1)
      return map
    }, new Map<string, number>())
  )
    .map(([course, count]) => ({ course, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)
  const maxPendingCourseCount = Math.max(...pendingByCourse.map((item) => item.count), 1)
  const completionSegments = total > 0
    ? statusBreakdown.map((item) => ({ ...item, width: `${(item.count / total) * 100}%` }))
    : statusBreakdown.map((item) => ({ ...item, width: '0%' }))
  const difficultyTotal = difficultyBreakdown.reduce((sum, item) => sum + item.count, 0)
  const difficultySegments = difficultyBreakdown.map((item) => ({
    ...item,
    percent: difficultyTotal > 0 ? Math.round((item.count / difficultyTotal) * 100) : 0,
    width: difficultyTotal > 0 ? `${(item.count / difficultyTotal) * 100}%` : '0%',
  }))

  return (
    <div className="space-y-8">

      {/* Header */}
      <div className="flex items-center justify-between">
        {insights?.profileHeadline ? (
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{insights.profileHeadline}</p>
        ) : (
          <div />
        )}
        <button
          onClick={() => runInsights(assignments, true)}
          disabled={loading || assignments.length === 0}
          className="text-[11px] text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-40 shrink-0"
        >
          {loading ? 'Analyzing…' : 'Refresh ↺'}
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {[
          { label: 'Completion rate', value: completionRate !== null ? `${completionRate}%` : '—', sub: 'marked done' },
          { label: 'Completed', value: String(completed.length), sub: 'finished assignments' },
          { label: 'Upcoming', value: String(upcoming.length), sub: upcoming.length > 0 ? 'active assignments' : 'all clear' },
          { label: 'Overdue', value: String(overdue.length), sub: overdue.length > 0 ? 'past due and open' : 'nothing late' },
        ].map(s => (
          <div key={s.label} className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/40 px-4 py-3">
            <p className="text-[10px] uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">{s.value}</p>
            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* No data state */}
      {total === 0 && (
        <p className="text-sm text-slate-400 dark:text-slate-500">Add assignments to generate your personal insights.</p>
      )}

      {/* Loading skeleton */}
      {loading && total > 0 && (
        <div className="space-y-4">
          <div className="h-20 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-32 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
            <div className="h-32 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          </div>
          <div className="h-24 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
        </div>
      )}

      {error && <p className="text-sm text-rose-500">{error}</p>}

      {!loading && insights && (
        <div className="space-y-8">

          {/* Top recommendation */}
          {insights.topRecommendation && (
            <div className="rounded-xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/10 px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-500 dark:text-blue-400 mb-2">What to do next</p>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-relaxed">{insights.topRecommendation}</p>
            </div>
          )}

          {/* Summary */}
          {insights.studyProfile && (
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 mb-2">What this means</p>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{insights.studyProfile}</p>
            </div>
          )}

          {/* Behavior tags */}
          {insights.behaviorTags?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-3">Patterns</p>
              <div className="flex flex-wrap gap-2">
                {insights.behaviorTags.map(tag => (
                  <span key={tag} className="rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {(statusBreakdown.some((item) => item.count > 0) || difficultyBreakdown.length > 0 || pendingByCourse.length > 0) && (
            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/35">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Completion Snapshot</p>
                      <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">
                        {completionRate !== null ? `${completionRate}%` : '—'}
                      </p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">based on assignments marked done</p>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400">{completed.length} of {total} completed</p>
                  </div>
                  <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                    {completionSegments.map((item) => (
                      <div key={item.label} className={item.bar} style={{ width: item.width }} />
                    ))}
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-3">
                    {statusBreakdown.map((item) => (
                      <div key={item.label} className="rounded-lg bg-white/70 px-3 py-3 dark:bg-slate-950/35">
                        <div className="flex items-center gap-2">
                          <span className={`h-2.5 w-2.5 rounded-full ${item.bar}`} />
                          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{item.label}</p>
                        </div>
                        <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">{item.count}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/35">
                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Difficulty Split</p>
                      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">how challenging the tracked workload looks</p>
                    </div>
                  </div>
                  {difficultySegments.length > 0 ? (
                    <>
                      <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-slate-200/80 dark:bg-slate-800">
                        {difficultySegments.map((item) => (
                          <div key={item.difficulty} className={item.bar} style={{ width: item.width }} />
                        ))}
                      </div>
                      <div className="mt-4 grid grid-cols-3 gap-3">
                        {difficultySegments.map((item) => (
                          <div key={item.difficulty} className="rounded-lg bg-white/70 px-3 py-3 dark:bg-slate-950/35">
                            <div className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${item.bar}`} />
                              <p className="text-[11px] font-medium capitalize text-slate-500 dark:text-slate-400">{item.difficulty}</p>
                            </div>
                            <p className="mt-2 text-xl font-semibold tracking-[-0.03em] text-slate-900 dark:text-white">{item.count}</p>
                            <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">{item.percent}% of tracked work</p>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="mt-4 text-sm text-slate-400 dark:text-slate-500">No difficulty data yet.</p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-900/35">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">Course Load</p>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">active assignments by course</p>
                <div className="mt-5 space-y-4">
                  {pendingByCourse.length > 0 ? pendingByCourse.map((item, index) => (
                    <div key={item.course}>
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white dark:bg-white dark:text-slate-900">
                            {index + 1}
                          </span>
                          <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">{item.course}</p>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white">{item.count}</p>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-200/80 dark:bg-slate-800">
                        <div
                          className="h-2.5 rounded-full bg-[linear-gradient(90deg,#1f6feb,#0f766e)]"
                          style={{ width: `${(item.count / maxPendingCourseCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  )) : (
                    <p className="text-sm text-slate-400 dark:text-slate-500">No active assignments to compare.</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Strengths + Improvements */}
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-emerald-600 dark:text-emerald-400 mb-3">Strengths</p>
              <ul className="space-y-2.5">
                {insights.strengths?.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{s}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/10 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-600 dark:text-amber-400 mb-3">Watchouts</p>
              <ul className="space-y-2.5">
                {insights.improvements?.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <p className="text-sm text-slate-700 dark:text-slate-300 leading-snug">{s}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Course health */}
          {insights.courseHealth?.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-4">Course health</p>
              <div className="grid grid-cols-2 gap-3">
                {insights.courseHealth.map(ch => {
                  const cfg = STATUS_CONFIG[ch.status] ?? STATUS_CONFIG.steady
                  const courseTotal = ch.completed + ch.pending + ch.overdue
                  const pct = courseTotal > 0 ? Math.round((ch.completed / courseTotal) * 100) : 0
                  return (
                    <div key={ch.course} className={`rounded-xl border p-4 ${cfg.bg}`}>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{ch.course}</p>
                        <span className={`text-[10px] font-semibold uppercase tracking-[0.12em] shrink-0 ${cfg.text}`}>{cfg.label}</span>
                      </div>
                      {/* Progress bar */}
                      <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-700 mb-3">
                        <div className={`h-1.5 rounded-full ${cfg.bar}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex gap-3 text-[10px] text-slate-500 dark:text-slate-400 mb-2">
                        <span>{ch.completed} done</span>
                        <span>{ch.pending} upcoming</span>
                        {ch.overdue > 0 && <span className="text-rose-500">{ch.overdue} overdue</span>}
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-snug">{ch.note}</p>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Weekly habit */}
          {insights.weeklyHabit && (
            <div className="border-t border-slate-100 dark:border-slate-800 pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500 mb-2">Study rhythm</p>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{insights.weeklyHabit}</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
