import { NextResponse } from "next/server";
import connectToDB from "@/lib/database";
import User from "@/models/user";
import Video from "@/models/video";
import { verifyToken } from "@/lib/auth";

/**
 * POST /api/assignTeams
 *
 * Expected Payload:
 *  { CAP: number }  // max videos per judge
 *
 * Behaviour:
 * 1. Fetch all judges
 * 2. Fetch all videos that need assignment (assignedJudge null/empty or forced reassignment)
 * 3. Assign videos while respecting CAP
 * 4. Update both:
 *    - Video.assignedJudge
 *    - User.assignedTeams
 */
export async function POST(request: Request) {
  try {
    // Verify authentication
    const authResult = await verifyToken(request)
    if (!authResult.authenticated) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Unauthenticated" },
        { status: 401 }
      )
    }

    await connectToDB();

    const { CAP } = await request.json();
    if (!CAP || typeof CAP !== "number") {
      return NextResponse.json(
        { success: false, error: "CAP (number) is required" },
        { status: 400 }
      );
    }

    // 1. Fetch judges
    const judges = await User.find({ role: "judge" })
      .select({ username: 1 })
      .sort({ createdAt: 1 })
      .lean();

    if (!judges.length) {
      return NextResponse.json(
        { success: false, error: "No judges available" },
        { status: 400 }
      );
    }

    // 2. Build current assigned video counts per judge
    const existingCounts = await Video.aggregate([
      { $match: { assignedJudge: { $nin: [null, ""] } } },
      { $group: { _id: "$assignedJudge", count: { $sum: 1 } } },
    ]);

    const countsMap = new Map<string, number>();
    existingCounts.forEach((c: any) => countsMap.set(c._id, c.count));
    judges.forEach((j) => {
      if (!countsMap.has(j.username)) countsMap.set(j.username, 0);
    });

    // 3. Get all videos needing assignment
    const videosToAssign = await Video.find({
      $or: [
        { assignedJudge: null },
        { assignedJudge: "" },
        { forceReassign: true }, // optional support
      ],
    })
      .select({ teamId: 1, videoUrl: 1, submittedAt: 1 })
      .sort({ submittedAt: 1 })
      .lean();

    const assignments: { teamId: string; judge: string }[] = [];
    const skipped: string[] = [];

    // Helper function to pick judge with minimum load
    const pickJudge = (): { username: string; count: number } | null => {
      let best: { username: string; count: number } | null = null;
      for (const j of judges) {
        const count = countsMap.get(j.username) || 0;
        if (count >= CAP) continue;

        if (!best || count < best.count) {
          best = { username: j.username, count };
        }
      }
      return best;
    };

    // 4. Assign videos
    for (const vid of videosToAssign) {
      const chosen = pickJudge();
      if (!chosen) {
        skipped.push(vid.teamId);
        continue;
      }

      assignments.push({ teamId: vid.teamId, judge: chosen.username });
      countsMap.set(chosen.username, chosen.count + 1);
    }

    // 5. Bulk update Videos (ALWAYS update)
    const videoBulk = assignments.map((a) => ({
      updateOne: {
        filter: { teamId: a.teamId },
        update: {
          $set: {
            assignedJudge: a.judge,
          },
        },
      },
    }));

    if (videoBulk.length) await Video.bulkWrite(videoBulk);

    // 6. Bulk update Users (assignedTeams array)
    const teamsByJudge = assignments.reduce((acc, a) => {
      acc[a.judge] = acc[a.judge] || [];
      acc[a.judge].push(a.teamId);
      return acc;
    }, {} as Record<string, string[]>);

    const userBulk = Object.entries(teamsByJudge).map(([judge, list]) => ({
      updateOne: {
        filter: { role: "judge", username: judge },
        update: { $addToSet: { assignedTeams: { $each: list } } },
      },
    }));

    if (userBulk.length) await User.bulkWrite(userBulk);

    // 7. Build final judge count snapshot
    const finalCounts = Array.from(countsMap.entries()).map(
      ([judge, count]) => ({ judge, count })
    );

    return NextResponse.json(
      {
        success: true,
        assignedCount: assignments.length,
        assignments,
        skipped,
        judges: finalCounts,
        capacity: CAP,
      },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        success: false,
        error: err?.message || "Unexpected server error",
      },
      { status: 500 }
    );
  }
}
