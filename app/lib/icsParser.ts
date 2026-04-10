import type { Assignment, AssignmentType } from './types'

// ICS line folding: lines starting with space/tab are continuations
function unfold(text: string): string {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '')
}

// Unescape ICS text values
function unescape(val: string): string {
  return val.replace(/\\n/g, '\n').replace(/\\N/g, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\')
}

// Parse DTSTART value (handles UTC Z, local, and DATE-only formats)
function parseICSDate(val: string): { date: string; time?: string } {
  // val may be like "20260409T235900Z" or "20260409" or "20260409T235900"
  const clean = val.trim()

  if (clean.length === 8) {
    // DATE only: YYYYMMDD
    return { date: `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}` }
  }

  const dateStr = `${clean.slice(0, 4)}-${clean.slice(4, 6)}-${clean.slice(6, 8)}`
  const h = clean.slice(9, 11)
  const m = clean.slice(11, 13)

  if (clean.endsWith('Z')) {
    // UTC → convert to local
    const d = new Date(`${dateStr}T${h}:${m}:00Z`)
    const localDate = d.toLocaleDateString('en-CA') // YYYY-MM-DD
    const localTime = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    return { date: localDate, time: localTime }
  }

  // Local time
  const hour = parseInt(h, 10)
  const time = `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
  return { date: dateStr, time }
}

function detectType(summary: string, categories: string): AssignmentType {
  const s = summary.toLowerCase()
  const c = categories.toLowerCase()
  if (c.includes('quiz') || s.includes('quiz'))                          return 'quiz'
  if (c.includes('exam') || s.includes('exam') || s.includes('midterm') || s.includes('final exam')) return 'exam'
  if (s.includes('lab report') || s.includes('laboratory'))              return 'lab'
  if (s.includes('project') || s.includes('milestone'))                  return 'project'
  return 'homework'
}

export interface ParsedAssignment extends Omit<Assignment, 'id'> {
  uid?: string
}

export function parseICS(text: string): ParsedAssignment[] {
  const unfolded = unfold(text)
  const lines = unfolded.split(/\r?\n/)

  const results: ParsedAssignment[] = []
  let inEvent = false
  let current: Record<string, string> = {}

  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      inEvent = true
      current = {}
      continue
    }
    if (line === 'END:VEVENT') {
      inEvent = false

      const summary = unescape(current['SUMMARY'] ?? '').trim()
      const dtstart = current['DTSTART'] ?? ''

      if (!summary || !dtstart) continue

      // Skip all-day calendar items with no real assignment content
      const categories = current['CATEGORIES'] ?? ''
      if (!summary) continue

      const { date, time } = parseICSDate(dtstart)

      // Extract course name from DESCRIPTION
      // Canvas format: first non-URL line is usually the course name
      const desc = unescape(current['DESCRIPTION'] ?? '')
      const descLines = desc.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('http'))
      let course = descLines[0] ?? ''
      if (course.length > 80) course = course.slice(0, 80)

      results.push({
        uid: current['UID'],
        title: summary,
        course,
        dueDate: date,
        dueTime: time,
        type: detectType(summary, categories),
        completed: false,
      })
      continue
    }

    if (!inEvent) continue

    // Parse "KEY;PARAMS:VALUE" — store by base key
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const rawKey = line.slice(0, colonIdx)
    const val = line.slice(colonIdx + 1)
    const baseKey = rawKey.split(';')[0]
    current[baseKey] = val
  }

  return results
}
