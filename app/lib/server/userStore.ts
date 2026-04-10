import { scryptSync, timingSafeEqual } from 'node:crypto'
import { USE_MONGO, getDb } from './db'
import { jsonFindByEmail, jsonFindById, jsonInsert, jsonUpdate } from './jsonStore'
import type { UserProfile, Assignment, CampusEvent } from '../types'

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

export function toPublicUser(user: DbUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    profile: user.profile,
    assignments: user.assignments,
    events: user.events,
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
  if (USE_MONGO) {
    const db = await getDb()
    return db.collection<DbUser>('users').findOneAndUpdate(
      { id: userId },
      { $set: { assignments } },
      { returnDocument: 'after', projection: { _id: 0 } }
    )
  }
  return jsonUpdate(userId, { assignments })
}

export async function saveUserSnapshot(
  userId: string,
  input: { profile: UserProfile; icsUrl?: string }
): Promise<DbUser | null> {
  const patch = { profile: input.profile, icsUrl: input.icsUrl?.trim() || undefined }

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
