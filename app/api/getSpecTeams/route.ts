import { NextResponse } from "next/server"
import connectToDB from "@/lib/database"
import Video from "@/models/video"
import User from "@/models/user"
import mongoose from "mongoose"
import TeamRegistration from "../../../models/Team.model"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const judgeRaw = searchParams.get("judge")?.trim()

    if (!judgeRaw) {
      return NextResponse.json({ error: "Missing 'judge' query parameter" }, { status: 400 })
    }

    await connectToDB()

    const judge = judgeRaw.toLowerCase()

    // Resolve judge user and their assigned teamIds
    let userDoc =
      (await User.findOne({ $or: [{ username: judge }, { email: judge }] }).lean()) ||
      (mongoose.isValidObjectId(judgeRaw) ? await User.findById(judgeRaw).lean() : null)

    const assignedTeamIds: string[] = !Array.isArray(userDoc) && userDoc?.assignedTeams ? userDoc.assignedTeams : []

    const query = assignedTeamIds.length
      ? { teamId: { $in: assignedTeamIds } }
      : { assignedJudge: judge }

    const videos = await Video.find(query).sort({ submittedAt: -1 }).lean()

    const teamIds = (videos as any[]).map((v) => v.teamId).filter(Boolean)
    const regs =
      teamIds.length > 0
        ? await TeamRegistration.find({ registrationNumber: { $in: teamIds } })
            .select({ registrationNumber: 1, "presentationPPT.fileUrl": 1 })
            .lean()
        : []
    const pptMap = new Map<string, string | undefined>(
      (regs as any[]).map((r) => [r.registrationNumber, r?.presentationPPT?.fileUrl])
    )

    const data = (videos as any[]).map((v) => ({
      ...v,
      _id: v._id?.toString?.(),
      submittedAt: v.submittedAt instanceof Date ? v.submittedAt.toISOString() : v.submittedAt,
      createdAt: v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
      updatedAt: v.updatedAt instanceof Date ? v.updatedAt.toISOString() : v.updatedAt,
      pptUrl: pptMap.get(v.teamId),
    }))

    return NextResponse.json({ data }, { status: 200 })
  } catch (err) {
    console.error("GET /api/getSpecTeams error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
