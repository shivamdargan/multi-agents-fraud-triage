"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: Infinity, // Never mark data as stale
            // cacheTime  : 30 * 60 * 1000, // Keep in cache for 30 minutes
            refetchOnWindowFocus: false,
            refetchOnReconnect: false,
            refetchInterval: false, // Disable automatic refetching
            refetchIntervalInBackground: false,
            retry: false, // Disable retries completely for now
            enabled: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        {children}
      </ThemeProvider>
    </QueryClientProvider>
  );
}