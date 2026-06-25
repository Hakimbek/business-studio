"use client";

import { useState } from "react";
import { Poppins } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CompanyProvider, useCompany } from "@/contexts/company";
import { Sidebar } from "@/components/layout/Sidebar";
import { CompanySelect } from "@/components/layout/CompanySelect";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
});

function AppShell({ children }: { children: React.ReactNode }) {
  const { company } = useCompany();

  if (!company) return <CompanySelect />;

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <html lang="ru" className={poppins.variable}>
      <body className={poppins.className}>
        <QueryClientProvider client={queryClient}>
          <CompanyProvider>
            <AppShell>{children}</AppShell>
          </CompanyProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}
