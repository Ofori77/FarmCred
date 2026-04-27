"use client";

import * as React from "react";
import Image from "next/image";
import {
  Home,
  Users,
  Banknote,
  Bell,
  Settings,
  BarChart3,
  HandCoins,
  Handshake,
  HelpCircle,
  FileBarChart2,
  ClipboardEdit,
} from "lucide-react";
import { NavMain } from "./admin-main";
import { NavSecondary } from "./admin-secondary";
import { NavUser } from "./admin-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { useLenderProfile } from "@/hooks/useLenderData";

export function AdminSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { data, loading, error } = useLenderProfile();

  const navMain = [
    {
      title: "Dashboard",
      url: "/admin-dashboard",
      icon: Home,
    },
    {
      title: "User Management",
      url: "/admin-dashboard/user-management",
      icon: Users,
    },
    {
      title: "Order Management",
      url: "/admin-dashboard/order-management",
      icon: FileBarChart2,
    },
    // {
    //   title: "Transaction Monitoring",
    //   url: "/admin-dashboard/transaction-monitoring",
    //   icon: Banknote,
    // },
    {
      title: "Trust System",
      url: "/admin-dashboard/trust-system",
      icon: Handshake,
    },
    {
      title: "Loan Management",
      url: "/admin-dashboard/loan-management",
      icon: HandCoins,
    },
    {
      title: "Dispute Resolution",
      url: "/admin-dashboard/dispute-resolution",
      icon: ClipboardEdit,
    },
    // {
    //   title: "Analytics",
    //   url: "/admin-dashboard/analytics",
    //   icon: BarChart3,
    // },
  ];

  const navSecondary = [
    {
      title: "Settings",
      url: "/admin-dashboard/settings",
      icon: Settings,
    },
    {
      title: "Help & Support",
      url: "/admin-dashboard/help",
      icon: HelpCircle,
    },
  ];

  if (loading) return null;
  if (error) return <div>Error loading</div>;

  const user = {
    name: data?.full_name || "Loading...",
    email: data?.email || "NA",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <Image
          src="/logo/agro logo-01.png"
          alt="FarmCred Logo"
          width={40}
          height={40}
        />
      </SidebarHeader>
      <SidebarContent className="text-[#158f20]">
        <NavMain items={navMain} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter className="text-[#158f20]">
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
