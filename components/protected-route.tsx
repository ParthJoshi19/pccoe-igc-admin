"use client"

import type React from "react"

import { useAuth } from "@/contexts/auth-context"
import { type UserRole, hasPermission } from "@/lib/auth"
import { LoginForm } from "@/components/login-form"
import { Card, CardContent } from "@/components/ui/card"
import { Shield, AlertTriangle } from "lucide-react"
import { useRouter } from "next/router"

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  allowedRoles?: UserRole[]
}

export function ProtectedRoute({ children, requiredRole, allowedRoles }: ProtectedRouteProps) {
  const { user, isLoading } = useAuth()



  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    window.location.href = "/"
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <LoginForm />
      </div>
    )
  }

  // Unified permission check
  if (
    (requiredRole && !hasPermission(user.role, requiredRole)) ||
    (allowedRoles && !allowedRoles.includes(user.role))
  ) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">You don't have permission to access this page.</p>
            <p className="text-sm text-muted-foreground mt-2">
              {requiredRole && <>Required role: {requiredRole} | </>}
              Your role: {user.role}
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}
           