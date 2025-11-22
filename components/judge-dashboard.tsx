"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { CheckCircle, Clock, XCircle, Eye, ExternalLink, Video, Calendar, User, FileText, Star, Loader2 as Loader } from "lucide-react"
import {  type Team } from "@/lib/auth"
import { useAuth } from "@/contexts/auth-context"

interface TeamEvaluation {
  teamId: string
  // Use backend statuses
  status: "Pending" | "Approved" | "Reject" | "Can be thought"
  feedback: string
  rating: number // mapped to finalScore (0-5)
  evaluatedAt?: Date
}

// Add local rubric type
interface RubricItem {
  criterion: string
  score: number
  maxScore: number
  comments?: string
  judge?: string
  evaluatedAt?: Date
}

// Seed defaults for marking breakdown
const defaultRubrics: RubricItem[] = [
  { criterion: "Innovation", score: 0, maxScore: 10, comments: "" },
  { criterion: "Execution", score: 0, maxScore: 10, comments: "" },
  { criterion: "Impact", score: 0, maxScore: 10, comments: "" },
  { criterion: "Presentation", score: 0, maxScore: 10, comments: "" },
]

// Helpers to compute totals and normalized rating (0-5)
function computeRubricTotals(items: RubricItem[]) {
  const safe = Array.isArray(items) ? items : []
  const sumScore = safe.reduce((a, r) => a + Math.max(0, Number(r.score || 0)), 0)
  const sumMax = safe.reduce((a, r) => a + Math.max(1, Number(r.maxScore || 1)), 0)
  return { sumScore, sumMax }
}
function computeRatingFromRubrics(items: RubricItem[]) {
  const { sumScore, sumMax } = computeRubricTotals(items)
  if (sumMax <= 0) return 0
  const normalized = (sumScore / sumMax) * 5
  // round to nearest integer star for display
  return Math.max(0, Math.min(5, Math.round(normalized)))
}

