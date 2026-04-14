import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import type { Assignment, CurrentCourse, UserProfile } from '../../lib/types'

export interface AnalyzeRequest {
  profile: UserProfile
  assignments: Assignment[]  // all assignments including completed (for behavior analysis)
}

export interface FocusNow {
  title: string
  course: string
  deadline: string
  timeEstimate: string
  nextUp: string
}

export interface QueueItem {
  title: string
  course: string
  deadline: string
  timeEstimate: string
}

export interface WatchItem {
  title: string
  course: string
  dueDate: string
  note: string
}

export interface AnalyzeResponse {
  summary: string
  focusNow: FocusNow | null
  todayQueue: QueueItem[]
  watchOut: WatchItem[]
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim()
  if (!apiKey) {
    return NextResponse.json({ error: 'OPENROUTER_API_KEY not configured.' }, { status: 500 })
  }

  const openai = new OpenAI({ apiKey })

  const body = await req.json() as AnalyzeRequest
  const { profile, assignments } = body

  const today = new Date().toISOString().split('T')[0]

  // Past due = automatically treated as done regardless of completed flag
  const upcoming = assignments.filter(a => !a.completed && a.dueDate >= today)
  const past = assignments.filter(a => a.dueDate < today)
  const markedDoneBeforeDue = assignments.filter(a => a.completed && a.dueDate >= today)
  const earnedCredits = profile.completedCourses.reduce((sum, course) => sum + course.credits, 0)

  const courseContext = profile.currentCourses.length > 0
    ? profile.currentCourses.map((c: CurrentCourse) => `- ${c.name} (difficulty: ${c.difficulty})`).join('\n')
    : 'No current courses listed.'

  const assignmentContext = upcoming.length > 0
    ? upcoming.map(a => {
        const daysLeft = Math.ceil((new Date(a.dueDate).getTime() - new Date(today).getTime()) / 86400000)
        const when = daysLeft === 0 ? 'due today' : `due in ${daysLeft} days`
        return `- [${a.type.toUpperCase()}] "${a.title}" — ${a.course} — ${when}${a.dueTime ? ` at ${a.dueTime}` : ''}`
      }).join('\n')
    : 'No upcoming assignments.'

  const heavyCourses = upcoming
    .reduce<Record<string, number>>((acc, a) => { acc[a.course] = (acc[a.course] ?? 0) + 1; return acc }, {})
  const workloadSummary = Object.entries(heavyCourses)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([c, n]) => `${c}: ${n} tasks`).join(', ')

  const onTimeRate = past.length > 0
    ? Math.round((markedDoneBeforeDue.length / past.length) * 100)
    : null

  const behaviorContext = [
    onTimeRate !== null ? `Early completion rate: ${onTimeRate}% (marked done before deadline)` : null,
    workloadSummary ? `Heaviest upcoming workload: ${workloadSummary}` : null,
  ].filter(Boolean).join('\n')

  const prompt = `You are a highly personalized academic advisor AI. Analyze this student's full context and give sharp, specific, actionable advice.

Student profile:
- Year ${profile.currentYear}, ${profile.currentSemester} semester
- School: ${profile.school || 'Not specified'}
- Major: ${profile.major || 'Not specified'}
- Earned credits so far: ${earnedCredits}

Current courses:
${courseContext}

Upcoming assignments (due today or later, not yet completed):
${assignmentContext}

Observed patterns:
${behaviorContext || 'Not enough data yet.'}

${profile.userNote ? `Student's personal context (ALWAYS factor this into every recommendation):\n"${profile.userNote}"` : ''}

Instructions:
- Only use upcoming assignments for focusNow and todayQueue.
- If there are no upcoming assignments, set focusNow to null and todayQueue to [].
- Use ALL context to give personalized, specific, actionable output — not generic advice.
- ALWAYS incorporate the student's personal context into your output — it is the most important personalization signal.
- Factor in course difficulty heavily: hard course + close deadline = top priority.
- deadlines should be human-readable (e.g. "tonight 11:59 PM", "this Thursday", "in 3 days")
- timeEstimate should be realistic (e.g. "~1.5 hrs", "~3 hrs")
- nextUp in focusNow should say exactly what to do after (e.g. "Start MATH 314 homework — you have 2 days")
- note in watchOut should be specific advice (e.g. "Hard course, start reviewing now before it piles up")

Return a JSON object with exactly this shape:
{
  "summary": "1-2 sentences, personal and specific to this student right now",
  "focusNow": {
    "title": "exact assignment name",
    "course": "course code",
    "deadline": "human-readable deadline",
    "timeEstimate": "~X hrs",
    "nextUp": "what to do immediately after this"
  },
  "todayQueue": [
    { "title": "...", "course": "...", "deadline": "...", "timeEstimate": "..." }
  ],
  "watchOut": [
    { "title": "...", "course": "...", "dueDate": "...", "note": "..." }
  ]
}

- focusNow: the single most urgent upcoming assignment (null if nothing upcoming)
- todayQueue: up to 4 upcoming items after focusNow, in priority order
- watchOut: up to 3 upcoming things that need attention soon (exams, projects, hard courses)

Return ONLY valid JSON, no markdown.`

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const content = completion.choices[0]?.message?.content
  if (!content) {
    return NextResponse.json({ error: 'Empty response from AI.' }, { status: 500 })
  }

  try {
    const parsed = JSON.parse(content) as AnalyzeResponse
    return NextResponse.json(parsed)
  } catch {
    return NextResponse.json({ error: 'Failed to parse AI response.' }, { status: 500 })
  }
}
