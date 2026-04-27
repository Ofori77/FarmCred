"use client";

import Footer from "@/components/marketplace/Footer";
import MarketHeroSection from "@/components/marketplace/Hero";
import { MarketplaceNavbar } from "@/components/marketplace/Navbar";
import ProductGridPage from "@/components/marketplace/Product";

export default function Marketplace() {
  return <>
  <MarketplaceNavbar />
  <MarketHeroSection />
  <ProductGridPage />
  <Footer />
  </>;
}
