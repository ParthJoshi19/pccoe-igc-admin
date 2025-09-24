"use client"

import { useState } from "react"
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
import { CheckCircle, Clock, XCircle, Eye, ExternalLink, Video, Calendar, User, FileText, Star } from "lucide-react"
import { mockTeams, type Team } from "@/lib/auth"
import { useAuth } from "@/contexts/auth-context"

interface TeamEvaluation {
  teamId: string
  status: "pending" | "approved" | "rejected"
  feedback: string
  rating: number
  evaluatedAt?: Date
}

export function JudgeDashboard() {
  const { user } = useAuth()
  const [teams] = useState<Team[]>(mockTeams)
  const [evaluations, setEvaluations] = useState<TeamEvaluation[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [evaluationDialog, setEvaluationDialog] = useState(false)
  const [currentEvaluation, setCurrentEvaluation] = useState<TeamEvaluation>({
    teamId: "",
    status: "pending",
    feedback: "",
    rating: 0,
  })

  // Filter teams assigned to this judge
  const assignedTeams = teams.filter((team) => team.assignedJudgeId === user?.id)

  const teamStats = {
    total: assignedTeams.length,
    evaluated: evaluations.length,
    approved: evaluations.filter((e) => e.status === "approved").length,
    rejected: evaluations.filter((e) => e.status === "rejected").length,
    pending: assignedTeams.length - evaluations.length,
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const getTeamEvaluation = (teamId: string) => {
    return evaluations.find((e) => e.teamId === teamId)
  }

  const handleStartEvaluation = (team: Team) => {
    const existingEvaluation = getTeamEvaluation(team._id)
    setCurrentEvaluation(
      existingEvaluation || {
        teamId: team._id,
        status: "pending",
        feedback: "",
        rating: 0,
      },
    )
    setSelectedTeam(team)
    setEvaluationDialog(true)
  }

  const handleSaveEvaluation = () => {
    const updatedEvaluations = evaluations.filter((e) => e.teamId !== currentEvaluation.teamId)
    setEvaluations([
      ...updatedEvaluations,
      {
        ...currentEvaluation,
        evaluatedAt: new Date(),
      },
    ])
    setEvaluationDialog(false)
    setSelectedTeam(null)
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
          {assignedTeams.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No teams assigned yet</p>
              <p className="text-sm">Contact your admin to get team assignments.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {assignedTeams.map((team) => {
                const evaluation = getTeamEvaluation(team._id)
                const status = evaluation?.status || "pending"

                return (
                  <div key={team._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium text-lg">{team.teamName}</h3>
                          <Badge className={getStatusColor(status)}>
                            {evaluation ? `${status} (evaluated)` : "pending review"}
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
        <DialogContent className="sm:max-w-[600px]">
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

              <div className="space-y-4">
                <div>
                  <Label htmlFor="rating">Rating</Label>
                  <div className="mt-2">
                    {renderStarRating(currentEvaluation.rating, (rating) =>
                      setCurrentEvaluation({ ...currentEvaluation, rating }),
                    )}
                  </div>
                </div>

                <div>
                  <Label htmlFor="status">Decision</Label>
                  <Select
                    value={currentEvaluation.status}
                    onValueChange={(value: "pending" | "approved" | "rejected") =>
                      setCurrentEvaluation({ ...currentEvaluation, status: value })
                    }
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="approved">Approve</SelectItem>
                      <SelectItem value="rejected">Reject</SelectItem>
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
