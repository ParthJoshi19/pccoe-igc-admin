"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";

type Team = {
  teamId: string;
  teamName: string;
  unassignedCount: number;
};

type Judge = {
  id: string;
  name: string;
  currentAssignments: number;
  currentVideoAssignments: number;
};

export default function RunAssignmentsPage() {
  const [limitPerJudge, setLimitPerJudge] = useState<number>(6);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);

  // fetch current snapshot from backend
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/getAssignmentData", { method: "GET" });
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || "Failed to fetch data");
        }
        setTeams(
          (data.teams || []).map((t: any) => ({
            teamId: t.teamId,
            teamName: t.teamName,
            unassignedCount: t.unassignedCount ?? 0,
          }))
        );
        setJudges(data.judges || []);
      } catch (e: any) {
        setError(e?.message || "Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const judgesWithEmptySlots = useMemo(() => {
    return judges.map((j) => {
      const limit = limitPerJudge; 
      const emptySlots = Math.max(limit - j.currentAssignments  , 0);
      return { ...j, limitUsed: limit, emptySlots };
    });
  }, [limitPerJudge, judges]);

  const totalUnassigned = useMemo(
    () => teams.reduce((sum, t) => sum + t.unassignedCount, 0),
    [teams]
  );

  const totalEmptySlots = useMemo(
    () => judgesWithEmptySlots.reduce((sum, j) => sum + j.emptySlots, 0),
    [judgesWithEmptySlots]
  );

  const handleRunAssignments = async () => {
    setIsRunning(true);
    setMessage(null);
    setError(null);
    try {
      // pass limitPerJudge to backend if you later add support
      const res = await fetch("/api/assignTeams", {
        method: "POST",
        body: JSON.stringify({ CAP: limitPerJudge }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Assignment failed");
      }

      setMessage(
        `Assigned ${data.assignedCount} teams. Capacity per judge = ${data.capacity}.`
      );

      // Refresh snapshot after running assignments
      const refresh = await fetch("/api/getAssignmentData", { method: "GET" });
      const snap = await refresh.json();
      if (refresh.ok && snap.success) {
        setTeams(
          (snap.teams || []).map((t: any) => ({
            teamId: t.teamId,
            teamName: t.teamName,
            unassignedCount: t.unassignedCount ?? 0,
          }))
        );
        setJudges(snap.judges || []);
      }
    } catch (e: any) {
      setError(e?.message || "Failed to start assignments. Please try again.");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main className="p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold">Run Assignments</h1>
        <p className="text-sm text-muted-foreground">
          View teams with unassigned submissions and judge capacity. Set a
          per-judge assignment limit and run the automatic assignment.
        </p>
      </header>

      <section className="flex flex-col gap-4 md:flex-row">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Teams</CardTitle>
            {!loading && (
              <CardDescription>
                Total unassigned submissions: <b>{totalUnassigned}</b>
              </CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {loading && (
              <p className="text-sm text-muted-foreground mb-2">Loading...</p>
            )}
            {/* <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-1">Team</th>
                  <th className="text-right py-1">Unassigned Count</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.teamId} className="border-b last:border-0">
                    <td className="py-1">{team.teamName}</td>
                    <td className="py-1 text-right">{team.unassignedCount}</td>
                  </tr>
                ))}
              </tbody>
            </table> */}
          </CardContent>
        </Card>

        <Card className="flex-1">
          <CardHeader>
            <CardTitle>Judges Capacity</CardTitle>
            <CardDescription>
              Overview of judge load and remaining capacity.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm text-muted-foreground space-y-1">
              <div>
                Per-judge assignment limit (admin input):{" "}
                <b>{limitPerJudge}</b>
              </div>
              <div>
                Total available slots (after limit applied):{" "}
                <b>{totalEmptySlots}</b>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Judge</TableHead>
                  <TableHead className="text-right">Assigned Teams</TableHead>
                  <TableHead className="text-right">Limit Used</TableHead>
                  <TableHead className="text-right">Empty Slots</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {judgesWithEmptySlots.map((j) => (
                  <TableRow key={j.id}>
                    <TableCell>{j.name}</TableCell>
                    <TableCell className="text-right">
                      {j.currentAssignments}
                    </TableCell>
                    <TableCell className="text-right">
                      {j.limitUsed}
                    </TableCell>
                    <TableCell className="text-right">
                      {j.emptySlots}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle>Assignment Settings</CardTitle>
          <CardDescription>
            Configure and run automatic team assignments.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <label
              className="text-sm font-medium"
              htmlFor="limitPerJudge"
            >
              Per-judge assignment limit
            </label>
            <Input
              id="limitPerJudge"
              type="number"
              min={1}
              className="w-24"
              value={limitPerJudge}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v > 0) setLimitPerJudge(v);
              }}
            />
          </div>
          <Button
            type="button"
            onClick={handleRunAssignments}
            disabled={isRunning}
          >
            {isRunning ? "Running..." : "Run Assignments"}
          </Button>
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription className="text-sm">
                {error}
              </AlertDescription>
            </Alert>
          )}
          {message && !error && (
            <Alert>
              <AlertTitle>Success</AlertTitle>
              <AlertDescription className="text-sm">
                {message}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
