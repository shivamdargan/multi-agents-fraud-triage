import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: number;
  variant?: "spend" | "alerts" | "disputes" | "response-time";
}

export function KPICard({ title, value, subtitle, icon: Icon, trend, variant }: KPICardProps) {
  const getGradientClass = () => {
    switch (variant) {
      case "spend":
        return "bg-gradient-to-br from-green-500/5 to-emerald-500/5";
      case "alerts":
        return "bg-gradient-to-br from-red-500/5 to-rose-500/5";
      case "disputes":
        return "bg-gradient-to-br from-blue-500/5 to-indigo-500/5";
      case "response-time":
        return "bg-gradient-to-br from-purple-500/5 to-violet-500/5";
      default:
        return "";
    }
  };

  return (
    <Card className={cn(getGradientClass())}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
            {trend !== undefined && (
              <div className="flex items-center gap-1 mt-2">
                {trend > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={cn(
                  "text-xs font-medium",
                  trend > 0 ? "text-green-500" : "text-red-500"
                )}>
                  {Math.abs(trend).toFixed(1)}%
                </span>
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}