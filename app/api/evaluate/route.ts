import { NextResponse } from "next/server"
import mongoose from "mongoose"
import { verifyToken } from "@/lib/auth"

type EvalStatus = "Approved" | "Reject" | "Can be thought" | "Pending"

interface RubricItem {
  criterion?: string
  score?: number
  maxScore?: number
  comments?: string
  judge?: string
  evaluatedAt?: string | Date
}

let cached = (global as any).mongoose as
  | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
  | undefined

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null }
}

async function dbConnect() {
  const uri = process.env.MONGO_URL || process.env.MONGODB_URI
  if (!uri) throw new Error("MONGO_URL/MONGODB_URI is not set")

  if (cached!.conn) return cached!.conn
  if (!cached!.promise) {
    cached!.promise = mongoose.connect(uri).then((m) => m)
  }
  cached!.conn = await cached!.promise
  return cached!.conn
}

// ---- Schemas from prompt ----
const RubricItemSchema = new mongoose.Schema(
  {
    criterion: { type: String, required: true, trim: true },
    score: { type: Number, min: 0, default: 0 },
    maxScore: { type: Number, min: 1, default: 10 },
    comments: { type: String, trim: true },
    judge: { type: String, trim: true },
    evaluatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
)

const videoSchema = new mongoose.Schema(
  {
    teamId: { type: String, required: true, index: true },
    teamName: { type: String, required: true, trim: true },
    leaderEmail: { type: String, required: true, lowercase: true, trim: true },
    videoUrl: {
      type: String,
      required: true,
      validate: {
        validator: function (url: string) {
          const youtubeRegex =
            /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
          return youtubeRegex.test(url)
        },
        message: "Please provide a valid YouTube URL",
      },
    },
    submittedAt: { type: Date, default: Date.now },
    rubrics: { type: [RubricItemSchema], default: [] },
    finalScore: { type: Number, min: 0, default: null },
    status: {
      type: String,
      enum: ["Approved", "Reject", "Can be thought", "Pending"],
      default: "Pending",
      index: true,
    },
  },
  { timestamps: true }
)

videoSchema.index({ teamId: 1 }, { unique: true })

const Video =
  mongoose.models.Video || mongoose.model("Video", videoSchema)

// ---- Route handlers ----

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

    await dbConnect()
    const body = await req.json()
    const {
      teamId,
      status,
      finalScore,
      rubrics,
      judge,
    }: {
      teamId?: string
      status?: EvalStatus
      finalScore?: number
      rubrics?: RubricItem[]
      judge?: string
    } = body || {}

    if (!teamId || typeof teamId !== "string") {
      return NextResponse.json(
        { success: false, error: "teamId is required" },
        { status: 400 }
      )
    }

    const allowedStatuses: EvalStatus[] = [
      "Approved",
      "Reject",
      "Can be thought",
      "Pending",
    ]
    const nextStatus: EvalStatus | undefined = status && allowedStatuses.includes(status)
      ? status
      : undefined

    const update: any = { $set: {} as any }

    if (typeof finalScore === "number") {
      update.$set.finalScore = Math.max(0, finalScore)
    }
    if (nextStatus) {
      update.$set.status = nextStatus
    }

    if (Array.isArray(rubrics)) {
      const normalized = rubrics.map((r) => ({
        criterion: r.criterion || "Overall",
        score: Math.max(0, Number.isFinite(r.score as number) ? (r.score as number) : 0),
        maxScore: Math.max(1, Number.isFinite(r.maxScore as number) ? (r.maxScore as number) : 10),
        comments: r.comments || "",
        judge: r.judge || judge || "",
        evaluatedAt: r.evaluatedAt ? new Date(r.evaluatedAt) : new Date(),
      }))
      // Replace rubrics with the provided array to reflect latest evaluation
      update.$set.rubrics = normalized
    }

    if (Object.keys(update.$set).length === 0) {
      return NextResponse.json(
        { success: false, error: "Nothing to update" },
        { status: 400 }
      )
    }

    const doc = await Video.findOneAndUpdate({ teamId }, update, {
      new: true,
    })

    if (!doc) {
      return NextResponse.json(
        { success: false, error: "Team not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({ success: true, data: doc })
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
