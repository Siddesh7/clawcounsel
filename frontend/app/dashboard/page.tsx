"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

function DashboardContent() {
  const params = useSearchParams();
  const agentId = params.get("agentId");
  const [agent, setAgent] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);

  useEffect(() => {
    if (!agentId) return;
    fetch(`${BACKEND_URL}/api/agents/${agentId}`)
      .then((r) => r.json())
      .then((d) => setAgent(d.agent))
      .catch(() => {});
  }, [agentId]);

  const severityColor: Record<string, string> = {
    low: "secondary",
    medium: "outline",
    high: "destructive",
    critical: "destructive",
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">OpenClaw Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              {agent ? agent.companyName : "Loading..."}
            </p>
          </div>
          <Badge variant={agent?.status === "active" ? "default" : "outline"}>
            {agent?.status ?? "—"}
          </Badge>
        </div>

        {/* Agent Status */}
        <Card>
          <CardHeader>
            <CardTitle>Agent Status</CardTitle>
            <CardDescription>Your OpenClaw sandbox instance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Agent ID</span>
              <span className="font-mono text-xs">{agentId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Slack</span>
              <span>{agent?.slackTeamId ? "Connected" : "Not connected"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">NFT Token</span>
              <span>{agent?.nftTokenId ?? "Pending mint"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Alerts</CardTitle>
            <CardDescription>Legal signals from your documents and Slack</CardDescription>
          </CardHeader>
          <CardContent>
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No alerts yet. Once your documents are ingested, OpenClaw will monitor and surface critical signals here.
              </p>
            ) : (
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start justify-between gap-4 border rounded-md p-3">
                    <div>
                      <p className="font-medium text-sm">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.description}</p>
                    </div>
                    <Badge variant={severityColor[alert.severity] as any}>
                      {alert.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upload Documents */}
        <Card>
          <CardHeader>
            <CardTitle>Ingest Documents</CardTitle>
            <CardDescription>Feed contracts, PDFs, or GitHub repos to OpenClaw</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" disabled>
              Upload Document (coming soon)
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function DashboardPage() {
  return (
    <Suspense>
      <DashboardContent />
    </Suspense>
  );
}
