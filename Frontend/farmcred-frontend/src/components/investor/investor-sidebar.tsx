"use client";

import * as React from "react";
import Image from "next/image";
import {
  Banknote,
  BookOpenText,
  HelpCircle,
  HomeIcon,
  Settings,
  UserRoundSearch,
} from "lucide-react";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";
import {  usePathname } from "next/navigation";
import { useInvestorProfile } from "@/hooks/useInvestorData";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();

  const { data, loading, error } = useInvestorProfile();

  const navMain = [
    {
      title: "Home",
      url: "/investor",
      icon: HomeIcon,
    },
    {
      title: "Browse Farmer",
      url: "/investor/browse-farmers",
      icon: UserRoundSearch,
    },
    {
      title: "Investments",
      url: "/investor/investments",
      icon: Banknote,
    },
    {
      title: "Reviews",
      url: "/investor/reviews",
      icon: BookOpenText,
    },
  ];

  const navSecondary = [
    {
      title: "Settings",
      url: "/investor/settings",
      icon: Settings,
    },
    {
      title: "Get Help",
      url: "/investor/settings/get-help",
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
