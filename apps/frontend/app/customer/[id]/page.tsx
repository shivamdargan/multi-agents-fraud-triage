"use client";

import { use, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionTimeline } from "@/components/transaction-timeline";
import { SpendBreakdown } from "@/components/spend-breakdown";
import { InsightsReports } from "@/components/insights-reports";
import { useCustomerTransactions } from "@/lib/hooks/useTransactions";
import { useRiskSignals, useFreezeCard, useUnfreezeCard } from "@/lib/hooks/useFraud";
import { useCustomer } from "@/lib/hooks/useCustomers";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { CreditCard, Shield, Activity, Lock, Unlock } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerPage({ params }: PageProps) {
  const { id: customerId } = use(params);
  const [processingCardId, setProcessingCardId] = useState<string | null>(null);
  const [showOtpDialog, setShowOtpDialog] = useState(false);
  const [otpValue, setOtpValue] = useState("");
  const [pendingAction, setPendingAction] = useState<{ type: 'freeze' | 'unfreeze', cardId: string } | null>(null);
  
  const { data: customer, refetch: refetchCustomer } = useCustomer(customerId);
  const { data: transactionsData } = useCustomerTransactions(customerId);
  const { data: riskSignals } = useRiskSignals(customerId);
  const freezeCardMutation = useFreezeCard();
  const unfreezeCardMutation = useUnfreezeCard();

  const riskLevel = getRiskLevel(riskSignals?.overallRisk || 0);
  const riskColor = getRiskColor(riskLevel);
  const riskBadgeColor = getRiskBadgeColor(riskLevel);
  
  // Get cards from customer data
  const cards = customer?.cards || [];
  const activeCards = cards.filter((card: any) => card.status === 'ACTIVE');
  const frozenCards = cards.filter((card: any) => card.status === 'FROZEN');
  
  const handleFreezeCard = async (cardId: string, otp?: string) => {
    setProcessingCardId(cardId);
    try {
      const result = await freezeCardMutation.mutateAsync({ cardId, otp });
      
      if (result?.status === 'PENDING_OTP') {
        // OTP required
        setPendingAction({ type: 'freeze', cardId });
        setShowOtpDialog(true);
        toast.info("Please enter OTP to freeze the card");
      } else {
        // Success - toast is handled in the hook
        setOtpValue("");
        setShowOtpDialog(false);
      }
    } catch (error: any) {
      // Error handling is in the hook
      console.error("Error freezing card:", error);
    } finally {
      setProcessingCardId(null);
    }
  };
  
  const handleUnfreezeCard = async (cardId: string, otp?: string) => {
    setProcessingCardId(cardId);
    try {
      const result = await unfreezeCardMutation.mutateAsync({ cardId, otp });
      
      if (result?.status === 'PENDING_OTP') {
        // OTP required
        setPendingAction({ type: 'unfreeze', cardId });
        setShowOtpDialog(true);
        toast.info("Please enter OTP to unfreeze the card");
      } else {
        // Success - toast is handled in the hook
        setOtpValue("");
        setShowOtpDialog(false);
      }
    } catch (error: any) {
      // Error handling is in the hook
      console.error("Error unfreezing card:", error);
    } finally {
      setProcessingCardId(null);
    }
  };
  
  const handleOtpSubmit = async () => {
    if (!pendingAction || !otpValue) return;
    
    if (pendingAction.type === 'freeze') {
      await handleFreezeCard(pendingAction.cardId, otpValue);
    } else {
      await handleUnfreezeCard(pendingAction.cardId, otpValue);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Customer Profile</h1>
          <p className="text-muted-foreground mt-1">
            {customer?.name || `ID: ${customerId}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Risk Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Shield className={cn("h-5 w-5", riskColor)} />
              <span className="text-2xl font-bold">
                {((riskSignals?.overallRisk || 0) * 100).toFixed(0)}%
              </span>
              <Badge className={cn("ml-auto", riskBadgeColor)}>
                {riskLevel}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Cards Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">{activeCards.length}</span>
              <span className="text-sm text-muted-foreground">active</span>
              {frozenCards.length > 0 && (
                <Badge variant="destructive" className="ml-auto">
                  {frozenCards.length} frozen
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-500" />
              <span className="text-2xl font-bold">
                {transactionsData?.transactions?.length || 0}
              </span>
              <span className="text-sm text-muted-foreground">txns</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Devices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {riskSignals?.signals?.devices?.totalDevices || 0}
              </span>
              <span className="text-sm text-muted-foreground">
                ({riskSignals?.signals?.devices?.untrustedDevices || 0} untrusted)
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {riskSignals?.recommendations && riskSignals.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recommended Actions</CardTitle>
              <Badge className={cn(getRiskBadgeColor(riskLevel))}>
                {riskLevel} Risk
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {riskSignals.recommendations.map((rec, idx) => {
                // Parse emoji and text
                const parts = rec.split(' ');
                const emoji = parts[0];
                const text = parts.slice(1).join(' ');
                
                return (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <span className="text-lg mt-0.5">{emoji}</span>
                    <p className="text-sm leading-relaxed flex-1">{text}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cards Section */}
      {cards.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Payment Cards</CardTitle>
              <Badge>{cards.length} total</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cards.map((card: any) => (
                <div
                  key={card.id}
                  className={cn(
                    "p-4 rounded-lg border transition-all",
                    card.status === 'FROZEN' 
                      ? "bg-red-50/50 border-red-200 dark:bg-red-950/20" 
                      : "bg-card hover:shadow-sm"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CreditCard className={cn(
                        "h-5 w-5",
                        card.status === 'FROZEN' ? "text-red-600" : "text-gray-600"
                      )} />
                      <span className="font-medium">{card.network}</span>
                    </div>
                    <Badge 
                      variant={card.status === 'FROZEN' ? 'destructive' : 'default'}
                    >
                      {card.status}
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <p className={cn(
                      "text-sm font-mono",
                      card.status === 'FROZEN' && "opacity-60"
                    )}>
                      •••• •••• •••• {card.last4}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Expires: {card.expiryMonth && card.expiryYear 
                        ? `${String(card.expiryMonth).padStart(2, '0')}/${String(card.expiryYear).slice(-2)}`
                        : '**/**'}
                    </p>
                    {card.type && (
                      <Badge variant="outline" className="text-xs">
                        {card.type}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="mt-4">
                    {card.status === 'ACTIVE' ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="w-full"
                        onClick={() => handleFreezeCard(card.id)}
                        disabled={processingCardId === card.id || freezeCardMutation.isPending}
                      >
                        {processingCardId === card.id ? (
                          <>
                            <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Freezing...
                          </>
                        ) : (
                          <>
                            <Lock className="h-3 w-3 mr-1" />
                            Freeze Card
                          </>
                        )}
                      </Button>
                    ) : card.status === 'FROZEN' ? (
                      <Button
                        size="sm"
                        variant="default"
                        className="w-full"
                        onClick={() => handleUnfreezeCard(card.id)}
                        disabled={processingCardId === card.id || unfreezeCardMutation.isPending}
                      >
                        {processingCardId === card.id ? (
                          <>
                            <div className="h-3 w-3 mr-1 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Unfreezing...
                          </>
                        ) : (
                          <>
                            <Unlock className="h-3 w-3 mr-1" />
                            Unfreeze Card
                          </>
                        )}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="timeline" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="timeline">Transaction Timeline</TabsTrigger>
          <TabsTrigger value="breakdown">Spend Breakdown</TabsTrigger>
          <TabsTrigger value="insights">Insights & Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-6">
          <TransactionTimeline 
            transactions={transactionsData?.transactions || []} 
            customerId={customerId}
          />
        </TabsContent>

        <TabsContent value="breakdown" className="mt-6">
          <SpendBreakdown 
            customerId={customerId}
            transactions={transactionsData?.transactions || []}
          />
        </TabsContent>

        <TabsContent value="insights" className="mt-6">
          <InsightsReports customerId={customerId} />
        </TabsContent>
      </Tabs>

      {/* OTP Dialog */}
      <Dialog open={showOtpDialog} onOpenChange={setShowOtpDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter OTP</DialogTitle>
            <DialogDescription>
              Please enter the OTP sent to your registered mobile number to {pendingAction?.type} the card.
              (For testing, use: 123456)
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="otp">OTP Code</Label>
              <Input
                id="otp"
                type="text"
                placeholder="Enter 6-digit OTP"
                value={otpValue}
                onChange={(e) => setOtpValue(e.target.value)}
                maxLength={6}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowOtpDialog(false);
                setOtpValue("");
                setPendingAction(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleOtpSubmit}
              disabled={otpValue.length !== 6 || processingCardId !== null}
            >
              {processingCardId ? "Processing..." : "Verify OTP"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getRiskLevel(score: number): string {
  if (score >= 0.7) return "HIGH";
  if (score >= 0.4) return "MEDIUM";
  return "LOW";
}

function getRiskColor(level: string): string {
  switch (level) {
    case "HIGH": return "text-red-500";
    case "MEDIUM": return "text-yellow-500";
    case "LOW": return "text-green-500";
    default: return "text-gray-500";
  }
}

function getRiskBadgeColor(level: string): string {
  switch (level) {
    case "HIGH": return "bg-red-100 text-red-800";
    case "MEDIUM": return "bg-yellow-100 text-yellow-800";
    case "LOW": return "bg-green-100 text-green-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}