import { NextResponse } from "next/server";
import connectToDB from "@/lib/database";
import Team from "@/models/Team.model";
import Video from "@/models/video";

export async function POST() {
	try {
		await connectToDB();

		const [
			totalVideos,
			totalTeams,
			approvedTeams,
			pendingTeams,
			rejectedTeams,
		] = await Promise.all([
			Video.countDocuments({}),
			Team.countDocuments({}),
			Video.countDocuments({ status: "Approved" }),
			Video.countDocuments({ status: "Pending" }),
			Video.countDocuments({ status: "Reject" }),
		]);

		return NextResponse.json({
			success: true,
			counts: {
				videos: totalVideos,
				teams: {
					total: totalTeams,
					approved: approvedTeams,
					pending: pendingTeams,
					rejected: rejectedTeams,
				},
			},
		});
	} catch (error: any) {
		console.error("getCounts error:", error);
		return NextResponse.json(
			{ success: false, error: error?.message || "Internal Server Error" },
			{ status: 500 }
		);
	}
}

export async function GET() {
	// Support GET for convenience
	return POST();
}
