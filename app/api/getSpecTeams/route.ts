import { NextResponse } from "next/server";
import connectToDB from "@/lib/database";
import Video from "@/models/video";
import User from "@/models/user";
import mongoose from "mongoose";
import TeamRegistration from "../../../models/Team.model";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const judgeRaw = searchParams.get("judge")?.trim();

    if (!judgeRaw) {
      return NextResponse.json(
        { error: "Missing 'judge' query parameter" },
        { status: 400 }
      );
    }

    await connectToDB();

    const judge = judgeRaw.toLowerCase();

    // Resolve judge user and their assigned teamIds (username/email/ObjectId)
    const byIdentity = await User.findOne({
      $or: [{ username: judge }, { email: judge }],
    }).lean();
    const byId = mongoose.isValidObjectId(judgeRaw)
      ? await User.findById(judgeRaw).lean()
      : null;
    const userDoc = byIdentity || byId;

    if (!userDoc) {
      return NextResponse.json(
        { error: "Judge not found" },
        { status: 404 }
      );
    }

    const assignedTeamIds: string[] = Array.isArray((userDoc as any).assignedTeams)
      ? (userDoc as any).assignedTeams
      : [];

    // If no assigned teams, short-circuit with empty payload
    if (!assignedTeamIds || assignedTeamIds.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    // console.log(assignedTeamIds);

    const ids = assignedTeamIds.map((id) => String(id).trim()).filter(Boolean);

    // Extract numeric part and build regex OR conditions for Video.teamId
    const orConditions = ids
      .map((id) => id.replace(/\s+/g, ""))
      .map((id) => id.replace(/\D/g, "")) // keep only digits
      .filter((num) => num.length > 0)
      .map((num) => ({
        teamId: { $regex: new RegExp(`^(IGC|PCCOEIGC)${num}$`, "i") },
      }));

    if (orConditions.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const query = { $or: orConditions };

    console.log("Querying videos with:", query);

    const videos = await Video.find(query).sort({ submittedAt: -1 }).lean();

    // Build a normalized set of team IDs from videos to fetch PPTs
    const teamIds = (videos as any[])
      .map((v) => String(v.teamId || "").trim())
      .filter(Boolean);

    const regs = teamIds.length > 0
      ? await TeamRegistration.find({ registrationNumber: { $in: teamIds } })
          .select({ registrationNumber: 1, "presentationPPT.fileUrl": 1 })
          .lean()
      : [];

    const pptMap = new Map<string, string | undefined>();
    for (const r of regs as any[]) {
      const regNum = String(r.registrationNumber || "").trim();
      pptMap.set(regNum, r?.presentationPPT?.fileUrl);
    }

    const data = (videos as any[]).map((v) => {
      const teamId = String(v.teamId || "").trim();
      return {
        ...v,
        _id: v._id?.toString?.(),
        submittedAt:
          v.submittedAt instanceof Date
            ? v.submittedAt.toISOString()
            : v.submittedAt,
        createdAt:
          v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
        updatedAt:
          v.updatedAt instanceof Date ? v.updatedAt.toISOString() : v.updatedAt,
        pptUrl: pptMap.get(teamId),
      };
    });
    
    // console.log("Mapped Videos with PPT URLs:", data);

    return NextResponse.json({ data }, { status: 200 });
  } catch (err) {
    console.error("GET /api/getSpecTeams error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
