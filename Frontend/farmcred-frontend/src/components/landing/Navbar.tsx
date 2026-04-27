"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { Button } from "../ui/button";

export function FarmCredNavbar() {
  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/10 backdrop-blur-md border-b border-white/20">
      <div className="max-w-7xl mx-auto px-6 py-3 flex justify-between items-center">
        {/* Logo / Home */}
        <div className="flex-shrink-0">
          <Link href="/" className="flex items-center space-x-2">
            <Image
              src="/logo/farmcred-01.png"
              alt="FarmCred Logo"
              width={160}
              height={60}
            className="h-16 w-auto object-contain"
            />
          </Link>
        </div>

        <div className="flex-1 flex justify-center">
          <NavigationMenu className="w-full justify-center text-[#158f20]">
            <NavigationMenuList className="flex items-center gap-4 w-full justify-center">
              {/* Farmers */}
              <NavigationMenuItem>
                <NavigationMenuTrigger aria-haspopup="menu">
                  Farmers
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[300px] gap-3 p-4">
                    <ListItem
                      href="/signup?type=farmer"
                      title="Join as a Farmer"
                    >
                      Access credit, list your produce, and grow sustainably.
                    </ListItem>
                    <ListItem href="/marketplace" title="Sell Your Produce">
                      Connect directly with buyers across the country.
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Buyers */}
              <NavigationMenuItem>
                <NavigationMenuTrigger aria-haspopup="menu">
                  Buyers
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[300px] gap-3 p-4">
                    <ListItem href="/marketplace" title="Browse Produce">
                      Fresh, verified farm products sourced directly from the
                      field.
                    </ListItem>
                    <ListItem href="/about/buyers" title="How It Works">
                      Learn how FarmCred ensures quality and reliability.
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Investors */}
              <NavigationMenuItem>
                <NavigationMenuTrigger aria-haspopup="menu">
                  Investors
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid w-[300px] gap-3 p-4">
                    <ListItem
                      href="/signup?type=investor"
                      title="Start Investing"
                    >
                      Support farmers and earn returns with transparency.
                    </ListItem>
                    <ListItem
                      href="/about/investors"
                      title="Investment Opportunities"
                    >
                      View available farming projects and growth reports.
                    </ListItem>
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* General Links */}
              <NavigationMenuItem>
                <NavigationMenuLink
                  asChild
                  className={navigationMenuTriggerStyle()}
                >
                  <Link href="/about">About</Link>
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        </div>

        <div className="flex-shrink-0">
          <Link href="/login">
            <Button variant="default" className="bg-gradient-to-br from-[#128f20] to-[#72BF01] text-white hover:opacity-90 shadow-lg">Login</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild>
        <Link
          href={href}
          className="block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-[#158f20]/10"
        >
          <div className="text-sm font-medium leading-none text-[#158f20]">
            {title}
          </div>
          <p className="line-clamp-2 text-sm text-[#05402E] ">{children}</p>
        </Link>
      </NavigationMenuLink>
    </li>
  );
}
