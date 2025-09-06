"use client";

import { use } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { TransactionTimeline } from "@/components/transaction-timeline";
import { SpendBreakdown } from "@/components/spend-breakdown";
import { InsightsReports } from "@/components/insights-reports";
import { useCustomerTransactions } from "@/lib/hooks/useTransactions";
import { useRiskSignals } from "@/lib/hooks/useFraud";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, CreditCard, Shield, Activity } from "lucide-react";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CustomerPage({ params }: PageProps) {
  const { id: customerId } = use(params);
  
  const { data: transactionsData } = useCustomerTransactions(customerId);
  const { data: riskSignals } = useRiskSignals(customerId);

  const riskLevel = getRiskLevel(riskSignals?.overallRisk || 0);
  const riskColor = getRiskColor(riskLevel);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Customer Profile</h1>
          <p className="text-muted-foreground mt-1">ID: {customerId}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Contact Customer</Button>
          <Button variant="destructive">Freeze Cards</Button>
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
              <Badge className={cn("ml-auto", riskColor)}>
                {riskLevel}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-500" />
              <span className="text-2xl font-bold">3</span>
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
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="text-sm">Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {riskSignals.recommendations.map((rec, idx) => (
                <li key={idx} className="text-sm flex items-start gap-2">
                  <span className="text-orange-500 mt-0.5">•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
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
    </div>
  );
}

function getRiskLevel(score: number): string {
  if (score > 0.8) return "CRITICAL";
  if (score > 0.6) return "HIGH";
  if (score > 0.4) return "MEDIUM";
  return "LOW";
}

function getRiskColor(level: string): string {
  switch (level) {
    case "CRITICAL": return "text-red-500";
    case "HIGH": return "text-orange-500";
    case "MEDIUM": return "text-yellow-500";
    case "LOW": return "text-green-500";
    default: return "text-gray-500";
  }
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}