// ── Assignments ─────────────────────────────────────────────────
export type AssignmentType = 'homework' | 'exam' | 'project' | 'quiz' | 'lab' | 'other'

export interface Assignment {
  id: number
  title: string
  course: string
  dueDate: string
  dueTime?: string
  type: AssignmentType
  completed: boolean
}

// ── Events ──────────────────────────────────────────────────────
export type EventCategory = 'academic' | 'career' | 'social' | 'sports' | 'club' | 'other'

export interface CampusEvent {
  id: number
  title: string
  date: string
  time?: string
  location?: string
  category: EventCategory
  description?: string
}

// ── Academic Profile ─────────────────────────────────────────────
export type Season = 'Fall' | 'Spring' | 'Summer'

export interface UserProfile {
  school: string
  major: string
  currentYear: number
  currentSemester: Season
  completedCourses: string[]
}
