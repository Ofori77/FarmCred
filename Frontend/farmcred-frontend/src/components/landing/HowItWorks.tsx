"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "../ui/button";
import { link } from "fs";
import Link from "next/link";
import { Coins, Shield, Tractor } from "lucide-react";

const slides = [
  {
    id: "farmers",
    title: "For Farmers",
    icon: Tractor,
    link: "about/readmore/farmers",
    description:
      "Upload produce, access affordable loans, and connect directly with verified buyers.",
  },
  {
    id: "investors",
    title: "For Investors",
    icon: Coins,
    link: "about/readmore/investors",
    description:
      "Support trusted farmers, track loan performance, and earn meaningful, sustainable returns.",
  },
  {
    id: "platform",
    title: "We Power It",
    icon: Shield,
    link: "about/readmore/lenders",
    description:
      "Powered by AI trust scoring, smart contracts, and transparent repayment tracking.",
  },
];

export default function HowItWorksSection() {
  return (
    <section className="w-full py-60 px-6 flex flex-col items-center justify-center relative">
      <div className="w-full max-w-7xl flex flex-col lg:flex-row gap-10 z-10">
        {/* Left intro card */}
        <Card className="w-full lg:max-w-sm bg-gradient-to-br from-[#128f20] to-[#72BF01] text-[white] shadow-xl rounded-md">
          <CardHeader>
            <CardTitle className="text-4xl font-bold">How it Works</CardTitle>
            <div className="w-24 h-1.5 bg-white mt-2" />
          </CardHeader>
          <CardContent className="mt-4 space-y-4 text-base font-medium text-white">
            <p>We connect farmers with tools, funding, and buyers.</p>
            <p>Investors fund farmers and earn impact-driven returns.</p>
            <p>Smart tech ensures trust, transparency, and security.</p>
          </CardContent>
        </Card>

        {/* Right benefit cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 flex-1">
          {slides.map((slide, idx) => {
            const SlideIcon = slide.icon;
            return (
              <Card
                key={idx}
                className="border-0 flex flex-col justify-between h-full group transition-transform duration-300"
              >
                <CardHeader className="flex items-center justify-center pt-8">
                  <SlideIcon className="w-20 h-20 text-[#158f20] transform transition-transform duration-400 group-hover:rotate-y-360" />
                </CardHeader>

                <CardContent className="flex flex-col justify-between flex-grow text-center space-y-4 px-6 pb-6">
                  <div>
                    <h3 className="text-xl font-semibold text-[#05402E]">
                      {slide.title}
                    </h3>
                    <p className="text-base text-gray-700">
                      {slide.description}
                    </p>
                  </div>

                  <div className="mt-auto">
                    <Button
                      asChild
                      variant="default"
                      className="text-white bg-gradient-to-br from-[#128f20] to-[#72BF01] transform transition-transform duration-300 hover:scale-105 shadow-lg"
                    >
                      <Link href={slide.link}>Read more</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
      <div className="absolute bottom-0 w-full z-20 pointer-events-none">
        <svg
          width="100%"
          height="150"
          viewBox="0 0 1400 150"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Far Left Cluster */}
          <circle cx="-80" cy="130" r="5" fill="#158f20" opacity="0.6" />
          <circle cx="-40" cy="120" r="4" fill="#158f20" opacity="0.5" />
          <circle cx="0" cy="140" r="6" fill="#158f20" opacity="0.4" />
          <circle cx="20" cy="110" r="3" fill="#158f20" opacity="0.5" />
          
          {/* Left Cluster */}
          <circle cx="50" cy="110" r="6" fill="#158f20" opacity="0.6" />
          <circle cx="90" cy="125" r="4" fill="#158f20" opacity="0.5" />
          <circle cx="130" cy="105" r="5" fill="#158f20" opacity="0.7" />
          <circle cx="170" cy="120" r="3" fill="#158f20" opacity="0.4" />
          <circle cx="210" cy="95" r="4" fill="#158f20" opacity="0.6" />
          <circle cx="250" cy="135" r="3" fill="#158f20" opacity="0.5" />

          {/* Mid-Left Cluster */}
          <circle cx="310" cy="110" r="5" fill="#157148" opacity="0.6" />
          <circle cx="350" cy="125" r="3" fill="#157148" opacity="0.7" />
          <circle cx="390" cy="115" r="6" fill="#157148" opacity="0.5" />
          <circle cx="430" cy="130" r="4" fill="#157148" opacity="0.6" />
          <circle cx="470" cy="105" r="4" fill="#157148" opacity="0.4" />
          <circle cx="510" cy="120" r="5" fill="#157148" opacity="0.5" />

          {/* Center Cluster */}
          <circle cx="570" cy="135" r="6" fill="#3B7918" opacity="0.7" />
          <circle cx="610" cy="110" r="4" fill="#3B7918" opacity="0.6" />
          <circle cx="650" cy="125" r="5" fill="#3B7918" opacity="0.5" />
          <circle cx="690" cy="95" r="6" fill="#3B7918" opacity="0.4" />
          <circle cx="730" cy="120" r="3" fill="#3B7918" opacity="0.5" />
          <circle cx="770" cy="130" r="5" fill="#3B7918" opacity="0.6" />

          {/* Mid-Right Cluster */}
          <circle cx="830" cy="105" r="5" fill="#72BF01" opacity="0.6" />
          <circle cx="870" cy="135" r="4" fill="#72BF01" opacity="0.4" />
          <circle cx="910" cy="115" r="6" fill="#72BF01" opacity="0.5" />
          <circle cx="950" cy="125" r="3" fill="#72BF01" opacity="0.6" />
          <circle cx="990" cy="110" r="5" fill="#72BF01" opacity="0.5" />
          <circle cx="1030" cy="120" r="4" fill="#72BF01" opacity="0.6" />

          {/* Right Cluster */}
          <circle cx="1090" cy="130" r="6" fill="#05402E" opacity="0.7" />
          <circle cx="1130" cy="105" r="3" fill="#05402E" opacity="0.4" />
          <circle cx="1170" cy="135" r="5" fill="#05402E" opacity="0.6" />
          <circle cx="1210" cy="115" r="4" fill="#05402E" opacity="0.5" />
          <circle cx="1250" cy="125" r="6" fill="#05402E" opacity="0.6" />
          <circle cx="1290" cy="105" r="5" fill="#05402E" opacity="0.5" />
          <circle cx="1330" cy="135" r="3" fill="#05402E" opacity="0.4" />
          <circle cx="1370" cy="120" r="4" fill="#05402E" opacity="0.6" />

          {/* Far Right Cluster */}
          <circle cx="1400" cy="130" r="5" fill="#158f20" opacity="0.5" />
          <circle cx="1440" cy="120" r="6" fill="#158f20" opacity="0.4" />
          <circle cx="1480" cy="135" r="4" fill="#158f20" opacity="0.6" />
          <circle cx="1520" cy="110" r="3" fill="#158f20" opacity="0.5" />
          <circle cx="1560" cy="125" r="5" fill="#158f20" opacity="0.6" />
        </svg>
      </div>
    </section>
  );
}
