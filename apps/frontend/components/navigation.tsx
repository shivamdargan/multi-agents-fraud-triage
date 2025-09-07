"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  AlertCircle,
  Users,
  FileBarChart,
  Shield,
} from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: Home },
  { name: "Alerts", href: "/alerts", icon: AlertCircle },
  { name: "Customers", href: "/customers", icon: Users },
  { name: "Evaluations", href: "/evals", icon: FileBarChart },
];

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="w-64 border-r bg-card">
      <div className="flex h-16 items-center px-6 border-b">
        <Shield className="h-6 w-6 text-primary mr-2" />
        <span className="text-lg font-semibold">Aegis Support</span>
      </div>
      <div className="px-3 py-4">
        <ul className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}