import { NextResponse } from "next/server"
import mongoose from "mongoose"
import User from "@/models/user"
import Video from "@/models/video"
import connectToDB from "@/lib/database"
import { verifyToken } from "@/lib/auth"

export async function POST(req: Request) {
  try {
    // Verify authentication
    const authResult = await verifyToken(req)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthenticated" },
        { status: 401 }
      )
    }

    const body = await req.json().catch(() => ({}))
    const teamId = String(body?.teamId ?? "").trim()
    const teamId2 = String(body?.teamId ?? "").split("PCCOE")[1].trim();
    console.log(teamId2);
    const judgeEmail = String(body?.judgeEmail ?? "").trim()
    const judgeEmailLower = judgeEmail.toLowerCase()

    // console.log("Assigning judge:", judgeEmailLower, "to team:", teamId);

    if (!teamId || !judgeEmail) {
      return NextResponse.json(
        { success: false, error: "teamId and judgeEmail are required" },
        { status: 400 }
      )
    }

    await connectToDB()

    // ------------------------------------------
    // 1️⃣ USER UPDATE BASED ON TEAM ID
    // ------------------------------------------
    await User.updateMany(
      {
        role: "judge",
        assignedTeams: teamId,
        username: { $ne: judgeEmailLower },
      },
      { $pull: { assignedTeams: teamId } }
    )

    const judge = await User.findOneAndUpdate(
      { role: "judge", username: judgeEmailLower },
      { $addToSet: { assignedTeams: teamId } },
      { new: true, projection: { username: 1, role: 1, assignedTeams: 1 } }
    ).lean()

    if (!judge) {
      return NextResponse.json(
        { success: false, error: "Judge not found" },
        { status: 404 }
      )
    }

    // ------------------------------------------
    // 2️⃣ VIDEO UPDATE BASED ON teamId
    // ------------------------------------------
    const videoUpdate = await Video.findOneAndUpdate(
        { $or:[{teamId:teamId}, {teamId:teamId2}] },
        { $set: { assignedJudge: judgeEmailLower } },
        { new: true }
      )

      // console.log("Video updated:", videoUpdate !== null);

    return NextResponse.json(
      {
        success: true,
        assignment: {
          teamId,
          judgeEmail: judgeEmailLower,
          assignedAt: new Date().toISOString(),
          videoUpdated: Boolean(videoUpdate),
        },
      },
      { status: 200 }
    )
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Unexpected error" },
      { status: 500 }
    )
  }
}
