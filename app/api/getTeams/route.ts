import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const token: string | undefined = body?.token
    const pageRaw = body?.page
    const limitRaw = body?.limit

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // sanitize pagination
    let page = Number.parseInt(String(pageRaw ?? 1), 10)
    let limit = Number.parseInt(String(limitRaw ?? 10), 10)
    if (!Number.isFinite(page) || page < 1) page = 1
    if (!Number.isFinite(limit) || limit < 1) limit = 10
    // optional: cap limit
    if (limit > 100) limit = 100

    const url = new URL(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/team-registrations`)
    url.searchParams.set('page', String(page))
    url.searchParams.set('limit', String(limit))

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })

    if (!response.ok) {
      const err = await response.text().catch(() => '')
      return NextResponse.json(
        { error: 'Failed to fetch teams', details: err || undefined },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
