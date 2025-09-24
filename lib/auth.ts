// Authentication and role management utilities
export type UserRole = "manager" | "admin" | "judge"

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: Date
  managerId?: string // For admins and judges to track who manages them
}

export interface Team {
  _id: string
  teamId: string
  teamName: string
  leaderEmail: string
  videoUrl: string
  status: "pending" | "approved" | "rejected"
  assignedJudgeId?: string
  submittedAt: Date
  createdAt: Date
  updatedAt: Date
}

// Mock data for demonstration
export const mockUsers: User[] = [
  {
    id: "1",
    email: "manager@hackathon.com",
    name: "John Manager",
    role: "manager",
    createdAt: new Date("2024-01-01"),
  },
  {
    id: "2",
    email: "admin1@hackathon.com",
    name: "Alice Admin",
    role: "admin",
    managerId: "1",
    createdAt: new Date("2024-01-02"),
  },
  {
    id: "3",
    email: "admin2@hackathon.com",
    name: "Bob Admin",
    role: "admin",
    managerId: "1",
    createdAt: new Date("2024-01-03"),
  },
  {
    id: "4",
    email: "judge1@hackathon.com",
    name: "Carol Judge",
    role: "judge",
    managerId: "2",
    createdAt: new Date("2024-01-04"),
  },
  {
    id: "5",
    email: "judge2@hackathon.com",
    name: "David Judge",
    role: "judge",
    managerId: "2",
    createdAt: new Date("2024-01-05"),
  },
]

export const mockTeams: Team[] = [
  {
    _id: "68cf964898eaea823cb1d12b",
    teamId: "IGC009",
    teamName: "BMW",
    leaderEmail: "abc@example.com",
    videoUrl: "https://www.youtube.com/watch?v=b8vDgqGNwKw&list=RDb8vDgqGNwKw&start_radio=1",
    status: "pending",
    assignedJudgeId: "4",
    submittedAt: new Date("2025-09-21T06:08:08.196Z"),
    createdAt: new Date("2025-09-21T06:08:08.198Z"),
    updatedAt: new Date("2025-09-21T06:08:08.198Z"),
  },
  {
    _id: "68cf964898eaea823cb1d12c",
    teamId: "IGC010",
    teamName: "Tesla Innovators",
    leaderEmail: "tesla@example.com",
    videoUrl: "https://www.youtube.com/watch?v=example2",
    status: "approved",
    assignedJudgeId: "5",
    submittedAt: new Date("2025-09-20T10:15:30.000Z"),
    createdAt: new Date("2025-09-20T10:15:30.000Z"),
    updatedAt: new Date("2025-09-21T14:22:15.000Z"),
  },
  {
    _id: "68cf964898eaea823cb1d12d",
    teamId: "IGC011",
    teamName: "Code Warriors",
    leaderEmail: "warriors@example.com",
    videoUrl: "https://www.youtube.com/watch?v=example3",
    status: "rejected",
    assignedJudgeId: "4",
    submittedAt: new Date("2025-09-19T16:45:22.000Z"),
    createdAt: new Date("2025-09-19T16:45:22.000Z"),
    updatedAt: new Date("2025-09-21T09:30:45.000Z"),
  },
]

// Authentication functions
export function authenticateUser(email: string, password: string): User | null {
  // Simple mock authentication - in real app, this would hash passwords and check database
  const user = mockUsers.find((u) => u.email === email)
  if (user && password === "password123") {
    return user
  }
  return null
}

export function hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy = { manager: 3, admin: 2, judge: 1 }
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole]
}

export function canManageUser(managerUser: User, targetUser: User): boolean {
  if (managerUser.role === "manager") {
    return targetUser.role === "admin" || targetUser.role === "judge"
  }
  if (managerUser.role === "admin") {
    return targetUser.role === "judge" && targetUser.managerId === managerUser.id
  }
  return false
}

// Returns true if the user can access the target profile (only their own)
export function canAccessProfile(currentUser: User, targetUser: User): boolean {
  return currentUser.id === targetUser.id
}
