import { NextResponse } from "next/server"
import mongoose from "mongoose"
import User from "@/models/user"
import Video from "@/models/video" // add import

async function connectToDB() {
  if (mongoose.connection.readyState === 1) return
  const uri = process.env.MONGODB_URI || process.env.NEXT_PUBLIC_MONGODB_URI
  if (!uri) throw new Error("MONGODB_URI is not set")
  await mongoose.connect(uri)
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const teamId = String(body?.teamId ?? "").trim()
    const judgeEmail = String(body?.judgeEmail ?? "").trim()
    const judgeEmailLower = judgeEmail.toLowerCase()

    if (!teamId || !judgeEmail) {
      return NextResponse.json({ success: false, error: "teamId and judgeEmail are required" }, { status: 400 })
    }

    await connectToDB()

    await User.updateMany(
      { role: "judge", assignedTeams: teamId, username: { $ne: judgeEmail } },
      { $pull: { assignedTeams: teamId } }
    )

    const judge = await User.findOneAndUpdate(
      { role: "judge", username: judgeEmail },
      { $addToSet: { assignedTeams: teamId } },
      { new: true, projection: { username: 1, role: 1, assignedTeams: 1 } }
    ).lean()

    if (!judge) {
      return NextResponse.json({ success: false, error: "Judge not found" }, { status: 404 })
    }

    // Also persist on the Video document if it exists for this team
    const videoUpdate = await Video.updateOne(
      { teamId },
      { $set: { assignedJudge: judgeEmailLower } }
    )

    return NextResponse.json(
      {
        success: true,
        assignment: {
          teamId,
          judgeEmail,
          judgeId: String(judgeEmail), // FIX: return judge _id
          assignedAt: new Date().toISOString(),
          videoUpdated: videoUpdate.matchedCount > 0,
        },
      },
      { status: 200 }
    )
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || "Unexpected error" }, { status: 500 })
  }
}
