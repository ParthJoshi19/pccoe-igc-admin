import { NextResponse } from "next/server";
import connectToDB from "@/lib/database";
import User from "@/models/user";
import Video from "@/models/video";

/**
 * POST /api/assignTeams
 *
 * No payload required.
 * Behaviour:
 *  - Fetch all judges.
 *  - Fetch all videos with no assignedJudge.
 *  - Assign videos in order to judges, respecting a max of 4 videos per judge.
 */
export async function POST(request: Request) {
  try {
    await connectToDB();

    const { CAP } = await request.json();
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

      // Aggregate current counts per judge
      const countsAgg = await Video.aggregate([
        { $match: { assignedJudge: { $nin: [null, ""] } } },
        { $group: { _id: "$assignedJudge", count: { $sum: 1 } } },
      ]);

      const countsMap = new Map<string, number>();
      countsAgg.forEach((c: any) => countsMap.set(c._id, c.count));
      judges.forEach((j) => {
        if (!countsMap.has(j.username)) countsMap.set(j.username, 0);
      });

      // Unassigned videos (no assignedJudge)
      const unassignedVideos = await Video.find({ $or: [ { assignedJudge: null }, { assignedJudge: "" } ] })
        .select({ teamId: 1, assignedJudge: 1, videoUrl: 1, submittedAt: 1 })
        .sort({ submittedAt: 1 }) // earliest first
        .lean();

      const assignments: { teamId: string; judge: string }[] = [];
      const skipped: string[] = [];

      // Helper to get next judge with least load
      const pickJudge = () => {
        let candidate: { username: string; count: number } | null = null;
        for (const j of judges) {
          const count = countsMap.get(j.username) || 0;
          if (count >= CAP) continue;
          if (!candidate || count < candidate.count) {
            candidate = { username: j.username, count };
          }
        }
        return candidate;
      };

      for (const v of unassignedVideos) {
        const judgeCandidate = pickJudge();
        if (!judgeCandidate) {
          skipped.push(v.teamId);
          continue; // no capacity left
        }
        assignments.push({ teamId: v.teamId, judge: judgeCandidate.username });
        countsMap.set(judgeCandidate.username, judgeCandidate.count + 1);
      }

      // Perform bulk updates for videos
      const videoBulk = assignments.map((a) => ({
        updateOne: {
          filter: { teamId: a.teamId },
          update: { $set: { assignedJudge: a.judge } },
        },
      }));
      if (videoBulk.length) await Video.bulkWrite(videoBulk);

      // Update users assignedTeams (addToSet) for the teams assigned
      const teamsByJudge = assignments.reduce((acc, a) => {
        acc[a.judge] = acc[a.judge] || [];
        acc[a.judge].push(a.teamId);
        return acc;
      }, {} as Record<string, string[]>);

      const userBulk = Object.entries(teamsByJudge).map(([judge, teamIds]) => ({
        updateOne: {
          filter: { role: "judge", username: judge },
          update: { $addToSet: { assignedTeams: { $each: teamIds } } },
        },
      }));
      if (userBulk.length) await User.bulkWrite(userBulk);

      // Build final counts snapshot
      const finalCounts = Array.from(countsMap.entries()).map(([judge, count]) => ({ judge, count }));

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
      { success: false, error: err?.message || "Unexpected server error" },
      { status: 500 }
    );
  }
}
