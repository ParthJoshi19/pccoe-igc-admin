// Authentication and role management utilities

export type UserRole =  "admin" | "judge";

export interface User {
  id: string;
  name: string;
  email: string;
  organization?: string;
  role: UserRole;
  token:string
  createdAt: Date;
  assignedTeams: string[];
}

export interface Team {
  _id: string;
  teamId: string;
  teamName: string;
  leaderEmail: string;
  videoUrl: string;
  status: "pending" | "approved" | "rejected";
  assignedJudgeId?: string;
  assignedJudgeEmail?: string;
  submittedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  state?: string;
  institution?: string;
}



// Authentication functions
export async function authenticateUser(
  email: string,
  password: string
): Promise<User | null> {
  console.log(email,password);
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/login`,
      {
        method: "POST",
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: email, password: password }),
      }
    );
    if(!res.ok){
      return null;
    }
    const data=await res.json();
    data.user.role=data.user.role==="admin"?"admin":"judge";
    data.user.token=data.token;
    // console.log(data);
    return data.user;
  } catch(e) {
    console.log(e);
  }
  return null;
}

export function hasPermission(
  userRole: UserRole,
  requiredRole: UserRole
): boolean {
  const roleHierarchy = { manager: 3, admin: 2, judge: 1 };
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

export function canManageUser(managerUser: User, targetUser: User): boolean {
  if (managerUser.role === "admin") {
    return (
      targetUser.role === "judge" 
    );
  }
  return false;
}

// Returns true if the user can access the target profile (only their own)
export function canAccessProfile(currentUser: User, targetUser: User): boolean {
  return currentUser.id === targetUser.id;
}

// Verify JWT token from request headers
export async function verifyToken(request: Request): Promise<{ authenticated: boolean; user?: any; error?: string }> {
  try {
    const authHeader = request.headers.get("Authorization");
    
    if (!authHeader) {
      return { authenticated: false, error: "No authorization header provided" };
    }

    // Support both "Bearer <token>" and just "<token>"
    const token = authHeader.startsWith("Bearer ") 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      return { authenticated: false, error: "No token provided" };
    }

    // Verify token with backend
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/auth/verify`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      }
    );

    if (!res.ok) {
      return { authenticated: false, error: "Invalid or expired token" };
    }

    const data = await res.json();
    return { authenticated: true, user: data.user };
  } catch (error) {
    console.error("Token verification error:", error);
    return { authenticated: false, error: "Token verification failed" };
  }
}
