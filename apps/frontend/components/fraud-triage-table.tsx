"use client";

import { useMemo, useCallback, memo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { AlertCircle, ChevronRight } from "lucide-react";
import Link from "next/link";

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
  metadata?: {
    merchant?: string;
    mcc?: string;
    amount?: number;
    timestamp?: string;
    transactionId?: string;
  };
}

interface FraudTriageTableProps {
  alerts: Alert[];
  filters: {
    merchant?: string;
    category?: string;
    risk?: string;
  };
}

const TableRow = memo(({ alert, style }: { alert: Alert; style: React.CSSProperties }) => {
  const severityColor = {
    LOW: "bg-green-100 text-green-800",
    MEDIUM: "bg-yellow-100 text-yellow-800",
    HIGH: "bg-orange-100 text-orange-800",
    CRITICAL: "bg-red-100 text-red-800",
  }[alert.severity] || "bg-gray-100 text-gray-800";

  const statusColor = {
    PENDING: "bg-yellow-100 text-yellow-800",
    IN_REVIEW: "bg-blue-100 text-blue-800",
    RESOLVED: "bg-green-100 text-green-800",
    FALSE_POSITIVE: "bg-gray-100 text-gray-800",
    ESCALATED: "bg-red-100 text-red-800",
  }[alert.status] || "bg-gray-100 text-gray-800";

  return (
    <div
      style={style}
      className="flex items-center px-4 py-3 border-b hover:bg-accent/50 transition-colors"
    >
      <div className="flex-1 grid grid-cols-7 gap-4 items-center">
        <div className="col-span-1">
          <p className="text-sm font-medium">{alert.customer?.name || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{alert.customerId}</p>
        </div>
        <div className="col-span-1">
          <Badge className={cn("text-xs", severityColor)}>
            {alert.severity}
          </Badge>
        </div>
        <div className="col-span-1">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-red-500" />
            <span className="text-sm font-medium">{(alert.riskScore * 100).toFixed(0)}%</span>
          </div>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-muted-foreground truncate">
            {alert.reasons[0] || "No reasons provided"}
          </p>
          {alert.reasons.length > 1 && (
            <p className="text-xs text-muted-foreground">
              +{alert.reasons.length - 1} more
            </p>
          )}
        </div>
        <div className="col-span-1">
          <Badge className={cn("text-xs", statusColor)}>
            {alert.status.replace("_", " ")}
          </Badge>
        </div>
        <div className="col-span-1 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {format(new Date(alert.createdAt), "MMM d, HH:mm")}
          </p>
          <Link href={`/alerts?id=${alert.id}`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
});

TableRow.displayName = "TableRow";

export function FraudTriageTable({ alerts, filters }: FraudTriageTableProps) {
  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      // Filter by risk level
      if (filters.risk && filters.risk !== "all") {
        if (alert.severity.toLowerCase() !== filters.risk.toLowerCase()) {
          return false;
        }
      }
      
      // Filter by merchant (search)
      if (filters.merchant && filters.merchant.trim() !== "") {
        const merchant = alert.metadata?.merchant?.toLowerCase() || "";
        if (!merchant.includes(filters.merchant.toLowerCase().trim())) {
          return false;
        }
      }
      
      // Filter by category (MCC)
      if (filters.category && filters.category !== "all") {
        const mcc = alert.metadata?.mcc || "";
        if (mcc !== filters.category) {
          return false;
        }
      }
      
      return true;
    });
  }, [alerts, filters]);

  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: filteredAlerts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 10,
  });

  if (filteredAlerts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-lg font-medium">No alerts found</p>
        <p className="text-sm text-muted-foreground">
          Try adjusting your filters or check back later
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="flex items-center px-4 py-3 border-b bg-muted/50">
        <div className="flex-1 grid grid-cols-7 gap-4">
          <div className="col-span-1 text-xs font-medium text-muted-foreground">Customer</div>
          <div className="col-span-1 text-xs font-medium text-muted-foreground">Severity</div>
          <div className="col-span-1 text-xs font-medium text-muted-foreground">Risk Score</div>
          <div className="col-span-2 text-xs font-medium text-muted-foreground">Reasons</div>
          <div className="col-span-1 text-xs font-medium text-muted-foreground">Status</div>
          <div className="col-span-1 text-xs font-medium text-muted-foreground">Created</div>
        </div>
      </div>
      <div
        ref={parentRef}
        className="h-[500px] overflow-auto"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => (
            <TableRow
              key={filteredAlerts[virtualItem.index].id}
              alert={filteredAlerts[virtualItem.index]}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}