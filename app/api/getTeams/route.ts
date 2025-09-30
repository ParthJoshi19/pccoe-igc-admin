import { NextRequest, NextResponse } from 'next/server'
import connectToDB from '../../../lib/database'
import TeamRegistration from '../../../models/Team.model'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    // const token: string | undefined = body?.token
    const pageRaw = body?.page
    const limitRaw = body?.limit

    // if (!token) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    // sanitize pagination
    let page = Number.parseInt(String(pageRaw ?? 1), 10)
    let limit = Number.parseInt(String(limitRaw ?? 10), 10)
    if (!Number.isFinite(page) || page < 1) page = 1
    if (!Number.isFinite(limit) || limit < 1) limit = 10
    // optional: cap limit
    if (limit > 100) limit = 100

    // NEW: fetch approved teams that have submitted videos
    await connectToDB()

    const matchStage = {
      registrationStatus: 'approved',
      teamId: { $exists: true, $ne: null },
    } as any

    const skip = (page - 1) * limit

    const [results, totalAgg] = await Promise.all([
      TeamRegistration.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: 'videos',               // video model collection
            localField: 'teamId',         // registration id in team model
            foreignField: 'teamId',       // registration id in video model
            as: 'video',
          },
        },
        { $unwind: '$video' },            // only teams with a video
        // NEW: lookup the assigned judge user (by username = email stored in video.assignedJudge)
        {
          $lookup: {
            from: 'users',
            let: { judgeUsername: '$video.assignedJudge' },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $and: [
                      { $eq: ['$username', '$$judgeUsername'] },
                      { $eq: ['$role', 'judge'] }
                    ]
                  }
                }
              },
              { $project: { _id: 1, username: 1 } }
            ],
            as: 'assignedJudgeUser'
          }
        },
        { $sort: { submittedAt: -1 } },
        { $skip: skip },
        { $limit: limit },
        {
          $project: {
            _id: 0,
            teamId: 1,
            teamName: 1,
            registrationNumber: 1,
            leaderEmail: 1,
            track: 1,
            institution: 1,
            submittedAt: 1,
            // NEW: include PPT URL
            pptUrl: '$presentationPPT.fileUrl',
            // NEW: return assigned judge at top-level for easy consumption
            assignedJudgeEmail: '$video.assignedJudge',
            assignedJudgeId: { $arrayElemAt: ['$assignedJudgeUser._id', 0] },
            video: {
              videoUrl: '$video.videoUrl',
              status: '$video.status',
              submittedAt: '$video.submittedAt',
              finalScore: '$video.finalScore',
              // NEW: also include inside video object
              assignedJudge: '$video.assignedJudge',
            },
          },
        },
      ]),
      TeamRegistration.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: 'videos',
            localField: 'teamId',
            foreignField: 'teamId',
            as: 'video',
          },
        },
        { $unwind: '$video' },
        { $count: 'count' },
      ]),
    ])

    const total = totalAgg?.[0]?.count ?? 0
    const totalPages = Math.max(1, Math.ceil(total / limit))

    return NextResponse.json({
      data: results,
      pagination: { page, limit, total, totalPages },
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
