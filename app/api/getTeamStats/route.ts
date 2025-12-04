import { NextRequest, NextResponse } from 'next/server'
import connectToDB from '../../../lib/database'
import TeamRegistration from '../../../models/Team.model'
import Video from '../../../models/video'
import { verifyToken } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { error: authResult.error || "Unauthenticated" },
        { status: 401 }
      )
    }

    await connectToDB()

    // Get all approved teams
    const approvedTeams = await TeamRegistration.find({ registrationStatus: 'approved' })
      .select('registrationNumber state institution')
      .lean()

    // Get all teams that have submitted videos
    const videosSubmitted = await Video.find({})
      .select('teamId')
      .lean()

    // Create a set of teamIds that have videos
    const teamIdsWithVideos = new Set(
      videosSubmitted.map((v: any) => {
        // Extract numeric part from teamId (e.g., "IGC123" or "PCCOEIGC123" -> "123")
        const numericPart = v.teamId.replace(/\D/g, '');
        return numericPart;
      })
    )

    // Filter teams that are approved AND have submitted videos
    const teamsWithVideos = approvedTeams.filter((t: any) => {
      const regNum = t.registrationNumber || '';
      const numericPart = regNum.replace(/\D/g, '');
      return teamIdsWithVideos.has(numericPart);
    })

    // Calculate statistics
    const maharashtraTeams = teamsWithVideos.filter(
      (t: any) => t.state?.toLowerCase() === 'maharashtra'
    ).length

    const outOfMaharashtraTeams = teamsWithVideos.filter(
      (t: any) => t.state?.toLowerCase() !== 'maharashtra'
    ).length

    const pccoeTeams = teamsWithVideos.filter((t: any) =>
      t.institution?.toLowerCase().includes('pccoe') ||
      t.institution?.toLowerCase().includes('pimpri chinchwad college of engineering')
    ).length

    const nonPccoeTeams = teamsWithVideos.filter((t: any) =>
      !t.institution?.toLowerCase().includes('pccoe') &&
      !t.institution?.toLowerCase().includes('pimpri chinchwad college of engineering')
    ).length

    return NextResponse.json({
      success: true,
      stats: {
        totalTeams: teamsWithVideos.length,
        regional: {
          maharashtra: maharashtraTeams,
          outsideMaharashtra: outOfMaharashtraTeams
        },
        institutional: {
          pccoe: pccoeTeams,
          nonPccoe: nonPccoeTeams
        }
      }
    })
  } catch (error) {
    console.error('Failed to fetch team stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
