"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FraudTriageTable } from "@/components/fraud-triage-table";
import { KPICard } from "@/components/kpi-card";
import { useTransactionStats, useAnomalyDetection } from "@/lib/hooks/useTransactions";
import { useFraudQueue } from "@/lib/hooks/useFraud";
import { useDashboardMetrics } from "@/lib/hooks/useDashboard";
import { DollarSign, AlertTriangle, FileText, Clock, RefreshCw, Search, Filter, X, Download, Copy, CheckCircle } from "lucide-react";
import { format } from "date-fns";

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState("7d");
  const [merchantFilter, setMerchantFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [riskFilter, setRiskFilter] = useState("all");
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [copied, setCopied] = useState(false);

  // Memoize dates to prevent recalculation on every render
  const queryDates = useMemo(() => ({
    startDate: getStartDate(dateRange),
    endDate: new Date().toISOString(),
  }), [dateRange]);

  // Use dashboard metrics for better data
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useDashboardMetrics(queryDates);
  const { data: stats, isLoading: statsLoading, error: statsError } = useTransactionStats(queryDates);
  const { data: fraudQueue, isLoading: fraudLoading, error: fraudError, isFetching: fraudFetching } = useFraudQueue();
  
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
  const disputesOpened = metrics?.totalDisputes || fraudQueue?.stats?.ESCALATED || 0;
  const openDisputes = metrics?.openDisputes || 0;
  const avgResponseTime = metrics?.avgResponseTime || 0;

  // Handle export functionality
  const handleExport = () => {
    setShowExportDialog(true);
  };

  const handleCopyJson = async () => {
    const exportData = {
      timestamp: new Date().toISOString(),
      dateRange,
      filters: {
        merchant: merchantFilter,
        category: categoryFilter,
        risk: riskFilter,
      },
      alerts: alerts.map(alert => ({
        id: alert.id,
        customerId: alert.customerId,
        customerName: alert.customer?.name || 'Unknown',
        type: alert.type,
        severity: alert.severity,
        status: alert.status,
        riskScore: alert.riskScore,
        reasons: alert.reasons,
        createdAt: alert.createdAt,
        metadata: alert.metadata,
      })),
      summary: {
        totalAlerts: alerts.length,
        highRiskAlerts,
        totalAlerts,
        activeAlerts,
        disputesOpened,
        openDisputes,
        avgResponseTime,
      },
    };

    try {
      await navigator.clipboard.writeText(JSON.stringify(exportData, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

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
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
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
              variant="spend"
            />
            <KPICard
              title="High Risk Alerts"
              value={`${highRiskPercentage.toFixed(1)}%`}
              subtitle={`${highRiskAlerts} of ${totalAlerts}`}
              icon={AlertTriangle}
              trend={highRiskAlerts > 5 ? 15 : -10}
              variant="alerts"
            />
            <KPICard
              title="Disputes"
              value={disputesOpened.toString()}
              subtitle={openDisputes > 0 ? `${openDisputes} open` : undefined}
              icon={FileText}
              variant="disputes"
            />
            <KPICard
              title="Avg Response Time"
              value={`${avgResponseTime}ms`}
              icon={Clock}
              variant="response-time"
            />
          </>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle>Live Fraud Triage</CardTitle>
                <div className="flex items-center gap-2">
                  {isLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      <span>Loading...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-green-600">
                      <div className="relative">
                        <div className="h-2 w-2 bg-green-500 rounded-full animate-ping"></div>
                        <div className="absolute inset-0 h-2 w-2 bg-green-500 rounded-full"></div>
                      </div>
                      <span>Live</span>
                    </div>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Updates every 5s
              </div>
            </div>
            
            {/* Filters integrated into header */}
            <div className="flex flex-col sm:flex-row gap-3 p-4 bg-muted/30 rounded-lg border">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search merchant..."
                  value={merchantFilter}
                  onChange={(e) => setMerchantFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="5411">🛒 Grocery</SelectItem>
                    <SelectItem value="5541">⛽ Gas Station</SelectItem>
                    <SelectItem value="5812">🍽️ Restaurant</SelectItem>
                    <SelectItem value="6011">🏧 ATM</SelectItem>
                    <SelectItem value="7995">🎰 Gambling</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select value={riskFilter} onValueChange={setRiskFilter}>
                  <SelectTrigger className="w-36">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Risk Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="low">🟢 Low</SelectItem>
                    <SelectItem value="medium">🟡 Medium</SelectItem>
                    <SelectItem value="high">🟠 High</SelectItem>
                    <SelectItem value="critical">🔴 Critical</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    setMerchantFilter("");
                    setCategoryFilter("all");
                    setRiskFilter("all");
                  }}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              </div>
            </div>
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

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent className="max-w-6xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Alert Data
            </DialogTitle>
            <DialogDescription>
              Preview and copy the JSON data for {alerts.length} alerts from the fraud triage table
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 space-y-4">
            {/* Action Buttons */}
            <div className="flex items-center justify-between bg-muted/20 p-4 rounded-lg border">
              <div className="text-sm text-muted-foreground">
                Ready to export {alerts.length} alerts • {JSON.stringify({
                  timestamp: new Date().toISOString(),
                  dateRange,
                  filters: {
                    merchant: merchantFilter || null,
                    category: categoryFilter !== 'all' ? categoryFilter : null,
                    risk: riskFilter !== 'all' ? riskFilter : null,
                  },
                  alerts: alerts.map(alert => ({
                    id: alert.id,
                    customerId: alert.customerId,
                    customerName: alert.customer?.name || 'Unknown',
                    type: alert.type,
                    severity: alert.severity,
                    status: alert.status,
                    riskScore: alert.riskScore,
                    reasons: alert.reasons,
                    createdAt: alert.createdAt,
                    metadata: alert.metadata,
                  })),
                  summary: {
                    totalAlerts: alerts.length,
                    highRiskAlerts,
                    totalAlerts,
                    activeAlerts,
                    disputesOpened,
                    openDisputes,
                    avgResponseTime,
                  },
                }, null, 2).length} characters
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowExportDialog(false)}>
                  Close
                </Button>
                <Button onClick={handleCopyJson} className="gap-2">
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy JSON
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* JSON Preview */}
            <div className="flex-1 min-h-0">
              <div className="h-full border-2 rounded-lg p-6 bg-slate-50 dark:bg-slate-950 overflow-auto">
                <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                  {JSON.stringify({
                    timestamp: new Date().toISOString(),
                    dateRange,
                    filters: {
                      merchant: merchantFilter || null,
                      category: categoryFilter !== 'all' ? categoryFilter : null,
                      risk: riskFilter !== 'all' ? riskFilter : null,
                    },
                    alerts: alerts.map(alert => ({
                      id: alert.id,
                      customerId: alert.customerId,
                      customerName: alert.customer?.name || 'Unknown',
                      type: alert.type,
                      severity: alert.severity,
                      status: alert.status,
                      riskScore: alert.riskScore,
                      reasons: alert.reasons,
                      createdAt: alert.createdAt,
                      metadata: alert.metadata,
                    })),
                    summary: {
                      totalAlerts: alerts.length,
                      highRiskAlerts,
                      totalAlerts,
                      activeAlerts,
                      disputesOpened,
                      openDisputes,
                      avgResponseTime,
                    },
                  }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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

