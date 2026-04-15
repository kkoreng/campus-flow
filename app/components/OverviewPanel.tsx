'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { Assignment, UserProfile } from '../lib/types'
import type { AnalyzeResponse } from '../api/analyze/route'

interface Props {
  userId: string
  profile: UserProfile
  refreshTrigger: number
  onNavigate: (tab: 'assignments' | 'event') => void
}

const CACHE_KEY = (uid: string) => `campusflow_analysis_${uid}`
const CACHE_TTL = 4 * 60 * 60 * 1000 // 4 hours

interface CacheEntry { data: AnalyzeResponse; assignmentHash: string; ts: number }

function loadCache(userId: string): CacheEntry | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY(userId))
    if (!raw) return null
    const entry = JSON.parse(raw) as CacheEntry
    if (Date.now() - entry.ts > CACHE_TTL) return null
    return entry
  } catch { return null }
}

function saveCache(userId: string, data: AnalyzeResponse, assignmentHash: string) {
  try {
    localStorage.setItem(CACHE_KEY(userId), JSON.stringify({ data, ts: Date.now(), assignmentHash }))
  } catch { /* ignore */ }
}

function hashContext(assignments: Assignment[], userNote?: string): string {
  const aHash = assignments.map(a => `${a.id}:${a.completed}:${a.dueDate}`).sort().join('|')
  return `${aHash}||note:${userNote ?? ''}`
}

