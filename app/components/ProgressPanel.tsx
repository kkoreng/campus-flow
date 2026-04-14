'use client'

import { useEffect, useState } from 'react'
import type { Assignment } from '../lib/types'

interface Props {
  userId: string
  refreshTrigger: number
}

interface Stats {
  todayTotal: number
  todayDone: number
  weekTotal: number
  weekDone: number
  pastTotal: number
  pastDone: number
}

function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function getWeekRange(): { start: string; end: string } {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)
  return {
    start: mon.toISOString().split('T')[0],
    end: sun.toISOString().split('T')[0],
  }
}

function computeStats(assignments: Assignment[]): Stats {
  const today = getToday()
  const { start, end } = getWeekRange()
  const todayItems = assignments.filter(a => a.dueDate === today)
  const weekItems  = assignments.filter(a => a.dueDate >= start && a.dueDate <= end)
  const pastItems  = assignments.filter(a => a.dueDate < today)
  return {
    todayTotal: todayItems.length,
    todayDone:  todayItems.filter(a => a.completed).length,
    weekTotal:  weekItems.length,
    weekDone:   weekItems.filter(a => a.completed).length,
    pastTotal:  pastItems.length,
    pastDone:   pastItems.filter(a => a.completed).length,
  }
}

interface StatCardProps {
  label: string
  pct: number | null
  done: number
  total: number
  emptyText: string
  accent: string
  barColor: string
  tone: string
}

function StatCard({ label, pct, done, total, emptyText, accent, barColor, tone }: StatCardProps) {
  return (
    <div className={`relative overflow-hidden rounded-[22px] border p-4 ${tone}`}>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_68%)] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_68%)]" />
      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">{label}</p>
          {pct !== null ? (
            <>
              <p className="mt-3 text-[2.2rem] font-semibold leading-none tracking-[-0.05em] text-slate-950 dark:text-white">
                {pct}
                <span className="ml-1 text-base font-medium text-slate-400 dark:text-slate-500">%</span>
              </p>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{done} of {total} completed</p>
            </>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
          )}
        </div>
        <div className={`mt-0.5 h-2.5 w-2.5 rounded-full ${accent} shadow-[0_0_0_6px_rgba(255,255,255,0.55)] dark:shadow-[0_0_0_6px_rgba(15,23,42,0.45)]`} />
      </div>
      {pct !== null ? (
        <>
          <div className="mt-5 h-2 w-full rounded-full bg-white/70 dark:bg-slate-800/80">
            <div
              className={`h-full rounded-full transition-all duration-700 ${barColor}`}
              style={{ width: `${pct}%` }}
            />
          </div>
        </>
      ) : null}
    </div>
  )
}

export default function ProgressPanel({ userId, refreshTrigger }: Props) {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`/api/users/${userId}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return
        setStats(computeStats(data.user?.assignments ?? []))
      })
      .catch(() => {})
    return () => { cancelled = true }
  }, [userId, refreshTrigger])

  if (!stats) return null

  const todayPct  = stats.todayTotal > 0 ? Math.round((stats.todayDone / stats.todayTotal) * 100) : null
  const weekPct   = stats.weekTotal  > 0 ? Math.round((stats.weekDone  / stats.weekTotal)  * 100) : null
  const onTimePct = stats.pastTotal  > 0 ? Math.round((stats.pastDone  / stats.pastTotal)  * 100) : null

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Progress</p>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-800" />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <StatCard
          label="Today"
          pct={todayPct}
          done={stats.todayDone}
          total={stats.todayTotal}
          emptyText="No tasks today"
          accent="bg-emerald-400"
          barColor="bg-emerald-500"
          tone="border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.95),rgba(255,255,255,0.9))] dark:border-emerald-900/50 dark:bg-[linear-gradient(180deg,rgba(6,78,59,0.28),rgba(15,23,42,0.68))]"
        />
        <StatCard
          label="This Week"
          pct={weekPct}
          done={stats.weekDone}
          total={stats.weekTotal}
          emptyText="No tasks this week"
          accent="bg-blue-400"
          barColor="bg-blue-500"
          tone="border-blue-200/70 bg-[linear-gradient(180deg,rgba(239,246,255,0.95),rgba(255,255,255,0.9))] dark:border-blue-900/50 dark:bg-[linear-gradient(180deg,rgba(30,64,175,0.22),rgba(15,23,42,0.68))]"
        />
        <StatCard
          label="On-Time Rate"
          pct={onTimePct}
          done={stats.pastDone}
          total={stats.pastTotal}
          emptyText="No history yet"
          accent={onTimePct === null ? 'bg-slate-300' : onTimePct >= 70 ? 'bg-emerald-400' : onTimePct >= 40 ? 'bg-amber-400' : 'bg-rose-400'}
          barColor={onTimePct === null ? '' : onTimePct >= 70 ? 'bg-emerald-500' : onTimePct >= 40 ? 'bg-amber-400' : 'bg-rose-500'}
          tone={onTimePct === null
            ? 'border-slate-200/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.95),rgba(255,255,255,0.9))] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(51,65,85,0.24),rgba(15,23,42,0.68))]'
            : onTimePct >= 70
            ? 'border-emerald-200/70 bg-[linear-gradient(180deg,rgba(236,253,245,0.95),rgba(255,255,255,0.9))] dark:border-emerald-900/50 dark:bg-[linear-gradient(180deg,rgba(6,78,59,0.28),rgba(15,23,42,0.68))]'
            : onTimePct >= 40
            ? 'border-amber-200/70 bg-[linear-gradient(180deg,rgba(255,251,235,0.96),rgba(255,255,255,0.9))] dark:border-amber-900/50 dark:bg-[linear-gradient(180deg,rgba(120,53,15,0.24),rgba(15,23,42,0.68))]'
            : 'border-rose-200/70 bg-[linear-gradient(180deg,rgba(255,241,242,0.96),rgba(255,255,255,0.9))] dark:border-rose-900/50 dark:bg-[linear-gradient(180deg,rgba(127,29,29,0.24),rgba(15,23,42,0.68))]'}
        />
      </div>
    </div>
  )
}
