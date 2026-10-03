"use client";

import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { NDKProvider } from "./ndk-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <NDKProvider>
        {children}
        <Toaster
          theme="light"
          position="bottom-right"
          toastOptions={{
            className: "rounded-sm border-border bg-card text-card-foreground",
          }}
        />
      </NDKProvider>
    </ThemeProvider>
  );
}
