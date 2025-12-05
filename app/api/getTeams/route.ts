import { NextRequest, NextResponse } from 'next/server'
  import connectToDB from '../../../lib/database'
  import TeamRegistration from '../../../models/Team.model'
  import Video from '../../../models/video'
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
      // const token: string | undefined = body?.token
      const pageRaw = body?.page
      const limitRaw = body?.limit
      const locationFilter: string = (body?.locationFilter ?? 'all') as string
      const institutionFilter: string = (body?.institutionFilter ?? 'all') as string

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

      // Base filter: Only include approved registrations
      const filter: any = { registrationStatus: 'approved' }

      // Apply location filter
      if (locationFilter && locationFilter !== 'all') {
        if (locationFilter === 'maharashtra' || locationFilter === 'maharastra') {
          // Teams within Maharashtra, India
          filter.country = 'India'
          filter.state = { $regex: /^maharashtra$/i }
        } else if (locationFilter === 'non-maharashtra') {
          // Teams within India but outside Maharashtra
          filter.country = 'India'
          filter.state = { $not: { $regex: /^maharashtra$/i } }
        } else if (locationFilter === 'international') {
          // Teams outside India
          filter.country = { $not: { $regex: /^india$/i } }
        }
      }

      // Apply institution filter
      if (institutionFilter && institutionFilter !== 'all') {
        const pccoeRegex = /(pccoe|pimpri\s*chinchwad\s*college\s*of\s*engineering)/i
        if (institutionFilter === 'pccoe') {
          filter.institution = { $regex: pccoeRegex }
        } else if (institutionFilter === 'other') {
          filter.institution = { $not: { $regex: pccoeRegex } }
        }
      }

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
            state: 1,
            country: 1,
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

      const sortedResults = (results as any[]).sort((a, b) => {
        const byVideo = Number(Boolean(b.videoUrl)) - Number(Boolean(a.videoUrl))
        if (byVideo !== 0) return byVideo
        return new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime()
      })


      const totalPages = Math.max(1, Math.ceil(total / limit))

      return NextResponse.json({ data: sortedResults, pagination: { page, limit, total, totalPages } })
    } catch (error) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
