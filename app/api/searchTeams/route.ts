import { NextRequest, NextResponse } from 'next/server'
import connectToDB from '../../../lib/database'
import TeamRegistration from '../../../models/Team.model'
import Video from '../../../models/video'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const query: string = String(body?.query ?? '').trim()

		if (!query) {
			return NextResponse.json({ data: [], pagination: { total: 0 } })
		}

		await connectToDB()

		// Build case-insensitive regex safely
		const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		const rx = new RegExp(safe, 'i')

		// Search within approved teams by multiple fields
		const filter = {
			registrationStatus: 'approved',
			$or: [
				{ teamName: rx },
				{ registrationNumber: rx },
				{ teamId: rx },
				{ leaderEmail: rx },
				{ mentorEmail: rx },
				{ institution: rx },
				{ track: rx },
			],
		}

		const docs = await TeamRegistration.find(filter)
			.sort({ submittedAt: -1 })
			.limit(50)
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
				instituteNOC: 1,
				idCardsPDF: 1,
			})
			.lean()

		// Attach video details if available
		const teamIds = (docs as any[])
			.map((d) => d.registrationNumber)
			.filter(Boolean)

		const videos = teamIds.length
			? await Video.find({ teamId: { $in: teamIds } })
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
			: []

		const videoMap = new Map<string, any>((videos as any[]).map((v) => [v.teamId, v]))

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

		// Optional: prioritize teams with video
		const sortedResults = (results as any[]).sort((a, b) => {
			const byVideo = Number(Boolean(b.videoUrl)) - Number(Boolean(a.videoUrl))
			if (byVideo !== 0) return byVideo
			return new Date(b.submittedAt ?? 0).getTime() - new Date(a.submittedAt ?? 0).getTime()
		})

		return NextResponse.json({ data: sortedResults, pagination: { total: sortedResults.length } })
	} catch (error) {
		return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
	}
}