export default function OverviewPanel({ userId, profile, refreshTrigger, onNavigate }: Props) {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [analysis, setAnalysis] = useState<AnalyzeResponse | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const res = await fetch(`/api/users/${userId}`, { cache: 'no-store' })
      if (!res.ok || cancelled) return
      const data = await res.json()
      if (cancelled) return
      const loaded: Assignment[] = data.user.assignments ?? []

      // Try cache first — only re-analyze if assignments changed or cache expired
      const hash = hashContext(loaded, profile.userNote)
      const cached = loadCache(userId)
      if (cached && cached.assignmentHash === hash) {
        setAssignments(loaded)
        setAnalysis(cached.data)
        return
      }

      setAssignments(loaded)
    }
    void load()
    return () => { cancelled = true }
  }, [userId, profile.userNote])

  const runAnalysis = useCallback(async (allAssignments: Assignment[], force = false) => {
    if (!force) {
      const hash = hashContext(allAssignments, profile.userNote)
      const cached = loadCache(userId)
      if (cached && cached.assignmentHash === hash) {
        setAnalysis(cached.data)
        return
      }
    }
    setAnalyzing(true)
    setAnalysisError('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, assignments: allAssignments }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Analysis failed.')
      setAnalysis(data as AnalyzeResponse)
      saveCache(userId, data, hashContext(allAssignments, profile.userNote))
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'Could not run analysis.')
    } finally {
      setAnalyzing(false)
    }
  }, [profile, userId])

  // Initial analysis on first load
  useEffect(() => {
    if (assignments.length > 0) void runAnalysis(assignments)
  }, [assignments, runAnalysis])

  // Re-fetch + re-analyze when assignments change externally (add/delete/toggle)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    let cancelled = false
    async function reload() {
      const res = await fetch(`/api/users/${userId}`, { cache: 'no-store' })
      if (!res.ok || cancelled) return
      const data = await res.json()
      if (cancelled) return
      const loaded: Assignment[] = data.user.assignments ?? []
      setAssignments(loaded)
      void runAnalysis(loaded)
    }
    void reload()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger])

  return (
    <div className="space-y-8">

      {/* ── Header meta ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Overview
          </p>
          <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
        </div>
        <button
          onClick={() => runAnalysis(assignments, true)}
          disabled={analyzing}
          className="text-[11px] text-slate-400 hover:text-blue-500 transition-colors disabled:opacity-40 shrink-0"
        >
          {analyzing ? 'Analyzing…' : 'Refresh ↺'}
        </button>
      </div>

      {/* Loading skeleton */}
      {analyzing && (
        <div className="space-y-4">
          <div className="h-36 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-12 rounded bg-slate-100 dark:bg-slate-800/60 animate-pulse" />)}
          </div>
        </div>
      )}

      {!analyzing && analysisError && (
        <p className="text-sm text-rose-500">{analysisError}</p>
      )}

      {!analyzing && !analysis && !analysisError && (
        <p className="text-sm text-slate-400 dark:text-slate-500">Add assignments to get your AI plan.</p>
      )}

      {!analyzing && analysis && (
        <div className="space-y-6">

          {/* Focus Now — hero */}
          {analysis.focusNow && (
            <div className="relative overflow-hidden rounded-2xl bg-[linear-gradient(135deg,#1a1f2e_0%,#0f1729_100%)] dark:bg-[linear-gradient(135deg,#f8fafc_0%,#e2e8f0_100%)] p-6">
              {/* Accent glow */}
              <div className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full bg-blue-500/10 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-8 -left-8 h-40 w-40 rounded-full bg-teal-500/10 blur-3xl" />

              {/* Label */}
              <div className="relative flex items-center justify-between mb-5">
                <div className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-blue-400 dark:bg-blue-500 animate-pulse" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-blue-400 dark:text-blue-600">Focus now</p>
                </div>
                <span className="rounded-full bg-white/8 dark:bg-black/8 border border-white/10 dark:border-black/10 px-2.5 py-1 text-[11px] font-medium text-slate-300 dark:text-slate-600">
                  {analysis.focusNow.timeEstimate}
                </span>
              </div>

              {/* Title */}
              <div className="relative">
                <div className="inline-flex items-center gap-2 rounded-lg bg-rose-500/15 border border-rose-500/20 px-3 py-1.5 mb-3">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="text-rose-400 dark:text-rose-500 shrink-0">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  <p className="text-xs font-semibold text-rose-400 dark:text-rose-500">{analysis.focusNow.deadline}</p>
                </div>
                <p className="text-[1.6rem] font-semibold tracking-[-0.04em] text-white dark:text-slate-900 leading-[1.2] mb-3">
                  {analysis.focusNow.title}
                </p>
                <span className="inline-block rounded-md bg-white/10 dark:bg-black/8 border border-white/10 dark:border-black/10 px-2.5 py-1 text-[11px] font-medium text-slate-300 dark:text-slate-600">
                  {analysis.focusNow.course}
                </span>
              </div>

              {/* After this */}
              {analysis.focusNow.nextUp && (
                <div className="relative mt-5 pt-4 border-t border-white/8 dark:border-black/8 flex items-start gap-2">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mt-px">After this</span>
                  <span className="text-slate-400 dark:text-slate-500 text-[10px] mt-px">→</span>
                  <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">{analysis.focusNow.nextUp}</p>
                </div>
              )}
            </div>
          )}

          {/* Summary */}
          {analysis.summary && (
            <div className="rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 px-4 py-3 flex items-start gap-3">
              <span className="mt-0.5 shrink-0 rounded-md bg-blue-500/10 dark:bg-blue-500/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-blue-500 dark:text-blue-400">AI Comment</span>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{analysis.summary}</p>
            </div>
          )}

          {/* Up next + Keep an eye on — side by side */}
          {(analysis.todayQueue.length > 0 || analysis.watchOut.length > 0) && (
            <div className="grid grid-cols-2 gap-4">

              {/* Up next */}
              <div className="border border-blue-200 dark:border-blue-900/50 rounded-xl p-4 bg-blue-50/50 dark:bg-blue-950/10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-blue-500 dark:text-blue-400 mb-3">Up next</p>
                {analysis.todayQueue.length > 0 ? (
                  <div className="divide-y divide-blue-100 dark:divide-blue-900/30">
                    {analysis.todayQueue.map((item, i) => (
                      <div key={i} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex items-start gap-2">
                          <span className="text-[10px] text-slate-300 dark:text-slate-700 font-mono mt-0.5 shrink-0">{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">{item.title}</p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{item.course}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{item.deadline}</span>
                              <span className="text-xs text-slate-300 dark:text-slate-700">·</span>
                              <span className="text-xs text-slate-400 dark:text-slate-500">{item.timeEstimate}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-600">Nothing else queued.</p>
                )}
              </div>

              {/* Keep an eye on */}
              <div className="border border-amber-200 dark:border-amber-900/50 rounded-xl p-4 bg-amber-50/50 dark:bg-amber-950/10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-amber-500 mb-3">Keep an eye on</p>
                {analysis.watchOut.length > 0 ? (
                  <div className="divide-y divide-amber-100 dark:divide-amber-900/30">
                    {analysis.watchOut.map((item, i) => (
                      <div key={i} className="py-3 first:pt-0 last:pb-0">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug">{item.title}</p>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{item.course} · {item.dueDate}</p>
                        {item.note && <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5">{item.note}</p>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 dark:text-slate-600">Nothing to watch.</p>
                )}
              </div>

            </div>
          )}

        </div>
      )}

      {/* ── Quick link to assignments ── */}
      <button
        onClick={() => onNavigate('assignments')}
        className="w-full text-left text-xs text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 transition-colors"
      >
        View all assignments →
      </button>

    </div>
  )
}