export function JudgeDashboard() {
  const { user } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [evaluations, setEvaluations] = useState<TeamEvaluation[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [evaluationDialog, setEvaluationDialog] = useState(false)
  const [currentEvaluation, setCurrentEvaluation] = useState<TeamEvaluation>({
    teamId: "",
    status: "Pending",
    feedback: "",
    rating: 0,
  })
  const [currentRubrics, setCurrentRubrics] = useState<RubricItem[]>([])
  // Add simple downloading state for PPT download
  const [downloading, setDownloading] = useState(false)


  useEffect(() => {
    const run = async () => {
      if (!user) return
      const judge = (user as any)?.username ?? (user as any)?.email ?? (user as any)?.id
      if (!judge) return

      // console.log("Fetching teams for judge:", judge)

      try {
        const res = await fetch(`/api/getSpecTeams?judge=${encodeURIComponent(judge)}`, { cache: "no-store" })
        if (!res.ok) return
        const { data } = await res.json()
        setTeams(data as Team[])


        console.log("Fetched teams for judge:", data)

        // Derive evaluations from returned team docs (Video schema)
        const derived: TeamEvaluation[] = (data as any[]).map((t) => {
          const latestRubric = Array.isArray(t.rubrics) && t.rubrics.length > 0 ? t.rubrics[t.rubrics.length - 1] : null
          return {
            teamId: t._id,
            status: (t.status as TeamEvaluation["status"]) || "Pending",
            feedback: latestRubric?.comments || "",
            rating: typeof t.finalScore === "number" ? t.finalScore : 0,
            evaluatedAt: latestRubric?.evaluatedAt ? new Date(latestRubric.evaluatedAt) : undefined,
          }
        })
        setEvaluations(derived)
      } catch {
        // ignore
      }
    }
    run()
  }, [])

  // Helper: best-effort file downloader
  const downloadFile = async (url: string) => {
    try {
      setDownloading(true)
      const a = document.createElement("a")
      a.href = url
      a.target = "_blank"
      a.rel = "noopener noreferrer"
      // download attribute might be ignored cross-origin, but will still navigate to file
      a.download = ""
      document.body.appendChild(a)
      a.click()
      a.remove()
    } finally {
      setDownloading(false)
    }
  }

  // Helper: render a PPT viewer using Office Online
  const renderPPTViewer = (file: string | undefined, title: string) => {
    if (!file) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">{title}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No file uploaded</p>
          </CardContent>
        </Card>
      )
    }

    const officeViewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file)}`

    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-96 border rounded-lg overflow-hidden">
            <iframe
              src={`https://docs.google.com/gview?url=${encodeURIComponent(file)}&embedded=true`}
              className="w-full h-full"
              frameBorder="0"
              title={title}
            />
          </div>
          <div className="mt-2 flex gap-4">
            <a
              href={officeViewerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              View in new tab
            </a>
            <button
              onClick={() => downloadFile(file)}
              className="text-sm text-green-600 hover:text-green-800 underline flex items-center gap-1"
            >
              {!downloading ? "Download" : <Loader className="h-4 w-4 animate-spin" />}
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Helper: render YouTube embed player from any YouTube URL
  const renderYouTubeEmbed = (url?: string) => {
    if (!url) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Demo Video</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No video URL</p>
          </CardContent>
        </Card>
      )
    }
    const getEmbedUrl = (u: string) => {
      try {
        const idMatch =
          u.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/)?.[1] ||
          u.match(/[?&]v=([a-zA-Z0-9_-]{11})/)?.[1] ||
          ""
        return idMatch ? `https://www.youtube.com/embed/${idMatch}` : ""
      } catch {
        return ""
      }
    }
    const embed = getEmbedUrl(url)
    if (!embed) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Demo Video</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground break-all">Invalid YouTube URL: {url}</p>
          </CardContent>
        </Card>
      )
    }
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Video className="h-4 w-4" />
            Demo Video
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full h-96 border rounded-lg overflow-hidden">
            <iframe
              className="w-full h-full"
              src={`${embed}?rel=0&modestbranding=1`}
              title="Demo Video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
          <div className="mt-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Open on YouTube
            </a>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Use teams as returned from API (already filtered by judge)
  // const assignedTeams = teams

  // Map status counts using backend values
  const teamStats = {
    total: teams ? teams.length : 0,
    evaluated: evaluations.filter((e) => e.status !== "Pending").length,
    approved: evaluations.filter((e) => e.status === "Approved").length,
    rejected: evaluations.filter((e) => e.status === "Reject").length,
    pending: evaluations.filter((e) => e.status === "Pending").length,
  }

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s === "approved") return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
    if (s === "reject") return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
    if (s === "can be thought") return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
    if (s === "pending") return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
    return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
  }

  const getTeamEvaluation = (teamId: string) => {
    return evaluations.find((e) => e.teamId === teamId)
  }

  const currentJudgeId = () => {
    const u: any = user
    return u?.username ?? u?.email ?? u?.id ?? ""
  }

  const handleStartEvaluation = (team: Team) => {
    const existingEvaluation = getTeamEvaluation(team._id)
    // Initialize rubrics from team if exist; else defaults
    const existingRubrics: RubricItem[] =
      ((team as any)?.rubrics as RubricItem[]) && Array.isArray((team as any)?.rubrics)
        ? ((team as any)?.rubrics as RubricItem[]).map((r) => ({
            criterion: r.criterion || "Criterion",
            score: Number(r.score || 0),
            maxScore: Math.max(1, Number(r.maxScore || 10)),
            comments: r.comments || "",
            judge: r.judge,
            evaluatedAt: r.evaluatedAt ? new Date(r.evaluatedAt) : undefined,
          }))
        : defaultRubrics

    const initialRating =
      existingEvaluation?.rating && existingEvaluation.rating > 0
        ? existingEvaluation.rating
        : computeRatingFromRubrics(existingRubrics)

    setCurrentEvaluation(
      existingEvaluation || {
        teamId: team._id,
        status: "Pending",
        feedback: "",
        rating: initialRating,
      },
    )
    setCurrentRubrics(existingRubrics)
    setSelectedTeam(team)
    setEvaluationDialog(true)
  }

  const handleSaveEvaluation = async () => {
    if (!selectedTeam) return
    try {
      // Compute final score from rubrics if any; fallback to star rating
      const finalFromRubrics = computeRatingFromRubrics(currentRubrics)
      const finalScore = currentRubrics.length > 0 ? finalFromRubrics : currentEvaluation.rating

      // Persist to backend
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamId: selectedTeam.teamId,
          status: currentEvaluation.status,
          finalScore,
          rubrics:
            currentRubrics.length > 0
              ? currentRubrics.map((r) => ({
                  ...r,
                  criterion: r.criterion || "Criterion",
                  score: Math.max(0, Number(r.score || 0)),
                  maxScore: Math.max(1, Number(r.maxScore || 10)),
                  comments: r.comments || "",
                  judge: r.judge || currentJudgeId(),
                }))
              : [
                  {
                    criterion: "Overall",
                    score: currentEvaluation.rating,
                    maxScore: 5,
                    comments: currentEvaluation.feedback,
                    judge: currentJudgeId(),
                  },
                ],
        }),
      })
      if (!res.ok) throw new Error("Failed to save evaluation")
      const { data } = await res.json()

      // Update local evaluations view
      const updatedEvaluations = evaluations.filter((e) => e.teamId !== currentEvaluation.teamId)
      const latestRubric = (data?.rubrics || [])[Math.max(0, (data?.rubrics || []).length - 1)]
      setEvaluations([
        ...updatedEvaluations,
        {
          teamId: currentEvaluation.teamId,
          status: (data?.status as TeamEvaluation["status"]) || currentEvaluation.status,
          feedback: latestRubric?.comments || currentEvaluation.feedback,
          rating: typeof data?.finalScore === "number" ? data.finalScore : finalScore,
          evaluatedAt: latestRubric?.evaluatedAt ? new Date(latestRubric.evaluatedAt) : new Date(),
        },
      ])

      // Merge updated team doc into teams array (includes new rubrics + status + finalScore)
      setTeams((prev) =>
        prev.map((t) =>
          t.teamId === selectedTeam.teamId ? ({ ...t, ...(data || {}) } as any) : t,
        ),
      )

      setEvaluationDialog(false)
      setSelectedTeam(null)
    } catch {
      setEvaluationDialog(false)
      setSelectedTeam(null)
    }
  }

  const renderStarRating = (rating: number, onRatingChange?: (rating: number) => void) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onRatingChange?.(star)}
            className={`h-6 w-6 ${
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-300 dark:text-gray-600"
            } ${onRatingChange ? "hover:text-yellow-400 cursor-pointer" : ""}`}
            disabled={!onRatingChange}
          >
            <Star className="h-full w-full" />
          </button>
        ))}
        <span className="ml-2 text-sm text-muted-foreground">{rating > 0 ? `${rating}/5` : "Not rated"}</span>
      </div>
    )
  }

  

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Judge Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}. Review and evaluate your assigned team submissions.
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Teams</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Evaluated</CardTitle>
            <CheckCircle className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{teamStats.evaluated}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{teamStats.approved}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{teamStats.rejected}</div>
          </CardContent>
        </Card>
        {/* Pending uses backend "Pending" */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{teamStats.pending}</div>
          </CardContent>
        </Card>
      </div>

      {/* Team Assignments */}
      <Card>
        <CardHeader>
          <CardTitle>Your Team Assignments</CardTitle>
          <CardDescription>Review team submissions, watch videos, and provide evaluations</CardDescription>
        </CardHeader>
        <CardContent>
          {teams && teams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No teams assigned yet</p>
              <p className="text-sm">Contact your admin to get team assignments.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {teams && teams.map((team) => {
                const evaluation = getTeamEvaluation(team._id)
                const status = evaluation?.status || "Pending"

                return (
                  <div key={team._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-lg">{team.teamName}</h3>
                          <Badge className={getStatusColor(status)}>
                            {evaluation ? `${status}` : "pending review"}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            <span>ID: {team.teamId}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Submitted: {new Date(team.submittedAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{team.leaderEmail}</p>
                        {evaluation && <div className="mt-2">{renderStarRating(evaluation.rating)}</div>}
                        {/* Marking breakdown preview */}
                        {(team as any)?.rubrics?.length ? (
                          <div className="mt-2">
                            <div className="text-xs text-muted-foreground mb-1">Marking breakdown</div>
                            <div className="flex flex-wrap gap-2">
                              {(team as any).rubrics.map((r: any, idx: number) => (
                                <span
                                  key={idx}
                                  className="text-xs px-2 py-1 rounded bg-muted text-muted-foreground"
                                  title={r.comments || ""}
                                >
                                  {r.criterion}: {r.score}/{r.maxScore}
                                </span>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={team.videoUrl} target="_blank" rel="noopener noreferrer">
                          <Video className="h-4 w-4 mr-1" />
                          Video
                        </a>
                      </Button>
                      <Button
                        variant={evaluation ? "secondary" : "default"}
                        size="sm"
                        onClick={() => handleStartEvaluation(team)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        {evaluation ? "Edit Review" : "Evaluate"}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Evaluation Dialog */}
      <Dialog open={evaluationDialog} onOpenChange={setEvaluationDialog}>
        <DialogContent className="sm:max-w-[720px] lg:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Evaluate Team: {selectedTeam?.teamName}</DialogTitle>
            <DialogDescription>Provide your evaluation and feedback for this team submission.</DialogDescription>
          </DialogHeader>

          {selectedTeam && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-sm font-medium">Team ID</Label>
                  <p className="text-sm">{selectedTeam.teamId}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Leader Email</Label>
                  <p className="text-sm">{selectedTeam.leaderEmail}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Submitted</Label>
                  <p className="text-sm">{new Date(selectedTeam.submittedAt).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Video</Label>
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedTeam.videoUrl} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Watch
                    </a>
                  </Button>
                </div>
              </div>

              {/* Preview section: YouTube + PPT */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {renderYouTubeEmbed(selectedTeam.videoUrl)}
                {renderPPTViewer((selectedTeam as any)?.pptUrl, "Presentation PPT")}
              </div>

              {/* Marking breakdown editor */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">Marking breakdown</Label>
                {currentRubrics.length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No criteria yet. Add criteria to show the marking process.
                  </p>
                )}
                <div className="space-y-2">
                  {currentRubrics.map((item, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <input
                        type="text"
                        className="col-span-4 px-2 py-1 border rounded bg-background"
                        value={item.criterion}
                        onChange={(e) => {
                          const next = [...currentRubrics]
                          next[idx] = { ...next[idx], criterion: e.target.value }
                          setCurrentRubrics(next)
                        }}
                        placeholder="Criterion"
                      />
                      <input
                        type="number"
                        min={0}
                        className="col-span-2 px-2 py-1 border rounded bg-background"
                        value={item.score}
                        onChange={(e) => {
                          const next = [...currentRubrics]
                          next[idx] = { ...next[idx], score: Math.max(0, Number(e.target.value || 0)) }
                          setCurrentRubrics(next)
                          // sync star rating from breakdown
                          setCurrentEvaluation((prev) => ({ ...prev, rating: computeRatingFromRubrics(next) }))
                        }}
                        placeholder="Score"
                      />
                      <input
                        type="number"
                        min={1}
                        className="col-span-2 px-2 py-1 border rounded bg-background"
                        value={item.maxScore}
                        onChange={(e) => {
                          const next = [...currentRubrics]
                          next[idx] = { ...next[idx], maxScore: Math.max(1, Number(e.target.value || 1)) }
                          setCurrentRubrics(next)
                          setCurrentEvaluation((prev) => ({ ...prev, rating: computeRatingFromRubrics(next) }))
                        }}
                        placeholder="Max"
                      />
                      <input
                        type="text"
                        className="col-span-3 px-2 py-1 border rounded bg-background"
                        value={item.comments || ""}
                        onChange={(e) => {
                          const next = [...currentRubrics]
                          next[idx] = { ...next[idx], comments: e.target.value }
                          setCurrentRubrics(next)
                        }}
                        placeholder="Comments (optional)"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const next = currentRubrics.filter((_, i) => i !== idx)
                          setCurrentRubrics(next)
                          setCurrentEvaluation((prev) => ({ ...prev, rating: computeRatingFromRubrics(next) }))
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = [...currentRubrics, { criterion: "New criterion", score: 0, maxScore: 10, comments: "" }]
                      setCurrentRubrics(next)
                      setCurrentEvaluation((prev) => ({ ...prev, rating: computeRatingFromRubrics(next) }))
                    }}
                  >
                    Add criterion
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Total: {computeRubricTotals(currentRubrics).sumScore}/{computeRubricTotals(currentRubrics).sumMax} •
                    Derived rating: {computeRatingFromRubrics(currentRubrics)}/5
                  </div>
                </div>
              </div>

              {/* Overall rating and decision */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="rating">Overall Rating</Label>
                  <div className="mt-2">
                    {renderStarRating(currentEvaluation.rating, (rating) =>
                      setCurrentEvaluation({ ...currentEvaluation, rating }),
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Stars reflect the breakdown above and can be adjusted if needed.
                  </p>
                </div>

                <div>
                  <Label htmlFor="status">Decision</Label>
                  <Select
                    value={currentEvaluation.status}
                    onValueChange={(value: "Pending" | "Approved" | "Reject" | "Can be thought") =>
                      setCurrentEvaluation({ ...currentEvaluation, status: value })
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Reject">Reject</SelectItem>
                      <SelectItem value="Can be thought">Can be thought</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="feedback">Feedback & Comments</Label>
                  <Textarea
                    id="feedback"
                    placeholder="Provide detailed feedback about the team's submission..."
                    value={currentEvaluation.feedback}
                    onChange={(e) => setCurrentEvaluation({ ...currentEvaluation, feedback: e.target.value })}
                    className="mt-2 min-h-[120px]"
                  />
                </div>
              </div>
            </div>
          )}
        </DialogContent>
        <DialogFooter>
          <Button variant="outline" onClick={() => setEvaluationDialog(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveEvaluation}>Save Evaluation</Button>
        </DialogFooter>
      </Dialog>
    </div>
  )
}
