"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { UserPlus, Shield, Trash2, Edit, Eye, BarChart3, CheckCircle, XCircle, Clock } from "lucide-react"
import { mockUsers, mockTeams, type User, type Team } from "@/lib/auth"
import { useAuth } from "@/contexts/auth-context"
import { AddUserDialog } from "@/components/add-user-dialog"
import { TeamDetailsDialog } from "@/components/team-details-dialog"

export function ManagerDashboard() {
  const { user } = useAuth()
  const [users, setUsers] = useState<User[]>(mockUsers)
  const [teams] = useState<Team[]>(mockTeams)
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [showAddUser, setShowAddUser] = useState(false)

  const admins = users.filter((u) => u.role === "admin")
  const judges = users.filter((u) => u.role === "judge")

  const teamStats = {
    total: teams.length,
    approved: teams.filter((t) => t.status === "approved").length,
    pending: teams.filter((t) => t.status === "pending").length,
    rejected: teams.filter((t) => t.status === "rejected").length,
  }

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter((u) => u.id !== userId))
  }

  const handleAddUser = (newUser: User) => {
    setUsers([...users, newUser])
    setShowAddUser(false)
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "judge":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
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

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manager Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {user?.name}. Manage your admins, judges, and oversee all hackathon activities.
          </p>
        </div>
        <Button onClick={() => setShowAddUser(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add User
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teamStats.total}</div>
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
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{teamStats.pending}</div>
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
      </div>

      <Tabs defaultValue="admins" className="space-y-4">
        <TabsList>
          <TabsTrigger value="admins">Admins ({admins.length})</TabsTrigger>
          <TabsTrigger value="judges">Judges ({judges.length})</TabsTrigger>
          <TabsTrigger value="teams">Teams ({teams.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="admins" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Admin Management</CardTitle>
              <CardDescription>Manage admin users who can control judges and team assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {admin.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{admin.name}</p>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                        <Badge className={getRoleColor(admin.role)}>{admin.role}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteUser(admin.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="judges" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Judge Management</CardTitle>
              <CardDescription>Manage judge users who evaluate team submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {judges.map((judge) => {
                  const assignedTeams = teams.filter((t) => t.assignedJudgeId === judge.id)
                  return (
                    <div key={judge.id} className="flex items-center justify-between p-4 border rounded-lg">
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
                          <p className="text-sm text-muted-foreground">{judge.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getRoleColor(judge.role)}>{judge.role}</Badge>
                            <Badge variant="outline">{assignedTeams.length} teams</Badge>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDeleteUser(judge.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Overview</CardTitle>
              <CardDescription>Monitor all team submissions and their current status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teams.map((team) => {
                  const assignedJudge = users.find((u) => u.id === team.assignedJudgeId)
                  return (
                    <div key={team._id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Shield className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{team.teamName}</p>
                          <p className="text-sm text-muted-foreground">ID: {team.teamId}</p>
                          <p className="text-sm text-muted-foreground">{team.leaderEmail}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={getStatusColor(team.status)}>{team.status}</Badge>
                            {assignedJudge && <Badge variant="outline">Judge: {assignedJudge.name}</Badge>}
                          </div>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => setSelectedTeam(team)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  )
                })}
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
        judges={judges}
        readOnly={false}
      />
    </div>
  )
}
