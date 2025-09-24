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
import type { User, UserRole } from "@/lib/auth"
import { useAuth } from "@/contexts/auth-context"

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
  const [role, setRole] = useState<UserRole>("judge")

  const getAvailableRoles = (): UserRole[] => {
    if (currentUser?.role === "manager") {
      return ["admin", "judge"]
    } else if (currentUser?.role === "admin") {
      return ["judge"]
    }
    return []
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newUser: User = {
      id: Date.now().toString(),
      name,
      email,
      role,
      createdAt: new Date(),
      managerId: currentUserId,
    }

    onAddUser(newUser)

    // Reset form
    setName("")
    setEmail("")
    setRole("judge")
  }

  const availableRoles = getAvailableRoles()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New User</DialogTitle>
          <DialogDescription>
            {currentUser?.role === "manager"
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
            <Button type="submit">Add User</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
