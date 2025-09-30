"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { ExternalLink, Calendar, User, Video } from "lucide-react"
import type { Team, User as UserType } from "@/lib/auth"

interface TeamDetailsDialogProps {
  team: Team | null
  open: boolean
  onOpenChange: (open: boolean) => void
  judges: UserType[]
  readOnly?: boolean
}

export function TeamDetailsDialog({ team, open, onOpenChange, judges, readOnly = false }: TeamDetailsDialogProps) {
  const [selectedJudge, setSelectedJudge] = useState(team?.assignedJudgeId || "")
  const [status, setStatus] = useState(team?.status || "pending")

  if (!team) return null

  const assignedJudge = judges.find((j) => j.id === team.assignedJudgeId)

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {team.teamName}
            <Badge className={getStatusColor(team.status)}>{team.status}</Badge>
          </DialogTitle>
          <DialogDescription>Team ID: {team.teamId}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <User className="h-4 w-4" />
                Leader Email
              </Label>
              <p className="text-sm">{team.leaderEmail}</p>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Submitted At
              </Label>
              <p className="text-sm">{new Date(team.submittedAt).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-2">
              <Video className="h-4 w-4" />
              Video Submission
            </Label>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={team.videoUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View Video
                </a>
              </Button>
            </div>
          </div>

          {!readOnly && (
            <>
              <div className="space-y-2">
                <Label htmlFor="judge-select">Assigned Judge</Label>
                <Select value={selectedJudge} onValueChange={setSelectedJudge}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a judge" />
                  </SelectTrigger>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-select">Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button onClick={() => onOpenChange(false)}>Save Changes</Button>
              </div>
            </>
          )}

          {readOnly && assignedJudge && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Assigned Judge</Label>
              <p className="text-sm">
                {assignedJudge.name} ({assignedJudge.email})
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
