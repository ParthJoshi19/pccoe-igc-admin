"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Header } from "@/components/header"
import { AdminDashboard } from "@/components/admin-dashboard"

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div className="min-h-screen bg-background">
        <Header />
        <AdminDashboard />
      </div>
    </ProtectedRoute>
  )
}
