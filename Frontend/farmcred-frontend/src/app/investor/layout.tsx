"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import ProtectedRoute from "@/components/Security/ProtectedRoute";
import { useInvestorProfile } from "@/hooks/useInvestorData";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/investor/investor-sidebar";
import { SiteHeader } from "@/components/investor/site-header";

export default function InvestorLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { data: profile, loading, error } = useInvestorProfile();
  const { isAuth, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (error) {
      console.error("Failed to fetch user profile:", error);

      const isTokenError =
        typeof error === "string" &&
        (error.includes("token not valid") ||
          error.includes("Token is invalid") ||
          error.includes("Authentication credentials"));

      if (isTokenError) {
        console.log(
          "Token error detected in dashboard layout, redirecting to login"
        );
        router.replace("/login");
        return;
      }
    }
  }, [error, router]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eff3e4]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#158f20] mx-auto"></div>
          <p className="mt-4 text-[#157148] font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuth) {
    return null;
  }

  if (error && typeof error === "string" && error.includes("token not valid")) {
    return null;
  }

  return (
    <ProtectedRoute>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "calc(var(--spacing) * 62)",
            "--header-height": "calc(var(--spacing) * 14)",
          } as React.CSSProperties
        }
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader name={profile?.full_name} text={pathname} />
          <main className="flex-1">
            <div className="w-full px-4 py-6 mx-auto">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  );
}
