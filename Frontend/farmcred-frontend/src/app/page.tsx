"use client";

import FinalCTA from "@/components/landing/CallToAction";
import Footer from "@/components/landing/Footer";
import HeroSection from "@/components/landing/Hero";
import HowItWorksSection from "@/components/landing/HowItWorks";
import { FarmCredNavbar } from "@/components/landing/Navbar";
import { MarketplacePreview } from "@/components/landing/ShopPreview";
import ImpactStats from "@/components/landing/Stats";
import TestimonialSection from "@/components/landing/Testimonials";

export default function Home() {
  return (
    <>
      <FarmCredNavbar />
      <HeroSection />

      {/* Decorative Chaotic Splash SVG */}
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
          <circle cx="40" cy="120" r="5" fill="#158f20" opacity="0.6" />
          <circle cx="80" cy="130" r="3" fill="#158f20" opacity="0.5" />
          <circle cx="120" cy="110" r="6" fill="#158f20" opacity="0.7" />
          <circle cx="160" cy="125" r="4" fill="#158f20" opacity="0.4" />
          <circle cx="200" cy="100" r="5" fill="#158f20" opacity="0.6" />
          <circle cx="240" cy="140" r="3" fill="#158f20" opacity="0.5" />

          {/* Mid-Left Cluster */}
          <circle cx="300" cy="115" r="6" fill="#157148" opacity="0.6" />
          <circle cx="340" cy="130" r="4" fill="#157148" opacity="0.7" />
          <circle cx="380" cy="120" r="5" fill="#157148" opacity="0.5" />
          <circle cx="420" cy="135" r="6" fill="#157148" opacity="0.6" />
          <circle cx="460" cy="110" r="3" fill="#157148" opacity="0.4" />
          <circle cx="500" cy="125" r="5" fill="#157148" opacity="0.5" />

          {/* Center Cluster */}
          <circle cx="560" cy="140" r="6" fill="#3B7918" opacity="0.7" />
          <circle cx="600" cy="115" r="4" fill="#3B7918" opacity="0.6" />
          <circle cx="640" cy="130" r="5" fill="#3B7918" opacity="0.5" />
          <circle cx="680" cy="100" r="7" fill="#3B7918" opacity="0.4" />
          <circle cx="720" cy="125" r="3" fill="#3B7918" opacity="0.5" />
          <circle cx="760" cy="135" r="6" fill="#3B7918" opacity="0.6" />

          {/* Mid-Right Cluster */}
          <circle cx="820" cy="110" r="5" fill="#72BF01" opacity="0.6" />
          <circle cx="860" cy="140" r="4" fill="#72BF01" opacity="0.4" />
          <circle cx="900" cy="120" r="6" fill="#72BF01" opacity="0.5" />
          <circle cx="940" cy="130" r="3" fill="#72BF01" opacity="0.6" />
          <circle cx="980" cy="115" r="5" fill="#72BF01" opacity="0.5" />
          <circle cx="1020" cy="125" r="4" fill="#72BF01" opacity="0.6" />

          {/* Right Cluster */}
          <circle cx="1080" cy="135" r="6" fill="#05402E" opacity="0.7" />
          <circle cx="1120" cy="110" r="3" fill="#05402E" opacity="0.4" />
          <circle cx="1160" cy="140" r="5" fill="#05402E" opacity="0.6" />
          <circle cx="1200" cy="120" r="4" fill="#05402E" opacity="0.5" />
          <circle cx="1240" cy="130" r="6" fill="#05402E" opacity="0.6" />
          <circle cx="1280" cy="110" r="5" fill="#05402E" opacity="0.5" />
          <circle cx="1320" cy="140" r="3" fill="#05402E" opacity="0.4" />
          <circle cx="1360" cy="125" r="4" fill="#05402E" opacity="0.6" />

          {/* Far Right Cluster */}
          <circle cx="1400" cy="130" r="5" fill="#158f20" opacity="0.5" />
          <circle cx="1440" cy="120" r="6" fill="#158f20" opacity="0.4" />
          <circle cx="1480" cy="135" r="4" fill="#158f20" opacity="0.6" />
          <circle cx="1520" cy="110" r="3" fill="#158f20" opacity="0.5" />
          <circle cx="1560" cy="125" r="5" fill="#158f20" opacity="0.6" />
        </svg>
      </div>
      <HowItWorksSection />
      <ImpactStats />
      <TestimonialSection />
      <MarketplacePreview />
      <FinalCTA />
      <Footer />
    </>
  );
}
