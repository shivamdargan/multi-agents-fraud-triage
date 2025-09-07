"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TriageDrawer } from "@/components/triage-drawer";
import { AlertsQueue } from "@/components/alerts-queue";
import { useAlerts } from "@/lib/hooks/useFraud";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Clock, CheckCircle, XCircle, Shield, FileText, TrendingUp, Activity, CreditCard, Gavel } from "lucide-react";

export default function AlertsPage() {
  const searchParams = useSearchParams();
  const alertId = searchParams.get("id");
  const [selectedAlert, setSelectedAlert] = useState<string | null>(alertId);
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const { data: alertsData, refetch } = useAlerts({
    status: statusFilter !== "all" ? statusFilter : undefined,
    severity: severityFilter !== "all" ? severityFilter : undefined,
  });

  useEffect(() => {
    if (alertId) {
      setSelectedAlert(alertId);
    }
  }, [alertId]);

  const alerts = alertsData?.alerts || [];
  const actionStats = alertsData?.actionStats;
  
  const stats = {
    total: alertsData?.pagination?.total || 0,
    pending: alerts.filter(a => a.status === "PENDING").length,
    inReview: alerts.filter(a => a.status === "IN_REVIEW").length,
    // Count both RESOLVED and FALSE_POSITIVE as resolved cases
    resolved: alerts.filter(a => a.status === "RESOLVED" || a.status === "FALSE_POSITIVE").length,
    falsePositive: alerts.filter(a => a.status === "FALSE_POSITIVE").length,
    escalated: alerts.filter(a => a.status === "ESCALATED").length,
    critical: alerts.filter(a => a.severity === "CRITICAL").length,
    high: alerts.filter(a => a.severity === "HIGH").length,
    // Calculate response rate
    responseRate: alerts.length > 0 
      ? Math.round((alerts.filter(a => a.status !== "PENDING").length / alerts.length) * 100)
      : 0,
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Alert Queue</h1>
          <p className="text-muted-foreground mt-1">
            Manage and triage fraud alerts
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="IN_REVIEW">In Review</SelectItem>
              <SelectItem value="RESOLVED">Resolved</SelectItem>
              <SelectItem value="FALSE_POSITIVE">False Positive</SelectItem>
              <SelectItem value="ESCALATED">Escalated</SelectItem>
            </SelectContent>
          </Select>
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Severity" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severity</SelectItem>
              <SelectItem value="LOW">Low</SelectItem>
              <SelectItem value="MEDIUM">Medium</SelectItem>
              <SelectItem value="HIGH">High</SelectItem>
              <SelectItem value="CRITICAL">Critical</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards - Only showing Total Alerts, Disputes, Frozen Cards, and High Risk */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-gray-500/5 to-slate-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-2xl font-bold">{stats.total}</span>
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.responseRate}% response rate
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/5 to-indigo-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Disputes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">{actionStats?.disputes?.total || 0}</span>
                {actionStats?.disputes?.recent > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    +{actionStats.disputes.recent} today
                  </span>
                )}
              </div>
              <Gavel className="h-5 w-5 text-purple-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active disputes
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/5 to-red-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Frozen Cards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">{actionStats?.cardActions?.totalFrozen || 0}</span>
                {actionStats?.cardActions?.frozenToday > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    +{actionStats.cardActions.frozenToday} today
                  </span>
                )}
              </div>
              <CreditCard className="h-5 w-5 text-orange-500" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently frozen
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/5 to-rose-500/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xl font-bold">{stats.critical}</span>
                {stats.high > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">
                    +{stats.high} high
                  </span>
                )}
              </div>
              <XCircle className="h-5 w-5 text-red-500" />
            </div>
            {stats.critical > 0 && (
              <Badge variant="destructive" className="mt-2 text-xs">
                Immediate action required
              </Badge>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Alert Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <AlertsQueue
            alerts={alertsData?.alerts || []}
            onSelectAlert={setSelectedAlert}
            selectedAlert={selectedAlert}
          />
        </CardContent>
      </Card>

      <TriageDrawer
        alertId={selectedAlert}
        open={!!selectedAlert}
        onOpenChange={(open) => !open && setSelectedAlert(null)}
        onActionComplete={() => refetch()}
      />
    </div>
  );
}