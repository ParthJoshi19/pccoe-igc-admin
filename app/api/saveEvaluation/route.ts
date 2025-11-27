import { NextResponse } from "next/server"
import connectToDB from "@/lib/database"
import Video from "@/models/video"

type EvalStatus = "Approved" | "Reject" | "Can be thought" | "Pending"

interface RubricItem {
  criterion?: string
  score?: number
  maxScore?: number
  comments?: string
  judge?: string
  evaluatedAt?: string | Date
}

export async function POST(req: Request) {
  try {
    await connectToDB()

    const body = await req.json().catch(() => ({}))
    const {
      teamId,
      status,
      finalScore,
      feedback, // optional, usually folded into rubrics[...].comments
      rubrics,
    }: {
      teamId?: string
      status?: EvalStatus
      finalScore?: number
      feedback?: string
      rubrics?: RubricItem[]
    } = body || {}

    if (!teamId || typeof teamId !== "string") {
      return NextResponse.json({ error: "teamId is required" }, { status: 400 })
    }

    const allowedStatuses: EvalStatus[] = ["Approved", "Reject", "Can be thought", "Pending"]
    const nextStatus: EvalStatus | undefined = status && allowedStatuses.includes(status) ? status : undefined

    const update: any = { $set: {} as any }

    if (typeof finalScore === "number" && isFinite(finalScore)) {
      update.$set.finalScore = Math.max(0, finalScore)
    }
    if (nextStatus) {
      update.$set.status = nextStatus
    }

    if (Array.isArray(rubrics) && rubrics.length > 0) {
      const normalized = rubrics.map((r) => ({
        criterion: r.criterion || "Overall",
        score: Math.max(0, Number.isFinite(r.score as number) ? (r.score as number) : 0),
        maxScore: Math.max(1, Number.isFinite(r.maxScore as number) ? (r.maxScore as number) : 10),
        comments: r.comments || feedback || "",
        judge: r.judge || "",
        evaluatedAt: r.evaluatedAt ? new Date(r.evaluatedAt) : new Date(),
      }))
      update.$set.rubrics = normalized
    } else if (typeof feedback === "string" && feedback.trim().length > 0) {
      update.$set.rubrics = [
        {
          criterion: "Overall",
          score: typeof finalScore === "number" && isFinite(finalScore) ? Math.max(0, finalScore) : 0,
          maxScore: 5,
          comments: feedback.trim(),
          judge: "",
          evaluatedAt: new Date(),
        },
      ]
    }

    if (Object.keys(update.$set).length === 0) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
    }

    const doc = await Video.findOneAndUpdate({ teamId }, update, { new: true }).lean()
    if (!doc || (Array.isArray(doc) && doc.length === 0)) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 })
    }

    const singleDoc = Array.isArray(doc) ? doc[0] : doc

    // Normalize date fields for JSON
    const normalized = {
      ...singleDoc,
      _id: (singleDoc as any)._id?.toString?.(),
      submittedAt:
        (singleDoc as any).submittedAt instanceof Date
          ? (singleDoc as any).submittedAt.toISOString()
          : (singleDoc as any).submittedAt,
      createdAt:
        (singleDoc as any).createdAt instanceof Date
          ? (singleDoc as any).createdAt.toISOString()
          : (singleDoc as any).createdAt,
      updatedAt:
        (singleDoc as any).updatedAt instanceof Date
          ? (singleDoc as any).updatedAt.toISOString()
          : (singleDoc as any).updatedAt,
    }

    return NextResponse.json({ data: normalized }, { status: 200 })
  } catch (err) {
    console.error("POST /api/saveEvaluation error:", err)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
