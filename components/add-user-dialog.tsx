"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { User,UserRole } from "@/lib/auth"
import { useAuth } from "@/contexts/auth-context"
import { get } from "http"

interface AddUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAddUser: (user: User) => void
  currentUserId: string
}

export function AddUserDialog({ open, onOpenChange, onAddUser, currentUserId }: AddUserDialogProps) {
  const { user: currentUser } = useAuth()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [organization, setOrganization] = useState("")
  const [role, setRole] = useState<UserRole>("judge")
  const [submitting, setSubmitting] = useState(false)

  const getAvailableRoles = (): UserRole[] => {
    if (currentUser?.role === "admin") {
      return ["judge"]
    }
    return []
  }

  function generateStrongPassword() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let password = "";
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (role !== "judge") return

    setSubmitting(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/v1/judges/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" ,"Authorization":`Bearer ${currentUser?.token}`},
        body: JSON.stringify({
          Username: email,
          Email: email,
          Password: generateStrongPassword(),
          Organization: organization,
          Role: "judge",
        }),
      })

      if (!res.ok) throw new Error("Failed to create judge")

      const created = await res.json()
      const newUser: User = {
        id: created.id ?? Date.now().toString(),
        name: created.name ?? name,
        email: created.email ?? email,
        role: "judge",
        organization: created.organization ?? "",
        createdAt: created.createdAt ? new Date(created.createdAt) : new Date(),
        assignedTeams: created.assignedTeams ?? [],
        token: created.token ?? "",
      }

      onAddUser(newUser)
      onOpenChange(false)

      // Reset form
      setName("")
      setEmail("")
      setOrganization("")
      setRole("judge")
    } catch (err) {
      // Optionally handle error UI
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const availableRoles = getAvailableRoles()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
            <DialogDescription>
              {currentUser?.role === "admin"
                ? "Create a new admin or judge account. They will be assigned to you as their manager."
                : "Create a new judge account. They will be assigned to you for management."}
            </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="col-span-3" required />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="organization" className="text-right">
                Organization
              </Label>
              <Input
                id="organization"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                className="col-span-3"
                placeholder="Optional"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Role
              </Label>
              <Select value={role} onValueChange={(value: UserRole) => setRole(value)}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {availableRoles.map((roleOption) => (
                    <SelectItem key={roleOption} value={roleOption}>
                      {roleOption.charAt(0).toUpperCase() + roleOption.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add User"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
