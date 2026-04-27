"use client";

import * as React from "react";
import Image from "next/image";
import {
  Banknote,
  BanknoteArrowUp,
  BookOpenCheck,
  BookOpenText,
  HandCoins,
  HelpCircle,
  HomeIcon,
  MessageCircle,
  Settings,
  Wheat,
  ShoppingCart,
  Package,
  BarChart3,
} from "lucide-react";
import { NavMain } from "./famnav-main";
import { NavSecondary } from "./famnav-secondary";
import { NavUser } from "./famnav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { usePathname } from "next/navigation";
import { useFarmerProfile } from "@/hooks/useFarmerData";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  const { data, loading, error } = useFarmerProfile();

  const navMain = [
    {
      title: "Home",
      url: "/dashboard",
      icon: HomeIcon,
    },
    {
      title: "Marketplace",
      url: "/dashboard/marketplace",
      icon: ShoppingCart,
    },
    {
      title: "Orders",
      url: "/dashboard/orders",
      icon: Package,
    },
    {
      title: "Analytics",
      url: "/dashboard/analytics",
      icon: BarChart3,
    },
    {
      title: "Transactions",
      url: "/dashboard/transactions",
      icon: Banknote,
    },
    // {
    //   title: "Products",
    //   url: "/dashboard/products",
    //   icon: Wheat,
    // },
    {
      title: "Trust Breakdown",
      url: "/dashboard/trust-breakdown",
      icon: BookOpenCheck,
    },
    {
      title: "Transfers",
      url: "/dashboard/transfers",
      icon: BanknoteArrowUp,
    },
    {
      title: "Loans",
      url: "/dashboard/loans",
      icon: HandCoins,
    },
    {
      title: "Reviews",
      url: "/dashboard/reviews",
      icon: BookOpenText,
    },
    {
      title: "Messages",
      url: "/dashboard/messages",
      icon: MessageCircle,
    },
    // {
    //   title: "Interactions",
    //   url: "/dashboard/interactions",
    //   icon: MessageCircle,
    // },
  ];

  const navSecondary = [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "/dashboard/settings/get-help",
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
