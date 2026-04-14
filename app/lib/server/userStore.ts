import { scryptSync, timingSafeEqual } from 'node:crypto'
import { USE_MONGO, getDb } from './db'
import { jsonFindByEmail, jsonFindById, jsonInsert, jsonUpdate } from './jsonStore'
import type { UserProfile, Assignment, CampusEvent, CompletedCourse, CourseDifficulty, CurrentCourse } from '../types'

const PASSWORD_SALT = 'campusflow-static-salt'

export function hashPassword(password: string): string {
  return scryptSync(password, PASSWORD_SALT, 64).toString('hex')
}

export function verifyPassword(password: string, hash: string): boolean {
  const expected = Buffer.from(hash, 'hex')
  const actual = Buffer.from(hashPassword(password), 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export interface DbUser {
  id: string
  name: string
  email: string
  passwordHash: string
  profile: UserProfile
  assignments: Assignment[]
  events: CampusEvent[]
  icsUrl?: string
  createdAt: Date
}

export interface PublicUser {
  id: string
  name: string
  email: string
  profile: UserProfile
  assignments: Assignment[]
  events: CampusEvent[]
  icsUrl?: string
}

function normalizeCompletedCourses(input: unknown): CompletedCourse[] {
  if (!Array.isArray(input)) return []

  return input.flatMap((item) => {
    if (typeof item === 'string') {
      const name = item.trim()
      return name ? [{ name, credits: 0 }] : []
    }

    if (item && typeof item === 'object') {
      const name = 'name' in item && typeof item.name === 'string' ? item.name.trim() : ''
      const rawCredits = 'credits' in item ? Number(item.credits) : NaN
      const credits = Number.isFinite(rawCredits) ? rawCredits : 0
      return name ? [{ name, credits }] : []
    }

    return []
  })
}

function normalizeCourseKey(value: string | undefined): string {
  return (value ?? '').trim().toUpperCase()
}

function normalizeAssignments(input: Assignment[] | undefined): Assignment[] {
  return (input ?? []).map((assignment) => ({
    ...assignment,
    difficulty: assignment.difficulty ?? 'medium',
  }))
}

function syncAssignmentDifficulties(assignments: Assignment[], currentCourses: CurrentCourse[]): Assignment[] {
  const difficultyByCourse = new Map<string, CourseDifficulty>()
  for (const course of currentCourses) {
    difficultyByCourse.set(normalizeCourseKey(course.name), course.difficulty)
  }

  return assignments.map((assignment) => {
    if (assignment.completed) return assignment
    const nextDifficulty = difficultyByCourse.get(normalizeCourseKey(assignment.course))
    return nextDifficulty ? { ...assignment, difficulty: nextDifficulty } : assignment
  })
}

export function toPublicUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: {
      school: '',
      major: '',
      currentYear: 1,
      currentSemester: 'Fall' as const,
      completedCourses: normalizeCompletedCourses(user.profile?.completedCourses),
      currentCourses: [],
      dailyNotes: {},
      ...user.profile,
      completedCourses: normalizeCompletedCourses(user.profile?.completedCourses),
    },
    assignments: normalizeAssignments(user.assignments),
    events: user.events ?? [],
    icsUrl: user.icsUrl,
  }
}

export async function getUserByEmail(email: string): Promise<DbUser | null> {
  if (USE_MONGO) {
    const db = await getDb()
    return db.collection<DbUser>('users').findOne(
      { email: email.toLowerCase().trim() },
      { projection: { _id: 0 } }
    )
  }
  return jsonFindByEmail(email)
}

export async function getUserById(id: string): Promise<DbUser | null> {
  if (USE_MONGO) {
    const db = await getDb()
    return db.collection<DbUser>('users').findOne(
      { id },
      { projection: { _id: 0 } }
    )
  }
  return jsonFindById(id)
}

export async function registerAndPersist(input: {
  name: string
  email: string
  password: string
}): Promise<{ user: DbUser } | { error: string }> {
  const email = input.email.toLowerCase().trim()
  const existing = await getUserByEmail(email)
  if (existing) return { error: 'An account with this email already exists.' }

  const user: DbUser = {
    id: `user-${Date.now()}`,
    name: input.name.trim(),
    email,
    passwordHash: hashPassword(input.password),
    profile: {
      school: '',
      major: '',
      currentYear: 1,
      currentSemester: 'Fall',
      completedCourses: [],
      currentCourses: [],
      dailyNotes: {},
    },
    assignments: [],
    events: [],
    createdAt: new Date(),
  }

  if (USE_MONGO) {
    const db = await getDb()
    await db.collection<DbUser>('users').insertOne(user)
  } else {
    await jsonInsert(user)
  }

  return { user }
}

export async function saveAssignments(
  userId: string,
  assignments: Assignment[]
): Promise<DbUser | null> {
  const normalizedAssignments = normalizeAssignments(assignments)
  if (USE_MONGO) {
    const db = await getDb()
    return db.collection<DbUser>('users').findOneAndUpdate(
      { id: userId },
      { $set: { assignments: normalizedAssignments } },
      { returnDocument: 'after', projection: { _id: 0 } }
    )
  }
  return jsonUpdate(userId, { assignments: normalizedAssignments })
}

export async function saveUserSnapshot(
  userId: string,
  input: { profile: UserProfile; icsUrl?: string }
): Promise<DbUser | null> {
  const existing = await getUserById(userId)
  if (!existing) return null

  const assignments = syncAssignmentDifficulties(
    normalizeAssignments(existing.assignments),
    input.profile.currentCourses ?? []
  )

  const patch = {
    profile: input.profile,
    icsUrl: input.icsUrl?.trim() || undefined,
    assignments,
  }

  if (USE_MONGO) {
    const db = await getDb()
    return db.collection<DbUser>('users').findOneAndUpdate(
      { id: userId },
      { $set: patch },
      { returnDocument: 'after', projection: { _id: 0 } }
    )
  }
  return jsonUpdate(userId, patch)
}
