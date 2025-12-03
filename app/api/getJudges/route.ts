import { NextRequest, NextResponse } from 'next/server'
import connectToDB from '../../../lib/database'
import User from '../../../models/user'
import { verifyToken } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || "Unauthenticated" },
        { status: 401 }
      )
    }

    const body = await request.json()
    const pageRaw = body?.page
    const limitRaw = body?.limit
    // const token: string | undefined = body?.token

    // sanitize pagination
    let page = Number.parseInt(String(pageRaw ?? 1), 10)
    let limit = Number.parseInt(String(limitRaw ?? 10), 10)
    if (!Number.isFinite(page) || page < 1) page = 1
    if (!Number.isFinite(limit) || limit < 1) limit = 10
    if (limit > 100) limit = 100
    const skip = (page - 1) * limit

    await connectToDB()

    const match = { role: 'judge' }

    const [docs, total] = await Promise.all([
      User.find(match)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select('username role createdAt managerId assignedTeams')
        .lean(),
      User.countDocuments(match),
    ])

    console.log(docs);

    const users = docs.map((u: any) => ({
      id: String(u._id),
      username: u.username,
      role: 'judge',
      name: u.username, // frontend expects a name; use username
      email: undefined, // model has no email; keep undefined
      managerId: u.managerId ? String(u.managerId) : undefined,
      createdAt: u.createdAt ?? undefined,
      assignedTeams: Array.isArray(u.assignedTeams) ? u.assignedTeams.map(String) : [],
    }))

    console.log(users);

    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({
      users,
      pagination: { page, limit, total, totalPages },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
     
