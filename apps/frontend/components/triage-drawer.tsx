"use client";

import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAlert, useTriage, useTriageStream, useFreezeCard, useUnfreezeCard, useCreateDispute, useUpdateAlert, useCard, useDisputeByTransaction, useAlertTraces } from "@/lib/hooks/useFraud";
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
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [pendingCardId, setPendingCardId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'freeze' | 'unfreeze' | null>(null);
  const [cardStatus, setCardStatus] = useState<'ACTIVE' | 'FROZEN' | 'CANCELLED' | null>(null);
  const [triageResult, setTriageResult] = useState<any>(null);
  const previousOpen = useRef(open);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: alert } = useAlert(alertId || "");
  
  // Load triage result from alert if available
  useEffect(() => {
    if (alert?.triageData?.result) {
      console.log('Found triage data in alert:', alert.triageData.result);
      setTriageResult(alert.triageData.result);
    }
  }, [alert]);
  const cardId = alert?.metadata?.cardId || "";
  const transactionId = alert?.metadata?.transactionId || "";
  const { data: card } = useCard(cardId);
  const { data: existingDispute } = useDisputeByTransaction(transactionId);
  const triageMutation = useTriage();
  const freezeCardMutation = useFreezeCard();
  const unfreezeCardMutation = useUnfreezeCard();
  const createDisputeMutation = useCreateDispute();
  const updateAlertMutation = useUpdateAlert();
  const { data: alertTracesData } = useAlertTraces(alertId || "");
  const { progress: triageProgress, isComplete } = useTriageStream(triageSessionId);
  
  // Update triage result when streaming completes
  useEffect(() => {
    if (triageProgress.length > 0) {
      const completeStep = triageProgress.find((step: any) => step.type === 'complete');
      if (completeStep && completeStep.result) {
        setTriageResult(completeStep.result);
      }
    }
  }, [triageProgress]);


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

  const handleRunTriage = async (forceRerun = false) => {
    if (!alert || rateLimited) return;

    if (forceRerun) {
      // For re-run: clear everything and reset session
      setTriageResult(null);
      setTriageSessionId(null);
      toast.info("Re-running triage analysis...");
    }
    
    try {
      const result = await triageMutation.mutateAsync({
        customerId: alert.customerId,
        transactionId: undefined,
        alertId: alertId || undefined,
        forceRerun: forceRerun,
      });
      
      if (result.alreadyRun && result.result && !forceRerun) {
        // Triage was already run, show the existing results (don't create placeholder traces)
        setTriageResult(result.result);
        toast.info("Showing previous triage analysis");
        return;
      }
      
      // Set session ID for streaming
      setTriageSessionId(result.sessionId);
      
      // Handle immediate result if available
      if (result.result) {
        console.log('Setting triage result:', result.result);
        setTriageResult(result.result);
      }
      
    } catch (error: any) {
      if (error.statusCode === 429) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 2000);
        toast.error("Too many requests — try again in 2s");
      }
    }
  };

  useEffect(() => {
    if (card) {
      setCardStatus(card.status);
    }
  }, [card]);

  // Load triage result from existing traces when drawer opens
  useEffect(() => {
    if (alertTracesData?.traces && alertTracesData.traces.length > 0 && !triageSessionId) {
      // Find the complete trace which has the full result
      const completeTrace = alertTracesData.traces.find((t: any) => t.action === 'complete');
      if (completeTrace?.output) {
        console.log('Found complete trace with output:', completeTrace.output);
        setTriageResult(completeTrace.output);
      }
      
      // Set the sessionId if it exists to prevent re-running
      if (alertTracesData.sessionId) {
        setTriageSessionId(alertTracesData.sessionId);
      }
    }
  }, [alertTracesData, triageSessionId]);


  const handleFreezeCard = async () => {
    if (rateLimited || !cardId) return;
    
    try {
      const result = await freezeCardMutation.mutateAsync({ cardId });
      
      if (result.status === 'PENDING_OTP') {
        setPendingCardId(cardId);
        setPendingAction('freeze');
        setShowOtpDialog(true);
        toast.info("Please enter OTP to confirm card freeze");
      } else if (result.status === 'FROZEN') {
        setCardStatus('FROZEN');
        onActionComplete();
        toast.success("Card frozen successfully");
      }
    } catch (error: any) {
      if (error.statusCode === 429) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 2000);
        toast.error("Too many requests — try again in 2s");
      } else {
        toast.error(error.message || "Failed to freeze card");
      }
    }
  };

  const handleUnfreezeCard = async () => {
    if (rateLimited || !cardId) return;
    
    try {
      const result = await unfreezeCardMutation.mutateAsync({ cardId });
      
      if (result.status === 'PENDING_OTP') {
        setPendingCardId(cardId);
        setPendingAction('unfreeze');
        setShowOtpDialog(true);
        toast.info("Please enter OTP to confirm card unfreeze");
      } else if (result.status === 'ACTIVE') {
        setCardStatus('ACTIVE');
        onActionComplete();
        toast.success("Card unfrozen successfully");
      }
    } catch (error: any) {
      if (error.statusCode === 429) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 2000);
        toast.error("Too many requests — try again in 2s");
      } else {
        toast.error(error.message || "Failed to unfreeze card");
      }
    }
  };

  const handleOtpSubmit = async () => {
    if (!pendingCardId || !otpValue || !pendingAction) return;

    try {
      if (pendingAction === 'freeze') {
        const result = await freezeCardMutation.mutateAsync({ 
          cardId: pendingCardId, 
          otp: otpValue 
        });
        
        if (result.status === 'FROZEN') {
          setCardStatus('FROZEN');
          setShowOtpDialog(false);
          setOtpValue("");
          setPendingCardId(null);
          setPendingAction(null);
          onActionComplete();
        }
      } else if (pendingAction === 'unfreeze') {
        const result = await unfreezeCardMutation.mutateAsync({ 
          cardId: pendingCardId, 
          otp: otpValue 
        });
        
        if (result.status === 'ACTIVE') {
          setCardStatus('ACTIVE');
          setShowOtpDialog(false);
          setOtpValue("");
          setPendingCardId(null);
          setPendingAction(null);
          onActionComplete();
        }
      }
    } catch (error: any) {
      toast.error("Invalid OTP. Please try again.");
    }
  };

  const handleCreateDispute = async () => {
    if (rateLimited || !transactionId || existingDispute?.id) return;
    
    try {
      const result = await createDisputeMutation.mutateAsync({
        transactionId,
        reason: "Fraudulent transaction",
        reasonCode: "10.4",
      });
      
      if (result.caseId) {
        onActionComplete();
        toast.success(`Dispute created successfully. Case ID: ${result.caseId}`);
      }
    } catch (error: any) {
      if (error.statusCode === 429) {
        setRateLimited(true);
        setTimeout(() => setRateLimited(false), 2000);
        toast.error("Too many requests — try again in 2s");
      } else {
        toast.error(error.message || "Failed to create dispute");
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
      
      // Call onActionComplete to refresh the parent list
      onActionComplete();
      
      // Show success toast
      toast.success("Alert marked as false positive");
      
      // Don't close the drawer immediately - let the user see the updated status
      // The user can close it manually if they want
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
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[600px] sm:max-w-[600px]" aria-label="Triage Drawer">
          <SheetHeader className="px-6 py-6">
            <SheetTitle>Fraud Alert Triage</SheetTitle>
          </SheetHeader>

        <div className="px-6 pb-6 space-y-6">
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
              <TabsTrigger value="trace">Analysis</TabsTrigger>
              <TabsTrigger value="details">Alert Details</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
            </TabsList>

            <TabsContent value="trace" className="mt-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm">Risk Analysis</CardTitle>
                    <div className="flex items-center gap-2">
                      {triageResult && !triageMutation.isPending && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRunTriage(true)}
                          disabled={rateLimited}
                          className="text-xs"
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Re-run
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunTriage(false)}
                        disabled={triageMutation.isPending || rateLimited || (triageResult && !triageMutation.isPending)}
                      >
                        {triageMutation.isPending ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Running...
                          </>
                        ) : triageResult ? (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Already Analyzed
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Run Triage
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Show triage decision and recommendations if available */}
                  {triageResult ? (
                    <div className="mb-4 space-y-3">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Shield className="h-5 w-5 text-primary" />
                          <span className="font-medium">Triage Analysis</span>
                        </div>
                        <Badge 
                          className={cn(
                            "font-bold text-sm px-3",
                            triageResult.decision === 'BLOCK' && "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-400",
                            triageResult.decision === 'REVIEW' && "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-400",
                            triageResult.decision === 'MONITOR' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-400",
                            triageResult.decision === 'APPROVE' && "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-400"
                          )}
                        >
                          {triageResult.decision || 'PENDING'}
                        </Badge>
                      </div>
                      
                      
                      {triageResult.recommendations && triageResult.recommendations.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium px-3">AI Recommendations</h4>
                          <div className="space-y-1">
                            {triageResult.recommendations.map((rec: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 p-2.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg text-sm">
                                <span className="leading-relaxed">{rec}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="border-b" />
                    </div>
                  ) : null}
                  
                  <div className="space-y-4">
                    {triageMutation.isPending ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span className="text-sm">Running analysis...</span>
                      </div>
                    ) : triageResult ? (
                      <div className="space-y-4">
                        {/* Risk Signals */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Device Risk */}
                          <Card className="p-5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Device Risk</span>
                              <Badge variant={triageResult.signals?.devices?.score > 0.7 ? "destructive" : triageResult.signals?.devices?.score > 0.4 ? "secondary" : "default"}>
                                {((triageResult.signals?.devices?.score || 0) * 100).toFixed(0)}%
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {triageResult.signals?.devices?.totalDevices || 0} devices, {triageResult.signals?.devices?.untrustedDevices || 0} untrusted
                            </div>
                          </Card>

                          {/* History Risk */}
                          <Card className="p-5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">History Risk</span>
                              <Badge variant={triageResult.signals?.history?.score > 0.7 ? "destructive" : triageResult.signals?.history?.score > 0.4 ? "secondary" : "default"}>
                                {((triageResult.signals?.history?.score || 0) * 100).toFixed(0)}%
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {triageResult.signals?.history?.alertCount || 0} alerts, {triageResult.signals?.history?.chargebackCount || 0} chargebacks
                            </div>
                          </Card>

                          {/* Velocity Risk */}
                          <Card className="p-5">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-muted-foreground">Velocity Risk</span>
                              <Badge variant={triageResult.signals?.velocity?.score > 0.7 ? "destructive" : triageResult.signals?.velocity?.score > 0.4 ? "secondary" : "default"}>
                                {((triageResult.signals?.velocity?.score || 0) * 100).toFixed(0)}%
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ${Math.abs(triageResult.signals?.velocity?.totalAmount || 0)} in {triageResult.signals?.velocity?.transactionCount || 0} txns
                            </div>
                          </Card>
                        </div>

                        {/* Overall Risk Score */}
                        <Card className="p-4">
                          <div className="flex items-center justify-between mb-3">
                            <span className="font-medium">Overall Risk Assessment</span>
                            <div className="text-right">
                              <div className="text-2xl font-bold">{(triageResult.riskScore * 100).toFixed(1)}%</div>
                              <div className="text-xs text-muted-foreground">Risk Score</div>
                            </div>
                          </div>
                          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full transition-all",
                                triageResult.riskScore > 0.7 ? "bg-red-500" :
                                triageResult.riskScore > 0.4 ? "bg-yellow-500" :
                                "bg-green-500"
                              )}
                              style={{ width: `${triageResult.riskScore * 100}%` }}
                            />
                          </div>
                        </Card>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 text-center">
                        <Info className="h-8 w-8 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click "Run Triage" to start the analysis
                        </p>
                      </div>
                    )}
                  </div>
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
                {cardId && (
                  <div className="mb-4 p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CreditCard className="h-4 w-4" />
                        <span className="text-sm font-medium">
                          Card ****{card?.last4 || "****"}
                        </span>
                      </div>
                      <Badge 
                        variant={
                          cardStatus === 'FROZEN' ? 'destructive' : 
                          cardStatus === 'ACTIVE' ? 'default' : 
                          'secondary'
                        }
                      >
                        {cardStatus || 'LOADING'}
                      </Badge>
                    </div>
                  </div>
                )}

                {alert.metadata?.otpRequired && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      OTP verification required for these actions
                    </AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  {cardId && cardStatus === 'ACTIVE' && (
                    <Button
                      className="w-full justify-start"
                      variant="destructive"
                      onClick={handleFreezeCard}
                      disabled={freezeCardMutation.isPending || rateLimited || !cardId}
                    >
                      <Shield className="h-4 w-4 mr-2" />
                      Freeze Card
                    </Button>
                  )}

                  {cardId && cardStatus === 'FROZEN' && (
                    <Button
                      className="w-full justify-start"
                      variant="default"
                      onClick={handleUnfreezeCard}
                      disabled={unfreezeCardMutation.isPending || rateLimited || !cardId}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Unfreeze Card
                    </Button>
                  )}

                  {transactionId && existingDispute && existingDispute.id && (
                    <div className="mb-2 p-3 bg-muted rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-medium">
                            Dispute #{existingDispute.id}
                          </span>
                        </div>
                        <Badge 
                          variant={
                            existingDispute.status === 'RESOLVED' ? 'default' : 
                            existingDispute.status === 'REJECTED' ? 'destructive' : 
                            existingDispute.status === 'INVESTIGATING' ? 'secondary' : 
                            'outline'
                          }
                        >
                          {existingDispute.status}
                        </Badge>
                      </div>
                      {existingDispute.reason && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {existingDispute.reason}
                        </p>
                      )}
                    </div>
                  )}

                  {transactionId && (!existingDispute || !existingDispute?.id) && (
                    <Button
                      className="w-full justify-start"
                      variant="outline"
                      onClick={handleCreateDispute}
                      disabled={createDisputeMutation.isPending || rateLimited || !transactionId}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Open Dispute
                    </Button>
                  )}

                  {alert?.status !== 'FALSE_POSITIVE' && alert?.status !== 'RESOLVED' && (
                    <Button
                      className="w-full justify-start"
                      variant="secondary"
                      onClick={handleMarkFalsePositive}
                      disabled={updateAlertMutation.isPending || rateLimited}
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Mark False Positive
                    </Button>
                  )}
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

    <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enter OTP</DialogTitle>
          <DialogDescription>
            Please enter the OTP sent to your registered mobile number to confirm the card {pendingAction === 'freeze' ? 'freeze' : 'unfreeze'}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Input
            type="text"
            placeholder="Enter 6-digit OTP"
            value={otpValue}
            onChange={(e) => setOtpValue(e.target.value)}
            maxLength={6}
            className="text-center text-lg tracking-widest"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setShowOtpDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleOtpSubmit}
            disabled={otpValue.length !== 6 || (pendingAction === 'freeze' ? freezeCardMutation.isPending : unfreezeCardMutation.isPending)}
          >
            {freezeCardMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Verifying...
              </>
            ) : (
              "Confirm"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    </>
  );
}

function TraceStep({ step, isNew }: { step: any; isNew?: boolean }) {
  const getIcon = () => {
    switch (step.type) {
      case "complete": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error": return <XCircle className="h-4 w-4 text-red-500" />;
      case "progress": return <Clock className="h-4 w-4 text-blue-500 animate-pulse" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div 
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-all duration-300",
        isNew ? "bg-primary/10 animate-in slide-in-from-bottom-2 fade-in" : "bg-muted/50",
        step.type === "error" && "bg-red-50 dark:bg-red-950/20",
        step.type === "complete" && "bg-green-50 dark:bg-green-950/20"
      )}
    >
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