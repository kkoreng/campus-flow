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

  const now = new Date()
  const hour = now.getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-8">

      {/* ── Greeting + date ── */}
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-semibold tracking-[-0.04em] text-slate-900 dark:text-white">{greeting}</h2>
          <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">
            {now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
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

          {/* Focus Now — hero (top) */}
          {analysis.focusNow && (
            <div className="bg-slate-900 dark:bg-white rounded-xl p-6">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-blue-400 dark:text-blue-600 mb-4">Focus now</p>
              <p className="text-2xl font-semibold tracking-[-0.03em] text-white dark:text-slate-900 leading-snug">
                {analysis.focusNow.title}
              </p>
              <p className="mt-1.5 text-sm text-slate-400 dark:text-slate-500">{analysis.focusNow.course}</p>

              <div className="mt-5 flex items-center gap-5">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-1">Deadline</p>
                  <p className="text-sm font-semibold text-rose-400 dark:text-rose-500">{analysis.focusNow.deadline}</p>
                </div>
                <div className="w-px h-8 bg-slate-700 dark:bg-slate-300" />
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400 mb-1">Est. time</p>
                  <p className="text-sm font-semibold text-white dark:text-slate-900">{analysis.focusNow.timeEstimate}</p>
                </div>
              </div>

              {analysis.focusNow.nextUp && (
                <div className="mt-5 pt-4 border-t border-slate-700/60 dark:border-slate-300/40">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    <span className="text-slate-500 dark:text-slate-400">After this →</span> {analysis.focusNow.nextUp}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* AI Comment */}
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
