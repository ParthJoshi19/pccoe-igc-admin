import { NextResponse } from "next/server";
import connectToDB from "@/lib/database";
import User from "@/models/user";
import Video from "@/models/video";

// Returns summary needed by RunAssignments page:
// - teams with unassigned videos count
// - judges with current assignment count
// - overall totals
export async function GET() {
	try {
		await connectToDB();

		// Unassigned videos are those with null/empty assignedJudge
		const unassignedVideos = await Video.aggregate([
			{
				$match: {
					$or: [{ assignedJudge: null }, { assignedJudge: "" }],
				},
			},
			{
				$group: {
					_id: "$teamId",
					teamId: { $first: "$teamId" },
					teamName: { $first: "$teamName" },
					unassignedCount: { $sum: 1 },
				},
			},
			{ $sort: { teamId: 1 } },
		]);

		const totalUnassigned = unassignedVideos.reduce(
			(sum: number, v: any) => sum + (v.unassignedCount || 0),
			0
		);

		// Judges with how many teams currently assigned and how many videos
		const judges = await User.find({ role: "judge" })
			.select({ username: 1, assignedTeams: 1, createdAt: 1 })
			.sort({ createdAt: 1 })
			.lean();

		const videoCountsPerJudge = await Video.aggregate([
			{
				$match: { assignedJudge: { $nin: [null, ""] } },
			},
			{
				$group: {
					_id: "$assignedJudge",
					videoCount: { $sum: 1 },
				},
			},
		]);

		const videoCountMap = new Map<string, number>();
		videoCountsPerJudge.forEach((item: any) => {
			if (item?._id) {
				videoCountMap.set(item._id, item.videoCount || 0);
			}
		});

		const judgesSummary = judges.map((j) => {
			const currentAssignments = j.assignedTeams?.length || 0;
			const currentVideoAssignments = videoCountMap.get(j.username) || 0;
			return {
				id: j._id?.toString?.() ?? j.username,
				name: j.username,
				currentAssignments,
				currentVideoAssignments,
			};
		});

		const totalAssignedVideos = Array.from(videoCountMap.values()).reduce(
			(sum, c) => sum + c,
			0
		);

		return NextResponse.json(
			{
				success: true,
				teams: unassignedVideos,
				judges: judgesSummary,
				totals: {
					totalUnassignedVideos: totalUnassigned,
					totalAssignedVideos,
				},
			},
			{ status: 200 }
		);
	} catch (err: any) {
		return NextResponse.json(
			{ success: false, error: err?.message || "Unexpected server error" },
			{ status: 500 }
		);
	}
}

