"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { PlayCircle, RefreshCw, CheckCircle, XCircle, AlertCircle, FileBarChart } from "lucide-react";
import { toast } from "sonner";

const evalsApi = {
  runEvaluation: async (name: string) => {
    const response = await fetch("/api/evals/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    return response.json();
  },
  getEvalRuns: async () => {
    const response = await fetch("/api/evals/runs");
    return response.json();
  },
  getMetrics: async () => {
    const response = await fetch("/api/evals/metrics");
    return response.json();
  },
};

export default function EvalsPage() {
  const [selectedRun, setSelectedRun] = useState<any>(null);
  const [selectedTestMethod, setSelectedTestMethod] = useState("standard");

  const { data: runs, refetch: refetchRuns } = useQuery({
    queryKey: ["eval-runs"],
    queryFn: evalsApi.getEvalRuns,
  });

  const { data: metrics, refetch: refetchMetrics } = useQuery({
    queryKey: ["eval-metrics"],
    queryFn: evalsApi.getMetrics,
  });

  const runEvalMutation = useMutation({
    mutationFn: (name: string) => evalsApi.runEvaluation(name),
    onSuccess: () => {
      toast.success("Evaluation started");
      refetchRuns();
      setTimeout(() => refetchMetrics(), 2000); // Refresh metrics after evaluation
    },
    onError: () => {
      toast.error("Failed to start evaluation");
    },
  });

  const testMethods = [
    { id: "standard", name: "Standard Evaluation", description: "Basic risk detection tests" },
    { id: "card-security", name: "Card Security Tests", description: "Lost/stolen card scenarios" },
    { id: "dispute-handling", name: "Dispute Management", description: "Unauthorized charge detection" },
    { id: "velocity-checks", name: "Velocity Analysis", description: "Transaction pattern analysis" },
    { id: "device-security", name: "Device Security", description: "Device change detection" },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "FAILED": return <XCircle className="h-4 w-4 text-red-500" />;
      case "RUNNING": return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "COMPLETED": return "bg-green-100 text-green-800";
      case "FAILED": return "bg-red-100 text-red-800";
      case "RUNNING": return "bg-blue-100 text-blue-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Evaluations</h1>
          <p className="text-muted-foreground mt-1">
            Model and agent performance evaluation
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTestMethod}
            onChange={(e) => setSelectedTestMethod(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
            disabled={runEvalMutation.isPending}
          >
            {testMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.name}
              </option>
            ))}
          </select>
          <Button
            onClick={() => {
              const method = testMethods.find(m => m.id === selectedTestMethod);
              runEvalMutation.mutate(method?.name || "Standard Evaluation");
            }}
            disabled={runEvalMutation.isPending}
          >
            {runEvalMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 mr-2" />
                Run Evaluation
              </>
            )}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Average Accuracy</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {((metrics?.averageAccuracy || 0) * 100).toFixed(1)}%
            </p>
            <Progress value={(metrics?.averageAccuracy || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Precision</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {((metrics?.averagePrecision || 0) * 100).toFixed(1)}%
            </p>
            <Progress value={(metrics?.averagePrecision || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recall</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {((metrics?.averageRecall || 0) * 100).toFixed(1)}%
            </p>
            <Progress value={(metrics?.averageRecall || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {((metrics?.passRate || 0) * 100).toFixed(1)}%
            </p>
            <Progress value={(metrics?.passRate || 0) * 100} className="mt-2" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Test Method Information</CardTitle>
            <CardDescription>
              {testMethods.find(m => m.id === selectedTestMethod)?.description}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Available Test Scenarios:</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Card Lost/Stolen - Freeze workflows</li>
                <li>• Unauthorized charges - Dispute creation</li>
                <li>• Device change detection</li>
                <li>• Velocity pattern analysis</li>
                <li>• Geographic anomaly detection</li>
                <li>• PII redaction compliance</li>
                <li>• Risk service timeout handling</li>
                <li>• Rate limiting behavior</li>
              </ul>
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  Test cases are loaded from <code>/fixtures/evals/</code> directory
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Evaluation Runs</CardTitle>
            <CardDescription>Click on a run to view details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {runs?.map((run: any) => (
                <div
                  key={run.id}
                  className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent"
                  onClick={() => setSelectedRun(run)}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(run.status)}
                    <div>
                      <p className="font-medium text-sm">{run.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(run.startedAt), "MMM d, HH:mm")}
                      </p>
                      {run.metrics && (
                        <p className="text-xs text-green-600">
                          {run.metrics.passed}/{run.metrics.total} passed
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge className={getStatusColor(run.status)}>
                    {run.status}
                  </Badge>
                </div>
              ))}
              {(!runs || runs.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No evaluation runs yet
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Confusion Matrix</CardTitle>
            <CardDescription>
              {selectedRun ? `Run: ${selectedRun.name}` : "Select a run to view details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedRun?.metrics ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-green-50 rounded">
                    <p className="text-2xl font-bold text-green-600">
                      {selectedRun.metrics.passed || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Passed Tests</p>
                  </div>
                  <div className="text-center p-4 bg-red-50 rounded">
                    <p className="text-2xl font-bold text-red-600">
                      {selectedRun.metrics.failed || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Failed Tests</p>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <h4 className="font-medium">Test Results Details</h4>
                  <div className="max-h-32 overflow-y-auto space-y-2">
                    {selectedRun.results?.map((result: any, idx: number) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-muted/50 rounded text-xs">
                        <div className="flex items-center gap-2">
                          {result.passed ? 
                            <CheckCircle className="h-3 w-3 text-green-500" /> : 
                            <XCircle className="h-3 w-3 text-red-500" />
                          }
                          <span className="font-medium">{result.name}</span>
                        </div>
                        <Badge variant={result.passed ? "default" : "destructive"} className="text-xs">
                          {result.passed ? "PASS" : "FAIL"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                  
                  <div className="pt-2 border-t text-xs text-muted-foreground">
                    Accuracy: {((selectedRun.metrics.accuracy || 0) * 100).toFixed(1)}% | 
                    Precision: {((selectedRun.metrics.precision || 0) * 100).toFixed(1)}% | 
                    Recall: {((selectedRun.metrics.recall || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <FileBarChart className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-sm text-muted-foreground">
                  Select an evaluation run to view details
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}