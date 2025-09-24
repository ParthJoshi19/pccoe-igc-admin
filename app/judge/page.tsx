"use client"

import { ProtectedRoute } from "@/components/protected-route"
import { Header } from "@/components/header"
import { JudgeDashboard } from "@/components/judge-dashboard"

export default function JudgePage() {
  return (
    <ProtectedRoute requiredRole="judge">
      <div className="min-h-screen bg-background">
        <Header />
        <JudgeDashboard />
      </div>
    </ProtectedRoute>
  )
}
