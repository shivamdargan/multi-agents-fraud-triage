"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation } from "@tanstack/react-query";
import { insightsApi } from "@/lib/api/insights";
import { format } from "date-fns";
import { FileText, Download, RefreshCw, TrendingUp, AlertCircle, Eye, Copy, CheckCircle } from "lucide-react";
import { toast } from "sonner";

interface InsightsReportsProps {
  customerId: string;
}

export function InsightsReports({ customerId }: InsightsReportsProps) {
  const [period, setPeriod] = useState("30d");
  const [reportType, setReportType] = useState("MONTHLY_SPEND");
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [showReportPreview, setShowReportPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  useEffect(() => {
    console.log('InsightsReports component mounted for customer:', customerId);
    return () => {
      console.log('InsightsReports component unmounted for customer:', customerId);
    };
  }, [customerId]);

  const { data: insights, isLoading: insightsLoading } = useQuery({
    queryKey: ["insights", customerId, period],
    queryFn: () => insightsApi.getSpendInsights(customerId, period),
    staleTime: 30000, // Don't refetch for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const { data: reports, refetch: refetchReports } = useQuery({
    queryKey: ["reports", customerId],
    queryFn: () => insightsApi.getReports(customerId),
    staleTime: 30000, // Don't refetch for 30 seconds
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  const generateReportMutation = useMutation({
    mutationFn: async () => {
      if (isGenerating) {
        console.log('Already generating a report, skipping duplicate request');
        throw new Error('Already generating a report');
      }
      setIsGenerating(true);
      console.log('Generating report:', reportType, 'for customer:', customerId);
      try {
        const result = await insightsApi.generateReport(customerId, reportType);
        return result;
      } finally {
        setIsGenerating(false);
      }
    },
    onSuccess: (data) => {
      console.log('Report generated successfully:', data);
      if (data?.status === 'DUPLICATE_BLOCKED') {
        console.log('Duplicate request was blocked by backend');
        return;
      }
      toast.success(`Report "${reportType.replace(/_/g, ' ')}" generated successfully`);
      refetchReports();
    },
    onError: (error: any) => {
      if (error.message !== 'Already generating a report') {
        console.error('Report generation failed:', error);
        toast.error(`Failed to generate report: ${error.message || 'Unknown error'}`);
      }
    },
    retry: false, // Don't retry on failure
  });

  const handleViewReport = (report: any) => {
    setSelectedReport(report);
    setShowReportPreview(true);
  };

  const handleCopyReport = async (report: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report.content || report, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Report data copied to clipboard");
    } catch (err) {
      console.error('Failed to copy report:', err);
      toast.error("Failed to copy report");
    }
  };

  const handleDownloadReport = (report: any) => {
    const dataStr = JSON.stringify(report, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${report.type.toLowerCase()}_${customerId}_${format(new Date(report.generatedAt), 'yyyy-MM-dd')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const getReportTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      'MONTHLY_SPEND': 'Monthly Spend Analysis',
      'FRAUD_ANALYSIS': 'Fraud Risk Analysis', 
      'TRANSACTION_SUMMARY': 'Transaction Summary',
      'RISK_ASSESSMENT': 'Risk Assessment Report'
    };
    return labels[type] || type.replace(/_/g, ' ');
  };

  const getReportDescription = (type: string) => {
    const descriptions: Record<string, string> = {
      'MONTHLY_SPEND': 'Detailed breakdown of spending patterns, categories, and trends over the past month',
      'FRAUD_ANALYSIS': 'Comprehensive fraud risk assessment including alerts, patterns, and recommendations',
      'TRANSACTION_SUMMARY': 'Complete transaction history with analytics and merchant breakdowns',
      'RISK_ASSESSMENT': 'Overall risk profile analysis including device, velocity, and behavioral signals'
    };
    return descriptions[type] || 'Comprehensive analysis report';
  };

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
                      insights.summary?.totalSpend || 
                      (insights.categoryBreakdown || insights.categories?.categories || [])
                        .reduce((sum, cat) => sum + (cat.amount || cat.total || 0), 0) || 0
                    ).toFixed(2)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Top Merchants</p>
                  <div className="space-y-1">
                    {(Array.isArray(insights.topMerchants) ? insights.topMerchants : insights.topMerchants?.merchants || [])
                      ?.slice(0, 2).map((merchant, idx) => (
                      <p key={idx} className="text-sm">
                        {merchant.merchant || merchant.name}: ${Math.abs(merchant.total || merchant.amount || 0).toFixed(2)}
                      </p>
                    ))}
                  </div>
                </div>
              </div>


              {((insights.categoryBreakdown?.length > 0 && insights.categoryBreakdown) || 
                (insights.categories?.categories?.length > 0 && insights.categories.categories)) && (
                <div>
                  <h4 className="font-medium mb-2">Top Categories</h4>
                  <div className="space-y-2">
                    {(insights.categoryBreakdown || insights.categories?.categories || []).slice(0, 5).map((cat, idx) => {
                      const amount = Math.abs(cat.amount || cat.total || 0);
                      const categories = insights.categoryBreakdown || insights.categories?.categories || [];
                      const totalSpend = categories.reduce((sum, c) => sum + Math.abs(c.amount || c.total || 0), 0);
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
          <div className="space-y-4 mb-6">
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="MONTHLY_SPEND">{getReportTypeLabel('MONTHLY_SPEND')}</SelectItem>
                <SelectItem value="FRAUD_ANALYSIS">{getReportTypeLabel('FRAUD_ANALYSIS')}</SelectItem>
                <SelectItem value="TRANSACTION_SUMMARY">{getReportTypeLabel('TRANSACTION_SUMMARY')}</SelectItem>
                <SelectItem value="RISK_ASSESSMENT">{getReportTypeLabel('RISK_ASSESSMENT')}</SelectItem>
              </SelectContent>
            </Select>
            
            <div className="p-4 bg-muted/20 rounded-lg border">
              <p className="text-sm text-muted-foreground mb-2">
                {getReportDescription(reportType)}
              </p>
            </div>
            
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!isGenerating && !generateReportMutation.isPending) {
                  console.log('Button clicked - starting report generation');
                  generateReportMutation.mutate();
                } else {
                  console.log('Button clicked but generation already in progress');
                }
              }}
              disabled={isGenerating || generateReportMutation.isPending}
              className="w-full"
              size="lg"
              type="button"
            >
              {isGenerating || generateReportMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating {getReportTypeLabel(reportType)}...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate {getReportTypeLabel(reportType)}
                </>
              )}
            </Button>
          </div>

          <div className="space-y-3">
            {reports?.map((report: any) => (
              <div
                key={report.id}
                className="p-4 border rounded-lg bg-card hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm">{getReportTypeLabel(report.type)}</p>
                        <Badge variant={report.status === "COMPLETED" ? "default" : "secondary"}>
                          {report.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        Generated {format(new Date(report.generatedAt), "MMM d, yyyy 'at' HH:mm")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {getReportDescription(report.type)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleViewReport(report)}
                      className="text-xs"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopyReport(report)}
                      className="text-xs"
                    >
                      {copied ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <Copy className="h-3 w-3 mr-1" />
                      )}
                      Copy
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownloadReport(report)}
                      className="text-xs"
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </Button>
                  </div>
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

      {/* Report Preview Dialog */}
      <Dialog open={showReportPreview} onOpenChange={setShowReportPreview}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              {selectedReport ? getReportTypeLabel(selectedReport.type) : 'Report Preview'}
            </DialogTitle>
            <DialogDescription>
              {selectedReport ? (
                <>
                  Generated on {format(new Date(selectedReport.generatedAt), "MMMM d, yyyy 'at' h:mm a")} • 
                  Expires {format(new Date(selectedReport.expiresAt), "MMM d, yyyy")}
                </>
              ) : (
                'Preview report content and data'
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 min-h-0 space-y-4">
            {/* Action Buttons */}
            <div className="flex items-center justify-between bg-muted/20 p-3 rounded-lg border">
              <div className="text-sm text-muted-foreground">
                {selectedReport ? `Report ID: ${selectedReport.id.slice(0, 8)}...` : 'No report selected'}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedReport && handleCopyReport(selectedReport)}
                  disabled={!selectedReport}
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-3 w-3 mr-1" />
                      Copy JSON
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => selectedReport && handleDownloadReport(selectedReport)}
                  disabled={!selectedReport}
                >
                  <Download className="h-3 w-3 mr-1" />
                  Download
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowReportPreview(false)}
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Report Content */}
            <div className="flex-1 min-h-0">
              <div className="h-full border-2 rounded-lg p-4 bg-slate-50 dark:bg-slate-950 overflow-auto">
                <pre className="text-xs text-foreground whitespace-pre-wrap font-mono leading-relaxed">
                  {selectedReport ? JSON.stringify(selectedReport, null, 2) : 'No report data available'}
                </pre>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(" ");
}