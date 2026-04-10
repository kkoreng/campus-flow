import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { DbUser } from './userStore'

const DB_PATH = path.join(process.cwd(), 'data', 'db.json')

interface JsonDb {
  users: DbUser[]
}

async function read(): Promise<JsonDb> {
  try {
    const raw = await fs.readFile(DB_PATH, 'utf8')
    return JSON.parse(raw)
  } catch {
    return { users: [] }
  }
}

async function write(db: JsonDb): Promise<void> {
  await fs.mkdir(path.dirname(DB_PATH), { recursive: true })
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), 'utf8')
}

export async function jsonFindByEmail(email: string): Promise<DbUser | null> {
  const db = await read()
  return db.users.find((u) => u.email === email.toLowerCase().trim()) ?? null
}

export async function jsonFindById(id: string): Promise<DbUser | null> {
  const db = await read()
  return db.users.find((u) => u.id === id) ?? null
}

export async function jsonInsert(user: DbUser): Promise<void> {
  const db = await read()
  db.users.push(user)
  await write(db)
}

export async function jsonUpdate(
  id: string,
  patch: Partial<DbUser>
): Promise<DbUser | null> {
  const db = await read()
  const idx = db.users.findIndex((u) => u.id === id)
  if (idx === -1) return null
  db.users[idx] = { ...db.users[idx], ...patch }
  await write(db)
  return db.users[idx]
}
