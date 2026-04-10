import { NextRequest, NextResponse } from 'next/server'
import { registerAndPersist, toPublicUser } from '../../../lib/server/userStore'

export async function POST(request: NextRequest) {
  const { name, email, password } = await request.json()
  const normalizedName = typeof name === 'string' ? name.trim() : ''
  const normalizedEmail = typeof email === 'string' ? email.trim() : ''
  const normalizedPassword = typeof password === 'string' ? password : ''

  if (!normalizedName || !normalizedEmail || !normalizedPassword) {
    return NextResponse.json({ error: 'Name, email, and password are required.' }, { status: 400 })
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailPattern.test(normalizedEmail)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  }

  if (normalizedPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
  }

  const result = await registerAndPersist({
    name: normalizedName,
    email: normalizedEmail,
    password: normalizedPassword,
  })

  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 409 })
  }

  return NextResponse.json({ user: toPublicUser(result.user) }, { status: 201 })
}
