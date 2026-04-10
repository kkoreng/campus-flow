import { NextRequest, NextResponse } from 'next/server'
import { getUserById, saveUserSnapshot, toPublicUser } from '../../../lib/server/userStore'

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const user = await getUserById(id)

  if (!user) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  return NextResponse.json({ user: toPublicUser(user) })
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const { profile, icsUrl } = await request.json()
  const saved = await saveUserSnapshot(id, { profile, icsUrl })

  if (!saved) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  return NextResponse.json({ user: toPublicUser(saved) })
}
