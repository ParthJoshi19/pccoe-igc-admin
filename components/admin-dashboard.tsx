"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Trash2,
  Edit,
  Eye,
  CheckCircle,
  Clock,
  Users,
  FileText,
  PlayCircle,
} from "lucide-react";
import { type User, type Team, canManageUser } from "@/lib/auth";
import { useAuth } from "@/contexts/auth-context";
import { AddUserDialog } from "@/components/add-user-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function AdminDashboard() {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loadingTeams, setLoadingTeams] = useState(false);

  // NEW: preview state for Round 1 PPT and Round 2 Video
  const [pptPreviewUrl, setPptPreviewUrl] = useState<string | null>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const getJudges = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/getJudges`, {
          method: "POST",
          body: JSON.stringify({ token: user?.token }),
        });
        const data = await res.json();

        console.log(data);

        // Map API response to User format
        if (data.users && Array.isArray(data.users)) {
          const mappedUsers: User[] = data.users.map((apiUser: any) => ({
            id: apiUser.id,
            email: apiUser.username,
            name: apiUser.username,
            role: apiUser.role,
            createdAt: new Date(),
            managerId: user?.id,
          }));
          setUsers(mappedUsers);
        }
      } catch (error) {
        console.error("Failed to fetch judges:", error);
      }
    };

    const getTeams = async () => {
      try {
        setLoadingTeams(true);
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/getTeams`, {
          method: "POST",
          body: JSON.stringify({ token: user?.token, page, limit }),
        });
        const data = await res.json();

        console.log(data);

        if (data.teams && Array.isArray(data.teams)) {
          const mappedTeams: Team[] = data.teams.map((apiTeam: any) => ({
            _id: apiTeam.id,
            teamName: apiTeam.teamName,
            teamId: apiTeam.registrationNumber,
            leaderEmail: apiTeam.leaderEmail,
            leaderName: apiTeam.leaderName,
            institution: apiTeam.institution,
            program: apiTeam.program,
            members: apiTeam.members || [],
            mentorName: apiTeam.mentorName,
            mentorEmail: apiTeam.mentorEmail,
            topicName: apiTeam.topicName,
            topicDescription: apiTeam.topicDescription,
            track: apiTeam.track,
            status: apiTeam.registrationStatus as
              | "pending"
              | "approved"
              | "rejected",
            submittedAt: new Date(apiTeam.submittedAt),
            updatedAt: new Date(apiTeam.updatedAt),
            assignedJudgeId:
              apiTeam.allocatedJudgeId !== "000000000000000000000000"
                ? apiTeam.allocatedJudgeId
                : undefined,
            presentationPPT: apiTeam.presentationPPT,
            idCardsPDF: apiTeam.idCardsPDF,
            instituteNOC: apiTeam.instituteNOC,
          }));
          setTeams(mappedTeams);
          setTotal(
            data?.pagination?.total ??
              data?.total ??
              (Array.isArray(data.teams) ? data.teams.length : 0)
          );
        } else if (Array.isArray(data?.data)) {
          const mappedTeams: Team[] = data.data.map((apiTeam: any) => {
            const item: any = {
              _id:
                apiTeam.id ||
                apiTeam.registrationNumber ||
                apiTeam._id ||
                crypto.randomUUID?.() ||
                String(Math.random()),
              teamName: apiTeam.teamName,
              teamId: apiTeam.registrationNumber,
              leaderEmail: apiTeam.leaderEmail,
              leaderName: apiTeam.leaderName ?? "",
              institution: apiTeam.institution,
              program: apiTeam.program ?? "",
              members: apiTeam.members ?? [],
              mentorName: apiTeam.mentorName ?? "",
              mentorEmail: apiTeam.mentorEmail ?? "",
              topicName: apiTeam.topicName ?? "",
              topicDescription: apiTeam.topicDescription ?? "",
              track: apiTeam.track,
              status: "approved" as const,
              submittedAt: new Date(apiTeam.submittedAt),
              updatedAt: new Date(apiTeam.submittedAt ?? Date.now()),
              presentationPPT:
                apiTeam.presentationPPT ??
                (apiTeam.pptUrl ? { fileUrl: apiTeam.pptUrl } : undefined),
              video: apiTeam.video?.fileUrl
                ? apiTeam.video
                : apiTeam.video?.videoUrl
                ? { fileUrl: apiTeam.video.videoUrl }
                : undefined,
              videoUrl: apiTeam.video?.videoLink ?? apiTeam.videoLink,
              pptUrl: apiTeam.pptUrl,
              // NEW: assigned judge mapping from API
              assignedJudgeId: apiTeam.assignedJudgeId
                ? String(apiTeam.assignedJudgeId)
                : undefined,
              assignedJudgeEmail: apiTeam.assignedJudgeEmail,
            };
            return item as Team;
          });
          setTeams(mappedTeams);
          setTotal(
            data?.pagination?.total ??
              (Array.isArray(data.data) ? data.data.length : 0)
          );
        }
        // console.log("Mapped Teams:", teams);
      } catch (error) {
        console.error("Failed to fetch teams:", error);
      } finally {
        setLoadingTeams(false);
      }
    };

    if (user?.token) {
      getJudges();
      getTeams();
    }
  }, [user?.token, user?.id, page, limit]);

  const managedJudges = users.filter(
    (u) => u.role === "judge" && canManageUser(user!, u)
  );
  const allJudges = users.filter((u) => u.role === "judge");

  const teamStats = {
    total: teams.length,
    approved: teams.filter((t) => t.status === "approved").length,
    pending: teams.filter((t) => t.status === "pending").length,
    rejected: teams.filter((t) => t.status === "rejected").length,
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter((u) => u.id !== userId));
  };

  const handleAddUser = (newUser: User) => {
    setUsers([...users, newUser]);
    setShowAddUser(false);
  };

  const handleUpdateTeamStatus = (
    teamId: string,
    status: "pending" | "approved" | "rejected"
  ) => {
    setTeams(
      teams.map((t) =>
        t._id === teamId ? { ...t, status, updatedAt: new Date() } : t
      )
    );
  };

  // Replace previous handleAssignJudge with an async version that posts to the API
  const handleAssignJudge = async (teamInternalId: string, judgeId: string) => {
    // Find team and judge to resolve required payload fields
    const team = teams.find((t) => t._id === teamInternalId);
    console.log(teams)
    const judge = users.find((u) => u.id === judgeId);
    if (!team || !judge) return;

    // Build payload using team.teamId if available, fallback to internal id
    const payload = {
      teamId: team.teamId || team._id,
      judgeEmail: judge.name, 
    };

    // Optimistically update UI
    const prevTeams = teams;

    setTeams((ts) =>
      ts.map((t) =>   
        t._id === teamInternalId
          ? { ...t, assignedJudgeId: judgeId, updatedAt: new Date() }
          : t
      )
    );

    try {
      console.log("Assigning judge with payload:", payload);
      const res = await fetch(`/api/assignJudge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setTeams(prevTeams);
        console.error("Failed to assign judge:", await res.text());
      }
    } catch (err) {
      // Revert on error
      setTeams(prevTeams);
      console.error("Error assigning judge:", err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300";
    }
  };

  const totalTeamsCount = total || teams.length;
  const pageStart = teams.length ? (page - 1) * limit + 1 : 0;
  const pageEnd = teams.length
    ? Math.min((page - 1) * limit + teams.length, totalTeamsCount)
    : 0;
  const isLastPage = pageEnd >= totalTeamsCount;

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}. Manage judges, review teams, and control
            hackathon submissions.
          </p>
        </div>
        <Button onClick={() => setShowAddUser(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add Judge
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTeamsCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {teamStats.approved}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Review
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {teamStats.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Managed Judges
            </CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {managedJudges.length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="teams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teams">
            Team Management ({teams.length})
          </TabsTrigger>
          <TabsTrigger value="judges">
            Judge Management ({managedJudges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Submissions</CardTitle>
              <CardDescription>
                Review and manage team submissions, assign judges, and update
                status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm text-muted-foreground">
                  {totalTeamsCount > 0
                    ? `Showing ${pageStart}-${pageEnd} of ${totalTeamsCount}`
                    : "No results"}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm">Rows per page</span>
                  <Select
                    value={String(limit)}
                    onValueChange={(v) => {
                      const next = Number.parseInt(v, 10);
                      if (!Number.isNaN(next)) {
                        setPage(1);
                        setLimit(next);
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 w-[90px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="20">20</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1 || loadingTeams}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={isLastPage || loadingTeams}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {teams.map((team) => {
                  // derive a videoUrl only if present in the object
                  let videoUrl: string | undefined;
                  const t: any = team as any;
                  videoUrl =
                    t?.demoVideo?.fileUrl ||
                    t?.presentationVideo?.fileUrl ||
                    t?.video?.fileUrl ||
                    t?.video?.videoUrl ||
                    t?.videoUrl;
                  if (!videoUrl) {
                    const pptMaybeVideo =
                      t?.presentationPPT?.fileUrl || t?.presentationPPT;
                    if (
                      typeof pptMaybeVideo === "string" &&
                      /\.(mp4|webm|mov|m4v)$/i.test(pptMaybeVideo)
                    ) {
                      videoUrl = pptMaybeVideo;
                    }
                  }

                  const pptUrl: string | undefined =
                    t?.presentationPPT?.fileUrl ||
                    (typeof t?.presentationPPT === "string"
                      ? t.presentationPPT
                      : undefined) ||
                    t?.pptUrl;

                  const assignedJudge = users.find(
                    (u) => u.id === team.assignedJudgeId
                  );
                  return (
                    <div
                      key={team._id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">{team.teamName}</p>
                            {/* NEW: show assigned judge badge */}
                            {assignedJudge ? (
                              <Badge variant="secondary">
                                Judge: {assignedJudge.name}
                              </Badge>
                            ) : (team as any).assignedJudgeEmail ? (
                              <Badge variant="secondary">
                                Judge: {(team as any).assignedJudgeEmail}
                              </Badge>
                            ) : (
                              <Badge variant="outline">Unassigned</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ID: {team.teamId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Submitted: {team.submittedAt.toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex-1">
                          {/* Use a two-column grid so both buttons align vertically in one column */}
                          <div className="mt-1 grid grid-cols-2 items-center gap-x-4 gap-y-2">
                            {pptUrl && (
                              <>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">Round 1</Badge>
                                  <span className="text-xs text-muted-foreground">
                                    Solution for round 1
                                  </span>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setPptPreviewUrl(pptUrl)}
                                  aria-label="Open Round 1 PPT preview"
                                  title="Round 1 Solution — Please evaluate the PPT"
                                >
                                  <FileText className="h-4 w-4" />
                                </Button>
                              </>
                            )}

                            <div className="flex items-center gap-2">
                              <Badge variant="outline">Round 2</Badge>
                              <span className="text-xs text-muted-foreground">
                                {!videoUrl
                                  ? "No video for evaluation"
                                  : "Please evaluate this solution"}
                              </span>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={!videoUrl}
                              onClick={() => videoUrl && setVideoPreviewUrl(videoUrl)}
                              aria-label="Open Round 2 Video preview"
                              title={videoUrl ? "Round 2 — Please evaluate this solution" : "No video available"}
                            >
                              <PlayCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 min-w-[200px]">
                          <Select
                            value={team.assignedJudgeId || ""}
                            onValueChange={(value) =>
                              handleAssignJudge(team._id, value)
                            }
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Assign Judge" />
                            </SelectTrigger>
                            <SelectContent
                              defaultValue={team.assignedJudgeId || ""}
                            >
                              {allJudges.map((judge) => (
                                <SelectItem key={judge.id} value={judge.id}>
                                  {judge.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {/* {pptUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`https://docs.google.com/gview?url=${encodeURIComponent(pptUrl)}&embedded=true`, "_blank", "noopener,noreferrer")}
                            aria-label="Preview PPT (Round 1)"
                            title="Preview PPT (Round 1) — Please evaluate the PPT"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                        )}
                        {videoUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(videoUrl, "_blank", "noopener,noreferrer")}
                            aria-label="View Video"
                            title="View Video"
                          >
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        )} */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedTeam(team)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {teams.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No team submissions found.</p>
                    <p className="text-sm">
                      Team submissions will appear here once available.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="judges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Judge Management</CardTitle>
              <CardDescription>
                Manage judges under your supervision and monitor their
                assignments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {managedJudges.map((judge) => {
                  const assignedTeams = teams.filter(
                    (t) => t.assignedJudgeId === judge.id
                  );
                  const approvedTeams = assignedTeams.filter(
                    (t) => t.status === "approved"
                  ).length;
                  const pendingTeams = assignedTeams.filter(
                    (t) => t.status === "pending"
                  ).length;
                  const rejectedTeams = assignedTeams.filter(
                    (t) => t.status === "rejected"
                  ).length;

                  return (
                    <div
                      key={judge.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarFallback>
                            {judge.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{judge.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">
                              {assignedTeams.length} teams
                            </Badge>
                            {approvedTeams > 0 && (
                              <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                                {approvedTeams} approved
                              </Badge>
                            )}
                            {pendingTeams > 0 && (
                              <Badge className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                                {pendingTeams} pending
                              </Badge>
                            )}
                            {rejectedTeams > 0 && (
                              <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                                {rejectedTeams} rejected
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUser(judge.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {managedJudges.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No judges assigned to you yet.</p>
                    <p className="text-sm">
                      Add judges to start managing team evaluations.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <AddUserDialog
        open={showAddUser}
        onOpenChange={setShowAddUser}
        onAddUser={handleAddUser}
        currentUserId={user?.id || ""}
      />

      <Dialog
        open={!!selectedTeam}
        onOpenChange={(open) => {
          if (!open) setSelectedTeam(null);
        }}
      >
        <DialogContent className="min-w-screen w-screen h-full  overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-2xl">
              {selectedTeam?.teamName || "Team Details"}
            </DialogTitle>
            <DialogDescription>
              Complete team information and submission previews
            </DialogDescription>
          </DialogHeader>

          {selectedTeam &&
            (() => {
              const t: any = selectedTeam as any;

              // Video URL resolution
              const videoUrl: string | undefined =
                t?.demoVideo?.fileUrl ||
                t?.presentationVideo?.fileUrl ||
                t?.video?.fileUrl ||
                t?.video?.videoUrl ||
                t?.videoUrl;

              // PPT URL resolution
              const pptUrl: string | undefined =
                t?.presentationPPT?.fileUrl ||
                (typeof t?.presentationPPT === "string"
                  ? t.presentationPPT
                  : undefined) ||
                t?.pptUrl;

              // YouTube embed conversion
              const toYouTubeEmbed = (url?: string) => {
                if (!url) return null;
                const m =
                  url.match(
                    /(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
                  ) || [];
                return m[1] ? `https://www.youtube.com/embed/${m[1]}` : null;
              };

              const embedUrl = toYouTubeEmbed(videoUrl);
              const pptViewerUrl = pptUrl
                ? `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
                    pptUrl
                  )}`
                : null;

              return (
                <Tabs
                  defaultValue="info"
                  className="flex-1 overflow-hidden flex flex-col"
                >
                  <TabsList className="flex-shrink-0">
                    <TabsTrigger value="info">Team Information</TabsTrigger>
                    <TabsTrigger value="previews">Previews</TabsTrigger>
                  </TabsList>

                  <TabsContent
                    value="info"
                    className="flex-1 overflow-auto mt-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Basic Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Basic Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Team Name
                            </p>
                            <p className="text-base">{selectedTeam.teamName}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Team ID
                            </p>
                            <p className="text-base font-mono">
                              {selectedTeam.teamId}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Status
                            </p>
                            <Badge
                              className={getStatusColor(selectedTeam.status)}
                            >
                              {selectedTeam.status}
                            </Badge>
                          </div>

                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Submitted At
                            </p>
                            <p className="text-base">
                              {selectedTeam.submittedAt.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Last Updated
                            </p>
                            <p className="text-base">
                              {selectedTeam.updatedAt.toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Assigned Judge
                            </p>
                            <p className="text-base">
                              {(() => {
                                const aj = users.find(
                                  (u) => u.id === selectedTeam.assignedJudgeId
                                );
                                return (
                                  aj?.name ||
                                  t.assignedJudgeEmail ||
                                  "Unassigned"
                                );
                              })()}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Leader Information */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Team Leader</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Name
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-muted-foreground">
                              Email
                            </p>
                            <p className="text-base">
                              {selectedTeam.leaderEmail || "N/A"}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Mentor Information */}

                      {/* Team Members */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Team Members
                          </CardTitle>
                        </CardHeader>
                      </Card>

                      {/* Documents */}
                      <Card className="md:col-span-2">
                        <CardHeader>
                          <CardTitle className="text-lg">
                            Submitted Documents
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {pptUrl && (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  window.open(
                                    pptUrl,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Presentation PPT
                              </Button>
                            )}
                            {videoUrl && (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  window.open(
                                    videoUrl,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                              >
                                <PlayCircle className="mr-2 h-4 w-4" />
                                Demo Video
                              </Button>
                            )}
                            {t?.idCardsPDF && (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  window.open(
                                    typeof t.idCardsPDF === "string"
                                      ? t.idCardsPDF
                                      : t.idCardsPDF.fileUrl,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                ID Cards
                              </Button>
                            )}
                            {t?.instituteNOC && (
                              <Button
                                variant="outline"
                                onClick={() =>
                                  window.open(
                                    typeof t.instituteNOC === "string"
                                      ? t.instituteNOC
                                      : t.instituteNOC.fileUrl,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Institute NOC
                              </Button>
                            )}
                            {!pptUrl &&
                              !videoUrl &&
                              !t?.idCardsPDF &&
                              !t?.instituteNOC && (
                                <p className="text-sm text-muted-foreground">
                                  No documents submitted
                                </p>
                              )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  <TabsContent
                    value="previews"
                    className="flex-1 overflow-auto mt-4"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                      {/* Video preview */}
                      <Card className="flex flex-col">
                        <CardHeader className="flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              Demo Video
                            </CardTitle>
                            {videoUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(
                                    videoUrl!,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                              >
                                Open in New Tab
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex items-center justify-center">
                          {embedUrl ? (
                            <div className="w-full aspect-video">
                              <iframe
                                src={embedUrl}
                                title="YouTube video"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                className="w-full h-full rounded-lg border"
                              />
                            </div>
                          ) : videoUrl ? (
                            <div className="text-center space-y-4">
                              <PlayCircle className="h-16 w-16 mx-auto text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  Video preview not available for this format
                                </p>
                                <Button
                                  onClick={() =>
                                    window.open(
                                      videoUrl!,
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                >
                                  Open Video
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground">
                              <PlayCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p>No video submitted</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* PPT preview */}
                      <Card className="flex flex-col">
                        <CardHeader className="flex-shrink-0">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">
                              Presentation PPT
                            </CardTitle>
                            {pptUrl && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  window.open(
                                    pptUrl!,
                                    "_blank",
                                    "noopener,noreferrer"
                                  )
                                }
                              >
                                Open in New Tab
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent className="flex-1 flex items-center justify-center">
                          {pptViewerUrl ? (
                            <iframe
                              src={pptViewerUrl}
                              title="PPT preview"
                              className="w-full h-[600px] rounded-lg border"
                            />
                          ) : pptUrl ? (
                            <div className="text-center space-y-4">
                              <FileText className="h-16 w-16 mx-auto text-muted-foreground" />
                              <div>
                                <p className="text-sm text-muted-foreground mb-2">
                                  PPT preview not available
                                </p>
                                <Button
                                  onClick={() =>
                                    window.open(
                                      pptUrl!,
                                      "_blank",
                                      "noopener,noreferrer"
                                    )
                                  }
                                >
                                  Download PPT
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-center text-muted-foreground">
                              <FileText className="h-16 w-16 mx-auto mb-4 opacity-50" />
                              <p>No PPT uploaded</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </Tabs>
              );
            })()}
        </DialogContent>
      </Dialog>

      {/* NEW: Dialog modal for Round 1 PPT */}
      <Dialog
        open={!!pptPreviewUrl}
        onOpenChange={(open) => !open && setPptPreviewUrl(null)}
      >
        <DialogContent className="max-w-5xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Round 1 PPT</DialogTitle>
            <DialogDescription>Please evaluate the PPT.</DialogDescription>
          </DialogHeader>
          {pptPreviewUrl && (
            <iframe
              src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(
                pptPreviewUrl
              )}`}
              title="PPT preview"
              className="w-full h-[70vh] rounded-lg border"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* NEW: Dialog modal for Round 2 Video */}
      <Dialog
        open={!!videoPreviewUrl}
        onOpenChange={(open) => !open && setVideoPreviewUrl(null)}
      >
        <DialogContent className="max-w-5xl w-[95vw]">
          <DialogHeader>
            <DialogTitle>Round 2 Video</DialogTitle>
            <DialogDescription>
              Please evaluate this solution.
            </DialogDescription>
          </DialogHeader>
          {videoPreviewUrl &&
            (() => {
              const m =
                videoPreviewUrl.match(
                  /(?:youtube\.com\/.*[?&]v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/
                ) || [];
              const embed = m[1]
                ? `https://www.youtube.com/embed/${m[1]}`
                : null;
              return embed ? (
                <div className="w-full aspect-video">
                  <iframe
                    src={embed}
                    title="YouTube video"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full rounded-lg border"
                  />
                </div>
              ) : (
                <video
                  src={videoPreviewUrl}
                  controls
                  className="w-full h-auto max-h-[70vh] rounded-lg border bg-black"
                />
              );
            })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}
