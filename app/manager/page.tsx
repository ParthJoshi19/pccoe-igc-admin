"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Header } from "@/components/header"
import { ManagerDashboard } from "@/components/manager-dashboard"

export default function ManagerPage() {
  return (
    <ProtectedRoute requiredRole="manager">
      <div className="min-h-screen bg-background">
        <Header />
        <ManagerDashboard />
      </div>
    </ProtectedRoute>
  )
}
