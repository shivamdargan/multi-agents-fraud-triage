"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ChevronRight, AlertTriangle, User } from "lucide-react";

interface Alert {
  id: string;
  customerId: string;
  type: string;
  severity: string;
  riskScore: number;
  reasons: string[];
  status: string;
  createdAt: string;
  customer?: {
    name: string;
  };
}

interface AlertsQueueProps {
  alerts: Alert[];
  onSelectAlert: (id: string) => void;
  selectedAlert: string | null;
}

export function AlertsQueue({ alerts, onSelectAlert, selectedAlert }: AlertsQueueProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "LOW": return "bg-green-100 text-green-800";
      case "MEDIUM": return "bg-yellow-100 text-yellow-800";
      case "HIGH": return "bg-orange-100 text-orange-800";
      case "CRITICAL": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING": return "bg-yellow-100 text-yellow-800";
      case "IN_REVIEW": return "bg-blue-100 text-blue-800";
      case "RESOLVED": return "bg-green-100 text-green-800";
      case "FALSE_POSITIVE": return "bg-gray-100 text-gray-800";
      case "ESCALATED": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  const getRiskColor = (score: number) => {
    if (score > 0.8) return "text-red-500";
    if (score > 0.6) return "text-orange-500";
    if (score > 0.4) return "text-yellow-500";
    return "text-green-500";
  };

  if (alerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No alerts in queue</p>
        <p className="text-sm text-muted-foreground">All alerts have been processed</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={cn(
            "flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-colors",
            selectedAlert === alert.id ? "bg-accent border-primary" : "hover:bg-accent/50"
          )}
          onClick={() => onSelectAlert(alert.id)}
        >
          <div className="flex items-start gap-4 flex-1">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">
                    {alert.customer?.name || "Unknown Customer"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ID: {alert.customerId}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-xs", getSeverityColor(alert.severity))}>
                    {alert.severity}
                  </Badge>
                  <Badge className={cn("text-xs", getStatusColor(alert.status))}>
                    {alert.status.replace("_", " ")}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Risk:</span>
                  <span className={cn("text-sm font-medium", getRiskColor(alert.riskScore))}>
                    {(alert.riskScore * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <span className="text-sm font-medium">{alert.type}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Created:</span>
                  <span className="text-sm">
                    {format(new Date(alert.createdAt), "MMM d, HH:mm")}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {alert.reasons.slice(0, 3).map((reason, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {reason}
                  </Badge>
                ))}
                {alert.reasons.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{alert.reasons.length - 3} more
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <Button variant="ghost" size="icon" className="ml-4">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}