"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation } from "@tanstack/react-query";
import { insightsApi } from "@/lib/api/insights";
import { format } from "date-fns";
import { FileText, Download, RefreshCw, TrendingUp, AlertCircle } from "lucide-react";
import { toast } from "sonner";

interface InsightsReportsProps {
  customerId: string;
}

export function InsightsReports({ customerId }: InsightsReportsProps) {
  const [period, setPeriod] = useState("30d");
  const [reportType, setReportType] = useState("MONTHLY_SPEND");

  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["insights", customerId, period],
    queryFn: () => insightsApi.getSpendInsights(customerId, period),
  });

  const { data: reports, refetch: refetchReports } = useQuery({
    queryKey: ["reports", customerId],
    queryFn: () => insightsApi.getReports(customerId),
  });

  const generateReportMutation = useMutation({
    mutationFn: () => insightsApi.generateReport(customerId, reportType),
    onSuccess: () => {
      toast.success("Report generated successfully");
      refetchReports();
    },
    onError: () => {
      toast.error("Failed to generate report");
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Spending Insights</CardTitle>
          <CardDescription>AI-generated analysis of spending patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7d">Last 7 days</SelectItem>
                <SelectItem value="30d">Last 30 days</SelectItem>
                <SelectItem value="90d">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {insightsLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : insights ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Spend</p>
                  <p className="text-2xl font-bold">
                    ${Math.abs(
                      insights.categoryBreakdown?.reduce((sum, cat) => sum + cat.amount, 0) || 0
                    ).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Top Merchants</p>
                  <div className="space-y-1">
                    {insights.topMerchants?.slice(0, 2).map((merchant, idx) => (
                      <p key={idx} className="text-sm">
                        {merchant.name}: ${Math.abs(merchant.amount).toFixed(2)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>


              {insights.categoryBreakdown && insights.categoryBreakdown.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Top Categories</h4>
                  <div className="space-y-2">
                    {insights.categoryBreakdown.slice(0, 5).map((cat, idx) => {
                      const amount = Math.abs(cat.amount);
                      const totalSpend = insights.categoryBreakdown.reduce((sum, c) => sum + Math.abs(c.amount), 0);
                      const percentage = totalSpend > 0 ? (amount / totalSpend) * 100 : 0;
                      return (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-sm">MCC {cat.category}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">${amount.toFixed(2)}</span>
                            <Badge variant="secondary" className="text-xs">
                              {percentage.toFixed(0)}%
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generated Reports</CardTitle>
          <CardDescription>Download detailed analysis reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY_SPEND">Monthly Spend</SelectItem>
                <SelectItem value="FRAUD_ANALYSIS">Fraud Analysis</SelectItem>
                <SelectItem value="TRANSACTION_SUMMARY">Transaction Summary</SelectItem>
                <SelectItem value="RISK_ASSESSMENT">Risk Assessment</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={() => generateReportMutation.mutate()}
              disabled={generateReportMutation.isPending}
            >
              {generateReportMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Report
                </>
              )}
            </Button>
          </div>

          <div className="space-y-2">
            {reports?.map((report: any) => (
              <div
                key={report.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium text-sm">{report.type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">
                      Generated {format(new Date(report.generatedAt), "MMM d, yyyy HH:mm")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={report.status === "COMPLETED" ? "default" : "secondary"}>
                    {report.status}
                  </Badge>
                  {report.downloadUrl && (
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
            {(!reports || reports.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No reports generated yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}