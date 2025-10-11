  import { NextRequest, NextResponse } from 'next/server'
  import connectToDB from '../../../lib/database'
  import TeamRegistration from '../../../models/Team.model'
  import Video from '../../../models/video'

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

      // Fetch ALL teams from the teams collection with pagination
      await connectToDB()

      const skip = (page - 1) * limit

      // Only include teams whose registration has been accepted (approved)
      const filter = { registrationStatus: 'approved' } as const

      const [docs, total] = await Promise.all([
        TeamRegistration.find(filter)
          .sort({ submittedAt: -1 })
          .skip(skip)
          .limit(limit)
          .select({
            _id: 0,
            teamId: 1,
            teamName: 1,
            registrationNumber: 1,
            leaderEmail: 1,
            leaderName: 1,
            institution: 1,
            program: 1,
            members: 1,
            mentorName: 1,
            mentorEmail: 1,
            topicName: 1,
            topicDescription: 1,
            track: 1,
            registrationStatus: 1,
            submittedAt: 1,
            updatedAt: 1,
            'presentationPPT.fileUrl': 1,
          })
          .lean(),
        TeamRegistration.countDocuments(filter),
      ])

      // Fetch related videos for these teams and attach if submitted
      const teamIds = (docs as any[]).map((d) => d.registrationNumber).filter(Boolean);
      // console.log(teamIds);
      const videos = teamIds.length
        ? await Video.find({ teamId: { $in: teamIds } })
            .select({
              _id: 0,
              teamId: 1,
              videoUrl: 1,
              submittedAt: 1,
              finalScore: 1,
              status: 1,
              // include assignedJudge if present in collection
              assignedJudge: 1 as any,
            })
            .lean()
        : []

      const videoMap = new Map<string, any>((videos as any[]).map((v) => [v.teamId, v]))

      // console.log(videoMap);

      const results = (docs as any[]).map((d) => {
        const v = videoMap.get(d.registrationNumber)
        return {
          ...d,
          pptUrl: d?.presentationPPT?.fileUrl,
          videoUrl: v?.videoUrl,
          assignedJudgeEmail: v?.assignedJudge,
          video: v
            ? {
                videoUrl: v.videoUrl,
                status: v.status,
                submittedAt: v.submittedAt,
                finalScore: v.finalScore,
                assignedJudge: v.assignedJudge,
              }
            : undefined,
        }
      })

      // console.log(results.map(r=>({teamId:r.registrationNumber,videoUrl:r.videoUrl})));

      const totalPages = Math.max(1, Math.ceil(total / limit))

      return NextResponse.json({ data: results, pagination: { page, limit, total, totalPages } })
    } catch (error) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
