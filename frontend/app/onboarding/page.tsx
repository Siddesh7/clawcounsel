"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const QUESTIONS = [
  {
    key: "claimDescription",
    label: "What is your primary legal claim or concern?",
    hint: "e.g. copyright infringement, contract breach, IP theft",
    type: "textarea",
  },
  {
    key: "claimType",
    label: "What type of legal issue is this?",
    hint: "copyright | contract | ip | other",
    type: "input",
  },
  {
    key: "opposingParty",
    label: "Who is the opposing party?",
    hint: "Company name or individual",
    type: "input",
  },
  {
    key: "opposingGithubUsername",
    label: "Do you have a GitHub username for the opposing party? (optional)",
    hint: "@username — we'll monitor their repos for infringement",
    type: "input",
  },
  {
    key: "evidenceDescription",
    label: "Describe the key evidence you have.",
    hint: "Contracts, timestamps, screenshots, code commits, etc.",
    type: "textarea",
  },
];

function OnboardingContent() {
  const router = useRouter();
  const params = useSearchParams();
  const agentId = params.get("agentId");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [slackInstallUrl, setSlackInstallUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<"questions" | "slack" | "done">("questions");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    fetch(`${BACKEND_URL}/api/slack/install?agentId=${agentId}`)
      .then((r) => r.json())
      .then((d) => setSlackInstallUrl(d.installUrl))
      .catch(() => {});
  }, [agentId]);

  const current = QUESTIONS[step];

  async function submitAnswers() {
    setLoading(true);
    await fetch(`${BACKEND_URL}/api/agents/${agentId}/onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...answers, onboardingComplete: false }),
    });
    setLoading(false);
    setPhase("slack");
  }

  async function finishOnboarding() {
    await fetch(`${BACKEND_URL}/api/agents/${agentId}/onboarding`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ onboardingComplete: true }),
    });
    router.push(`/dashboard?agentId=${agentId}`);
  }

  if (!agentId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Missing agent ID.</p>
      </div>
    );
  }

  if (phase === "slack") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <Badge variant="outline" className="w-fit mb-2">Step 2 of 2</Badge>
            <CardTitle>Connect Slack</CardTitle>
            <CardDescription>
              OpenClaw needs a Slack channel to send alerts and answer your team's legal questions.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {slackInstallUrl ? (
              <a href={slackInstallUrl}>
                <Button className="w-full">Add OpenClaw to Slack →</Button>
              </a>
            ) : (
              <p className="text-sm text-muted-foreground">Loading Slack install link...</p>
            )}
            <Button variant="outline" className="w-full" onClick={finishOnboarding}>
              Skip for now (set up later)
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-lg space-y-4">
        <div className="flex items-center gap-2">
          <Badge variant="outline">Step 1 of 2</Badge>
          <span className="text-sm text-muted-foreground">
            Question {step + 1} of {QUESTIONS.length}
          </span>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">{current.label}</CardTitle>
            <CardDescription>{current.hint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="answer">Your answer</Label>
              {current.type === "textarea" ? (
                <Textarea
                  id="answer"
                  rows={4}
                  value={answers[current.key] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [current.key]: e.target.value }))
                  }
                  placeholder="Type here..."
                />
              ) : (
                <Input
                  id="answer"
                  value={answers[current.key] ?? ""}
                  onChange={(e) =>
                    setAnswers((prev) => ({ ...prev, [current.key]: e.target.value }))
                  }
                  placeholder="Type here..."
                />
              )}
            </div>

            <div className="flex gap-2">
              {step > 0 && (
                <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                  Back
                </Button>
              )}
              {step < QUESTIONS.length - 1 ? (
                <Button
                  className="flex-1"
                  onClick={() => setStep((s) => s + 1)}
                >
                  Next →
                </Button>
              ) : (
                <Button className="flex-1" onClick={submitAnswers} disabled={loading}>
                  {loading ? "Saving..." : "Continue to Slack Setup →"}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}
