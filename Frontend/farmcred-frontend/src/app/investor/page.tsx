"use client";
import { BodyCards } from "@/components/investor/investor-body";
import { SectionCards } from "@/components/investor/investor-overview";

export default function Investor() {
  return (
    <div className="min-h-screen py-6 px-6 lg:px-12 space-y-8">
        <SectionCards />
        <BodyCards />
      </div>
  );
}
