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
  PlayCircle, // added
} from "lucide-react";
import { type User, type Team, canManageUser } from "@/lib/auth";
import { useAuth } from "@/contexts/auth-context";
import { AddUserDialog } from "@/components/add-user-dialog";
import { TeamDetailsDialog } from "@/components/team-details-dialog";

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

  useEffect(() => {
    const getJudges = async () => {
      try {
        const res = await fetch(`/api/getJudges`, {
          method: "POST",
          body: JSON.stringify({ token: user?.token }),
        });
        const data = await res.json();

        // Map API response to User format
        if (data.users && Array.isArray(data.users)) {
          const mappedUsers: User[] = data.users.map((apiUser: any) => ({
            id: apiUser.id,
            email: apiUser.username, // Using username as email
            name: apiUser.username, // Using username as name
            role: apiUser.role,
            createdAt: new Date(),
            managerId: user?.id, // Set current user as manager
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
        const res = await fetch(`/api/getTeams`, {
          method: "POST",
          body: JSON.stringify({ token: user?.token, page, limit }),
        });
        const data = await res.json();

        // Map API response to Team format
        if (data.teams && Array.isArray(data.teams)) {
          const mappedTeams: Team[] = data.teams.map((apiTeam: any) => ({
            _id: apiTeam.id,
            teamName: apiTeam.teamName,
            teamId: apiTeam.teamId,
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
            status: apiTeam.registrationStatus as "pending" | "approved" | "rejected",
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
        }
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

  const handleAssignJudge = (teamId: string, judgeId: string) => {
    setTeams(
      teams.map((t) =>
        t._id === teamId
          ? { ...t, assignedJudgeId: judgeId, updatedAt: new Date() }
          : t
      )
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300";
      case "rejected":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300";
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

      {/* Stats Overview */}
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
              {/* pagination header */}
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
                      const next = parseInt(v, 10);
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
                    t?.videoUrl;
                  if (!videoUrl) {
                    const pptMaybeVideo = t?.presentationPPT?.fileUrl || t?.presentationPPT;
                    if (typeof pptMaybeVideo === "string" && /\.(mp4|webm|mov|m4v)$/i.test(pptMaybeVideo)) {
                      videoUrl = pptMaybeVideo;
                    }
                  }

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
                          </div>
                          <p className="text-sm text-muted-foreground">
                            ID: {team.teamId}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Submitted: {team.submittedAt.toLocaleDateString()}
                          </p>
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
                            <SelectContent>
                              {allJudges.map((judge) => (
                                <SelectItem key={judge.id} value={judge.id}>
                                  {judge.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Select
                            value={team.status}
                            onValueChange={(
                              value: "pending" | "approved" | "rejected"
                            ) => handleUpdateTeamStatus(team._id, value)}
                          >
                            <SelectTrigger className="h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {videoUrl && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              window.open(videoUrl, "_blank", "noopener,noreferrer")
                            }
                            aria-label="View Video"
                          >
                            <PlayCircle className="h-4 w-4" />
                          </Button>
                        )}
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

      <TeamDetailsDialog
        team={selectedTeam}
        open={!!selectedTeam}
        onOpenChange={() => setSelectedTeam(null)}
        judges={allJudges}
        readOnly={false}
      />
    </div>
  );
}
