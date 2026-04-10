import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, verifyPassword, toPublicUser } from '../../../lib/server/userStore'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()
  const normalizedEmail = typeof email === 'string' ? email.trim() : ''
  const normalizedPassword = typeof password === 'string' ? password : ''

  if (!normalizedEmail || !normalizedPassword) {
    return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 })
  }

  const user = await getUserByEmail(normalizedEmail)

  if (!user || !verifyPassword(normalizedPassword, user.passwordHash)) {
    return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
  }

  return NextResponse.json({ user: toPublicUser(user) })
}
