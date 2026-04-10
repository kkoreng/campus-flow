import { NextRequest, NextResponse } from 'next/server'
import { getUserById, saveUserSnapshot, saveAssignments, toPublicUser } from '../../../lib/server/userStore'

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
  const body = await request.json()
  let saved
  if (body.assignments !== undefined) {
    saved = await saveAssignments(id, body.assignments)
  } else if (body.profile?.userNote !== undefined && Object.keys(body.profile).length === 1) {
    // userNote-only patch — merge into existing profile
    const existing = await (await import('../../../lib/server/userStore')).getUserById(id)
    if (!existing) return NextResponse.json({ error: 'User not found.' }, { status: 404 })
    saved = await saveUserSnapshot(id, {
      profile: { ...existing.profile, userNote: body.profile.userNote },
      icsUrl: existing.icsUrl,
    })
  } else {
    saved = await saveUserSnapshot(id, { profile: body.profile, icsUrl: body.icsUrl })
  }

  if (!saved) {
    return NextResponse.json({ error: 'User not found.' }, { status: 404 })
  }

  return NextResponse.json({ user: toPublicUser(saved) })
}
