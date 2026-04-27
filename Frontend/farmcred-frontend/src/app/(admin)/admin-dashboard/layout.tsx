"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AdminHeader } from "@/components/admin-dashboard/admin-header";
import { AdminSidebar } from "@/components/admin-dashboard/admin-sidebar";
import AdminProtectedRoute from "@/components/Security/AdminProtecteddRoute";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <AdminProtectedRoute>
      <SidebarProvider
        style={
          {
            "--sidebar-width": "260px",
            "--header-height": "60px",
          } as React.CSSProperties
        }
      >
        <AdminSidebar variant="inset" />
        <SidebarInset>
          <AdminHeader text={""} />
          <main className="flex-1 p-6 bg-background">{children}</main>
        </SidebarInset>
      </SidebarProvider>
    </AdminProtectedRoute>
  );
}
