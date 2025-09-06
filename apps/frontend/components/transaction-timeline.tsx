"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { CreditCard, MapPin, Smartphone } from "lucide-react";

interface Transaction {
  id: string;
  merchant: string;
  amount: number;
  currency: string;
  timestamp: string;
  mcc: string;
  status: string;
  deviceId?: string;
  geo?: {
    country: string;
  };
}

interface TransactionTimelineProps {
  transactions: Transaction[];
  customerId: string;
}

export function TransactionTimeline({ transactions }: TransactionTimelineProps) {
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    
    transactions.forEach((tx) => {
      const date = format(new Date(tx.timestamp), "yyyy-MM-dd");
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(tx);
    });
    
    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [transactions]);

  if (transactions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No transactions found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {groupedTransactions.map(([date, txns]) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-3">
            {format(new Date(date), "EEEE, MMMM d, yyyy")}
          </h3>
          <div className="space-y-3">
            {txns.map((tx) => (
              <TransactionCard key={tx.id} transaction={tx} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TransactionCard({ transaction }: { transaction: Transaction }) {
  const isDebit = transaction.amount < 0;
  const amount = Math.abs(transaction.amount);
  
  const statusColor = {
    APPROVED: "bg-green-100 text-green-800",
    DECLINED: "bg-red-100 text-red-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    FLAGGED: "bg-orange-100 text-orange-800",
  }[transaction.status] || "bg-gray-100 text-gray-800";

  const categoryName = getMccCategory(transaction.mcc);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex gap-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{transaction.merchant}</p>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {categoryName}
                </Badge>
                <Badge className={cn("text-xs", statusColor)}>
                  {transaction.status}
                </Badge>
                {transaction.geo && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {transaction.geo.country}
                  </span>
                )}
                {transaction.deviceId && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Smartphone className="h-3 w-3" />
                    {transaction.deviceId}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className={cn(
              "font-semibold text-lg",
              isDebit ? "text-red-500" : "text-green-500"
            )}>
              {isDebit ? "-" : "+"}
              {transaction.currency} {amount.toFixed(2)}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(transaction.timestamp), "HH:mm:ss")}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function getMccCategory(mcc: string): string {
  const categories: Record<string, string> = {
    "5411": "Grocery",
    "5541": "Gas Station",
    "5812": "Restaurant",
    "5999": "Miscellaneous",
    "6011": "ATM",
    "7995": "Gambling",
    "5816": "Digital Goods",
  };
  return categories[mcc] || "Other";
}