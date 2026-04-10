import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { Assignment, CurrentCourse, UserProfile } from '../../lib/types'

export interface CourseHealth {
  course: string
  status: 'strong' | 'steady' | 'at-risk' | 'critical'
  completed: number
  pending: number
  overdue: number
  note: string
}

export interface InsightsResponse {
  profileHeadline: string
  studyProfile: string
  behaviorTags: string[]
  strengths: string[]
  improvements: string[]
  courseHealth: CourseHealth[]
  weeklyHabit: string
  topRecommendation: string
}

export interface InsightsRequest {
  profile: UserProfile
  assignments: Assignment[]
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured.' }, { status: 500 })
  }

  const openai = new OpenAI({ apiKey })
  const body = await req.json() as InsightsRequest
  const { profile, assignments } = body

  const today = new Date().toISOString().split('T')[0]

  // ── Compute stats ──────────────────────────────────────────────

  // Past due = treated as done regardless of completed flag
  const pastList = assignments.filter(a => a.dueDate < today)
  const upcomingList = assignments.filter(a => !a.completed && a.dueDate >= today)
  const markedEarly = assignments.filter(a => a.completed && a.dueDate >= today)

  // On-time rate = how often they marked done before the deadline
  const onTimeRate = pastList.length > 0
    ? Math.round((markedEarly.length / pastList.length) * 100)
    : null

  const total = assignments.length
  const pastCount = pastList.length
  const upcomingCount = upcomingList.length

  // Per-course breakdown
  const allCourses = [...new Set(assignments.map(a => a.course))]
  const courseStats = allCourses.map(course => {
    const all = assignments.filter(a => a.course === course)
    const past = all.filter(a => a.dueDate < today)
    const upcoming = all.filter(a => !a.completed && a.dueDate >= today)
    const doneEarly = all.filter(a => a.completed && a.dueDate >= today).length
    const rate = past.length > 0 ? Math.round((doneEarly / past.length) * 100) : null
    return { course, total: all.length, done: doneEarly, pending: upcoming.length, overdue: 0, rate }
  })

  // Per-type breakdown
  const typeStats = ['homework', 'exam', 'project', 'quiz', 'lab', 'other'].map(type => {
    const list = assignments.filter(a => a.type === type)
    if (list.length === 0) return null
    const done = list.filter(a => a.completed).length
    return { type, total: list.length, done, rate: Math.round((done / list.length) * 100) }
  }).filter(Boolean)

  // Difficulty of overdue courses
  const courseDifficultyMap: Record<string, string> = {}
  for (const c of (profile.currentCourses ?? [])) {
    courseDifficultyMap[c.name] = c.difficulty
  }

  const courseContext = courseStats
    .map(c => {
      const diff = courseDifficultyMap[c.course] ? ` [${courseDifficultyMap[c.course]}]` : ''
      const rateStr = c.rate !== null ? ` on-time rate: ${c.rate}%,` : ''
      return `- ${c.course}${diff}:${rateStr} ${c.pending} upcoming`
    }).join('\n') || 'No assignment data per course.'

  const typeContext = typeStats
    .map(t => `- ${t!.type}: ${t!.done}/${t!.total} marked done early (${t!.rate}%)`)
    .join('\n') || 'No type data.'

  const upcomingContext = upcomingList.length > 0
    ? upcomingList.slice(0, 10).map(a => {
        const days = Math.ceil((new Date(a.dueDate).getTime() - new Date(today).getTime()) / 86400000)
        return `- [${a.type}] "${a.title}" — ${a.course} — due in ${days} day${days !== 1 ? 's' : ''}`
      }).join('\n')
    : 'No upcoming assignments.'

  const prompt = `You are an academic performance analyst AI. Analyze this student's full assignment history and profile to generate a detailed, honest, and personalized insights report.

Note: "on-time rate" means how often the student marked assignments done before the deadline — past-due assignments are automatically archived regardless of completion status.

Student profile:
- Year ${profile.currentYear}, ${profile.currentSemester} semester
- School: ${profile.school || 'Not specified'}
- Major: ${profile.major || 'Not specified'}
- Completed courses history: ${profile.completedCourses.length} past courses
${profile.userNote ? `- Student's personal context (ALWAYS factor this into every field of your response):\n  "${profile.userNote}"` : ''}

Overall stats:
- Total assignments tracked: ${total}
- Past (archived): ${pastCount}
- On-time rate (marked done before deadline): ${onTimeRate !== null ? `${onTimeRate}%` : 'not enough data'}
- Upcoming: ${upcomingCount}

Per-course breakdown:
${courseContext}

Per-type breakdown:
${typeContext}

Upcoming assignments:
${upcomingContext}

Instructions:
- Be honest but encouraging. Point out real patterns, not generic observations.
- behaviorTags: 3-5 short labels that describe this student's style (e.g. "Last-minute finisher", "Strong on homeworks", "Exam avoider", "Consistent completer", "Project-focused")
- strengths: 2-4 specific, data-backed positive patterns
- improvements: 2-4 specific, actionable things to address — reference actual courses/types where relevant
- courseHealth: for each course that appears in the data, assign a status and a 1-sentence note
  - "strong": on-time rate ≥ 80% or 0 upcoming with low load
  - "steady": on-time rate ≥ 50% or moderate upcoming load
  - "at-risk": on-time rate < 50% or many upcoming tasks
  - "critical": no on-time completions AND heavy upcoming load
- weeklyHabit: 1-2 sentences about their overall study rhythm and patterns observed
- topRecommendation: the single most impactful thing they can do right now — specific and actionable
- profileHeadline: one punchy phrase that captures their academic style (e.g. "The Deadline Sprinter", "Steady but Stretched", "Assignment Juggler")
- studyProfile: 2-3 sentences of honest narrative analysis of who this student is academically

Return ONLY valid JSON with this exact shape:
{
  "profileHeadline": "...",
  "studyProfile": "...",
  "behaviorTags": ["...", "..."],
  "strengths": ["...", "..."],
  "improvements": ["...", "..."],
  "courseHealth": [
    { "course": "...", "status": "strong|steady|at-risk|critical", "completed": 0, "pending": 0, "overdue": 0, "note": "..." }
  ],
  "weeklyHabit": "...",
  "topRecommendation": "..."
}`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.4,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return NextResponse.json({ error: 'Empty response from AI.' }, { status: 500 })
  }

  try {
    // Merge AI output with computed stats for courseHealth
    const parsed = JSON.parse(content) as InsightsResponse
    // Enrich courseHealth with actual numbers
    parsed.courseHealth = parsed.courseHealth.map(ch => {
      const stat = courseStats.find(c => c.course === ch.course)
      if (stat) {
        ch.completed = stat.done
        ch.pending = stat.pending
        ch.overdue = stat.overdue
      }
      return ch
    })
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response.' }, { status: 500 })
  }
}
