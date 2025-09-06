"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FraudTriageTable } from "@/components/fraud-triage-table";
import { KPICard } from "@/components/kpi-card";
import { useTransactionStats, useAnomalyDetection } from "@/lib/hooks/useTransactions";
import { useFraudQueue } from "@/lib/hooks/useFraud";
import { useDashboardMetrics } from "@/lib/hooks/useDashboard";
import { DollarSign, AlertTriangle, FileText, Clock, RefreshCw } from "lucide-react";
import { format } from "date-fns";

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState("7d");
  const [merchantFilter, setMerchantFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");

  // Memoize dates to prevent recalculation on every render
  const queryDates = useMemo(() => ({
    startDate: getStartDate(dateRange),
    endDate: new Date().toISOString(),
  }), [dateRange]);

  // Use dashboard metrics for better data
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useDashboardMetrics(queryDates);
  const { data: stats, isLoading: statsLoading, error: statsError } = useTransactionStats(queryDates);
  const { data: fraudQueue, isLoading: fraudLoading, error: fraudError } = useFraudQueue();
  
  const totalSpend = Math.abs(parseFloat(stats?.summary?.total) || 0);
  
  // Transform alerts to match FraudTriageTable interface
  const rawAlerts = metrics?.recentAlerts || fraudQueue?.queue || [];
  const alerts = rawAlerts.map(alert => ({
    id: alert.id,
    customerId: alert.customerId,
    type: alert.type,
    severity: alert.severity,
    riskScore: alert.riskScore || 0,
    reasons: Array.isArray(alert.reasons) ? alert.reasons : 
             alert.description ? [alert.description] : 
             ['No description'],
    status: alert.status,
    createdAt: alert.timestamp || alert.createdAt,
    customer: alert.customer || (alert.customerName ? { name: alert.customerName } : undefined),
    metadata: alert.metadata || {},
  }));
  
  const highRiskAlerts = alerts.filter(a => a.severity === "HIGH" || a.severity === "CRITICAL").length;
  const totalAlerts = metrics?.totalAlerts || alerts.length;
  const activeAlerts = metrics?.activeAlerts || totalAlerts;
  const highRiskPercentage = totalAlerts > 0 ? (highRiskAlerts / totalAlerts) * 100 : 0;
  const disputesOpened = fraudQueue?.stats?.ESCALATED || 0;
  const avgResponseTime = metrics?.avgResponseTime || 0;

  if (statsError || fraudError) {
    return (
      <div className="p-6">
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              <p className="font-medium">Error loading dashboard data</p>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              {statsError?.message || fraudError?.message || "Please try refreshing the page"}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoading = statsLoading || fraudLoading || metricsLoading;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
              <SelectItem value="90d">90 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline">Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          <>
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-2 w-full" />
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <KPICard
              title="Total Spend"
              value={`$${totalSpend.toLocaleString()}`}
              icon={DollarSign}
              trend={stats?.trends?.percentageChange}
            />
            <KPICard
              title="High Risk Alerts"
              value={`${highRiskPercentage.toFixed(1)}%`}
              subtitle={`${highRiskAlerts} of ${totalAlerts}`}
              icon={AlertTriangle}
              trend={highRiskAlerts > 5 ? 15 : -10}
            />
            <KPICard
              title="Disputes Opened"
              value={disputesOpened.toString()}
              icon={FileText}
            />
            <KPICard
              title="Avg Response Time"
              value={`${avgResponseTime}ms`}
              icon={Clock}
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Input
              placeholder="Search merchant..."
              value={merchantFilter}
              onChange={(e) => setMerchantFilter(e.target.value)}
            />
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="5411">Grocery</SelectItem>
                <SelectItem value="5541">Gas Station</SelectItem>
                <SelectItem value="5812">Restaurant</SelectItem>
                <SelectItem value="6011">ATM</SelectItem>
                <SelectItem value="7995">Gambling</SelectItem>
              </SelectContent>
            </Select>
            <Select value={riskFilter} onValueChange={setRiskFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Risk Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="secondary" onClick={() => {
              setMerchantFilter("");
              setCategoryFilter("all");
              setRiskFilter("all");
            }}>
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Live Fraud Triage</CardTitle>
            {isLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="h-4 w-4 animate-spin" />
                Loading...
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <FraudTriageTable
              alerts={alerts}
              filters={{
                merchant: merchantFilter,
                category: categoryFilter,
                risk: riskFilter,
              }}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function getStartDate(range: string): string {
  const now = new Date();
  const map: Record<string, number> = {
    "24h": 1,
    "7d": 7,
    "30d": 30,
    "90d": 90,
  };
  const days = map[range] || 7;
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return startDate.toISOString();
}

