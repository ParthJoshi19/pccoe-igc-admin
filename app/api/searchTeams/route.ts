import { NextRequest, NextResponse } from 'next/server'
import connectToDB from '../../../lib/database'
import TeamRegistration from '../../../models/Team.model'
import Video from '../../../models/video'
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
		const query: string = String(body?.query ?? '').trim()

		if (!query) {
			return NextResponse.json({ data: [], pagination: { total: 0 } })
		}

		await connectToDB()

		// Build case-insensitive regex safely
		const safe = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
		const rx = new RegExp(safe, 'i')

		// Support searching by numeric part for both formats: PCCOEIGC{num} and IGC{num}
		const numMatch = query.match(/(\d{1,})/) // extract any number in the query
		const possibleIds: string[] = []
		if (numMatch) {
			const n = numMatch[1]
			possibleIds.push(`PCCOEIGC${n}`)
			possibleIds.push(`IGC${n}`)
		}

		// Search within approved teams by multiple fields
		const filter = {
			registrationStatus: 'approved',
			$or: [
				// free-text fields
				{ teamName: rx },
				{ registrationNumber: rx },
				{ teamId: rx },
				{ leaderEmail: rx },
				{ mentorEmail: rx },
				{ institution: rx },
				{ track: rx },
				// exact match by normalized numeric id for both formats
				...(possibleIds.length
					? [
						{ teamId: { $in: possibleIds } },
						{ registrationNumber: { $in: possibleIds } },
					]
					: []),
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
		const teamIds = Array.from(
			new Set(
				(docs as any[])
					.flatMap((d) => [d.registrationNumber, d.teamId])
					.filter(Boolean)
					.map(String)
			)
		)

		// Build final list of IDs to query videos: include possibleIds from query
		const videoQueryIds = Array.from(new Set([...(teamIds || []), ...(possibleIds || [])]))

		// Build regex-based OR conditions to match either prefix with the numeric part
		const orConditions = (videoQueryIds || [])
			.map((id) => String(id))
			.map((id) => id.replace(/\s+/g, ''))
			.map((id) => id.replace(/\D/g, '')) // keep only digits
			.filter((num) => num.length > 0)
			.map((num) => ({ teamId: { $regex: new RegExp(`^(IGC|PCCOEIGC)${num}$`, 'i') } }))

		// console.log('Video query conditions:', orConditions)

		const videos = (orConditions.length > 0)
			? await Video.find({ $or: orConditions })
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

		// Normalize IDs by extracting numeric part for reliable joining
		const normalizeId = (id?: string) => String(id || '').replace(/\s+/g, '').replace(/\D/g, '')

		// Map videos by normalized numeric id
		const videoMap = new Map<string, any>((videos as any[]).map((v) => [normalizeId(v.teamId), v]))

		// Fetch judge display names by username (assignedJudge)
		const judgeUsernames = Array.from(
			new Set((videos as any[]).map((v) => v.assignedJudge).filter(Boolean))
		)
		const judges = judgeUsernames.length
			? await User.find({ username: { $in: judgeUsernames } })
					.select({ username: 1 })
					.lean()
			: []
		const judgeNameMap = new Map<string, string>(
			(judges as any[]).map((j) => [j.username, j.username])
		)

		const results = (docs as any[]).map((d) => {
			// Join by normalized numeric id from either field
			const v = videoMap.get(normalizeId(d.registrationNumber)) || videoMap.get(normalizeId(d.teamId))
			const assignedJudge = v?.assignedJudge
			const assignedJudgeName = assignedJudge ? judgeNameMap.get(assignedJudge) || assignedJudge : undefined
			return {
				...d,
				pptUrl: d?.presentationPPT?.fileUrl,
				videoUrl: v?.videoUrl,
				assignedJudgeId: v?.assignedJudge,
				video: v
					? {
							videoUrl: v.videoUrl,
							status: v.status,
							submittedAt: v.submittedAt,
							finalScore: v.finalScore,
							assignedJudgeId: v.assignedJudge,
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

