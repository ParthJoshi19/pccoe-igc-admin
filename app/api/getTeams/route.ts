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
      const countryFilter: string = (body?.countryFilter ?? 'all') as string
      const stateFilter: string = (body?.stateFilter ?? 'all') as string

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

      // Connect to DB
      await connectToDB()

      const skip = (page - 1) * limit

      // First, fetch videos (primary list) and then enrich with team details
      const videos = await Video.find({  })
        .sort({ submittedAt: -1 })
        .skip(skip)
        .limit(limit)
        .select({
          _id: 0,
          teamId: 1,
          videoUrl: 1,
          submittedAt: 1,
          finalScore: 1,
          status: 1,
          assignedJudge: 1 as any,
        })
        .lean()

      const videoTeamIds = (videos as any[]).map((v) => v.teamId).filter(Boolean)

      // Base filter for teams: Only include approved registrations
      const filter: any = { registrationStatus: 'approved' }

      // If we have video teamIds, restrict teams to those; otherwise keep filter open
      if (videoTeamIds.length) {
        filter.registrationNumber = { $in: videoTeamIds }
      }

      // Apply location filter
      if (locationFilter && locationFilter !== 'all') {
        if (locationFilter === 'maharashtra' || locationFilter === 'maharastra') {
          filter.country = 'India'
          filter.state = { $regex: /^maharashtra$/i }
        } else if (locationFilter === 'non-maharashtra') {
          filter.country = 'India'
          filter.state = { $not: { $regex: /^maharashtra$/i } }
        } else if (locationFilter === 'international') {
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

      // Apply country filter
      if (countryFilter && countryFilter !== 'all') {
        if (countryFilter === 'india') {
          filter.country = { $regex: /^india$/i }
        } else if (countryFilter === 'non-india') {
          filter.country = { $not: { $regex: /^india$/i } }
        } else {
          // exact match if a specific country name is provided
          filter.country = { $regex: new RegExp(`^${countryFilter}$`, 'i') }
        }
      }

      // Apply state filter
      if (stateFilter && stateFilter !== 'all') {
        // exact match if a specific state name is provided (case-insensitive)
        filter.state = { $regex: new RegExp(`^${stateFilter}$`, 'i') }
      }

      // Fetch teams corresponding to the selected videos (or all if no videos matched)
      const [docs, totalTeams] = await Promise.all([
        TeamRegistration.find(filter)
          .sort({ submittedAt: -1 })
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

      const totalPages = Math.max(1, Math.ceil(totalTeams / limit))

      return NextResponse.json({ data: sortedResults, pagination: { page, limit, total: totalTeams, totalPages } })
    } catch (error) {
      return NextResponse.json(
        { error: 'Internal server error' },
        { status: 500 }
      )
    }
  }
