"use client";

import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAlert, useTriage, useTriageStream, useFreezeCard, useCreateDispute, useUpdateAlert } from "@/lib/hooks/useFraud";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Shield, 
  CreditCard, 
  FileText,
  RefreshCw,
  Info,
  Link,
  Loader2
} from "lucide-react";
import { toast } from "sonner";

interface TriageDrawerProps {
  alertId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActionComplete: () => void;
}

export function TriageDrawer({ alertId, open, onOpenChange, onActionComplete }: TriageDrawerProps) {
  const [triageSessionId, setTriageSessionId] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const previousOpen = useRef(open);

  const { data: alert } = useAlert(alertId || "");
  const triageMutation = useTriage();
  const freezeCardMutation = useFreezeCard();
  const createDisputeMutation = useCreateDispute();
  const updateAlertMutation = useUpdateAlert();
  const { progress: triageProgress, isComplete } = useTriageStream(triageSessionId);

  useEffect(() => {
    if (open && !previousOpen.current) {
      const button = document.querySelector('[role="dialog"] button');
      if (button instanceof HTMLElement) {
        button.focus();
      }
    }
    previousOpen.current = open;
  }, [open]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  const handleRunTriage = async () => {
    if (!alert || rateLimited) return;

    try {
      const result = await triageMutation.mutateAsync({
        customerId: alert.customerId,
        transactionId: undefined,
      });
      setTriageSessionId(result.sessionId);
    } catch (error: any) {
      if (error.statusCode === 429) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 2000);
        toast.error("Too many requests — try again in 2s");
      }
    }
  };

  const handleFreezeCard = async () => {
    if (rateLimited) return;

    const cardId = "card_001"; // In real app, get from alert data
    
    try {
      await freezeCardMutation.mutateAsync(cardId);
      onActionComplete();
      toast.success("Card frozen successfully");
    } catch (error: any) {
      if (error.statusCode === 429) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 2000);
        toast.error("Too many requests — try again in 2s");
      }
    }
  };

  const handleCreateDispute = async () => {
    if (rateLimited) return;

    try {
      await createDisputeMutation.mutateAsync({
        transactionId: "txn_001",
        reason: "Fraudulent transaction",
      });
      onActionComplete();
      toast.success("Dispute created successfully");
    } catch (error: any) {
      if (error.statusCode === 429) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 2000);
        toast.error("Too many requests — try again in 2s");
      }
    }
  };

  const handleMarkFalsePositive = async () => {
    if (!alertId || rateLimited) return;

    try {
      await updateAlertMutation.mutateAsync({
        id: alertId,
        status: "FALSE_POSITIVE",
      });
      onActionComplete();
      onOpenChange(false);
      toast.success("Alert marked as false positive");
    } catch (error: any) {
      if (error.statusCode === 429) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 2000);
        toast.error("Too many requests — try again in 2s");
      }
    }
  };

  const getRiskBadge = (score: number) => {
    const level = score > 0.8 ? "high" : score > 0.5 ? "medium" : "low";
    const color = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-green-100 text-green-800",
    }[level];

    return (
      <Badge className={cn("text-sm font-semibold", color)}>
        {level.toUpperCase()} RISK - {(score * 100).toFixed(0)}%
      </Badge>
    );
  };

  if (!alert) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:max-w-[600px]" aria-label="Triage Drawer">
        <SheetHeader>
          <SheetTitle>Fraud Alert Triage</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="h-6 w-6 text-primary" />
              {getRiskBadge(alert.riskScore)}
            </div>
            <Badge variant="outline">
              {format(new Date(alert.createdAt), "MMM d, HH:mm")}
            </Badge>
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Top Risk Reasons</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {alert.reasons.slice(0, 3).map((reason, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                    <span className="text-sm">{reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Tabs defaultValue="trace" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="trace">Agent Trace</TabsTrigger>
              <TabsTrigger value="details">Alert Details</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="trace" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Execution Trace</CardTitle>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleRunTriage}
                      disabled={triageMutation.isPending || rateLimited}
                    >
                      {triageMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Running...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Run Triage
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[300px]">
                    {triageProgress.length > 0 ? (
                      <div className="space-y-2">
                        {triageProgress.map((step, idx) => (
                          <TraceStep key={idx} step={step} />
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Info className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click "Run Triage" to start the analysis
                        </p>
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="details" className="mt-4">
              <Card>
                <CardContent className="pt-6">
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Customer ID</dt>
                      <dd className="text-sm mt-1">{alert.customerId}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Alert Type</dt>
                      <dd className="text-sm mt-1">{alert.type}</dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Severity</dt>
                      <dd className="text-sm mt-1">
                        <Badge variant="outline">{alert.severity}</Badge>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-muted-foreground">Status</dt>
                      <dd className="text-sm mt-1">
                        <Badge>{alert.status.replace("_", " ")}</Badge>
                      </dd>
                    </div>
                    {alert.metadata?.citations && (
                      <div>
                        <dt className="text-sm font-medium text-muted-foreground">Knowledge Base</dt>
                        <dd className="text-sm mt-1 space-y-1">
                          {alert.metadata.citations.map((citation: any, idx: number) => (
                            <div key={idx} className="flex items-center gap-1">
                              <Link className="h-3 w-3" />
                              <a href={`#${citation.anchor}`} className="text-blue-500 hover:underline">
                                {citation.title}
                              </a>
                            </div>
                          ))}
                        </dd>
                      </div>
                    )}
                  </dl>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="actions" className="mt-4">
              <div className="space-y-4">
                {alert.metadata?.otpRequired && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      OTP verification required for these actions
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Button
                    className="w-full justify-start"
                    variant="destructive"
                    onClick={handleFreezeCard}
                    disabled={freezeCardMutation.isPending || rateLimited}
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Freeze Card
                  </Button>

                  <Button
                    className="w-full justify-start"
                    variant="outline"
                    onClick={handleCreateDispute}
                    disabled={createDisputeMutation.isPending || rateLimited}
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Open Dispute
                  </Button>

                  <Button
                    className="w-full justify-start"
                    variant="secondary"
                    onClick={handleMarkFalsePositive}
                    disabled={updateAlertMutation.isPending || rateLimited}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark False Positive
                  </Button>
                </div>

                {rateLimited && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Too many requests — try again in 2s
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function TraceStep({ step }: { step: any }) {
  const getIcon = () => {
    switch (step.type) {
      case "complete": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      case "progress": return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex items-start gap-3 p-2 rounded-lg bg-muted/50">
      {getIcon()}
      <div className="flex-1">
        <p className="text-sm font-medium">{step.message}</p>
        {step.duration && (
          <p className="text-xs text-muted-foreground mt-1">
            Duration: {step.duration}ms
          </p>
        )}
        {step.error && (
          <p className="text-xs text-red-500 mt-1">
            Error: {step.error}
          </p>
        )}
      </div>
    </div>
  );
}