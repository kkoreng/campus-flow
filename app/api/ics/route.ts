import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return Response.json({ error: 'Missing url parameter' }, { status: 400 })
  }

  // Only allow http/https URLs
  if (!/^https?:\/\//i.test(url)) {
    return Response.json({ error: 'Invalid URL' }, { status: 400 })
  }

  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'CampusFlow/1.0' },
      cache: 'no-store',
    })
    if (!res.ok) {
      return Response.json({ error: `Upstream error: ${res.status}` }, { status: 502 })
    }
    const text = await res.text()
    return new Response(text, {
      headers: { 'Content-Type': 'text/calendar; charset=utf-8' },
    })
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 })
  }
}
