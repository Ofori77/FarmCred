"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";
import { Input } from "@/components/ui/input";
import { ShoppingCart } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { useMarketplace } from "@/lib/redux/hooks/useMarketplace";
import { useCart } from "@/lib/redux/hooks/useCart";
import { CartSheet } from "./CartSheet";

export function MarketplaceNavbar() {
  const navLinks = [
    { href: "/marketplace", label: "Marketplace" },
    { href: "/marketplace/orders", label: "My Orders" },
    { href: "/about/marketplace", label: "About" },
  ];
  const { searchQuery, updateSearchQuery } = useMarketplace();
  const { totalItems } = useCart();

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between gap-6 w-full">
        {/* Left: Logo */}
        <Link href="/" className="flex items-center space-x-2">
          <Image
            src="/logo/farmcred-01.png"
            alt="FarmCred Logo"
            width={160}
            height={60}
            className="h-16 w-auto object-contain"
          />
        </Link>

        {/* Center: Nav Menu */}
        <div className="flex-1 flex justify-center">
          <NavigationMenu className="text-[#158f20]">
            <NavigationMenuList className="flex items-center gap-4 justify-center">
              {navLinks.map(({ href, label }) => (
                <NavigationMenuItem key={href}>
                  <NavigationMenuLink
                    asChild
                    className={navigationMenuTriggerStyle()}
                  >
                    <Link href={href}>{label}</Link>
                  </NavigationMenuLink>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        {/* Right: Search + Cart */}
        <div className="flex items-center gap-4">
          <Input
            type="search"
            placeholder="Search for produce..."
            value={searchQuery}
            onChange={(e) => updateSearchQuery(e.target.value)}
            className="bg-white border border-gray-300 focus:ring-[#158f20] focus:border-[#72bf01] rounded-md px-4 py-2 w-[200px] md:w-[250px]"
          />
          <CartSheet>
            <button className="group relative">
              <div className="p-1 rounded-md border border-gray-300 bg-white transition-colors group-hover:border-[#158f20]">
                <ShoppingCart className="w-6 h-6 text-[#158f20] group-hover:text-[#05402E]" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </div>
            </button>
          </CartSheet>
        </div>
      </div>
    </div>
  );
}
