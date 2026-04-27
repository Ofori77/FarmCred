import { FarmCredNavbar } from "@/components/landing/Navbar";
import Footer from "@/components/marketplace/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function AboutPage() {
  return (
    <>
      <FarmCredNavbar />
      <main className="max-w-5xl mx-auto px-6 py-24 space-y-16">
        {/* Heading */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-[#158f20]">About FarmCred</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            FarmCred is a digital platform designed to transform how smallholder farmers
            access markets, credit, and support — while giving buyers, investors, and
            lenders a direct, transparent way to engage with agriculture in Ghana.
          </p>
        </section>

        {/* What It Does */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#157148]">What FarmCred Offers</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 text-base">
            <li>
              🛒 A secure <strong>agro-marketplace</strong> where buyers can purchase
              produce directly from verified farmers.
            </li>
            <li>
              📈 A platform for <strong>impact investors</strong> to fund real farm
              operations and track returns.
            </li>
            <li>
              💸 A credit system that allows <strong>farmers to access microloans</strong>{" "}
              based on order history and repayment behavior.
            </li>
            <li>
              📬 Direct messaging and escrow to ensure <strong>safe, trust-based trade</strong>.
            </li>
            <li>
              🧩 A transparent ecosystem connecting <strong>buyers, farmers, investors, and
              lenders</strong> with verified data and review systems.
            </li>
          </ul>
        </section>

        {/* Ecosystem CTA */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#157148]">One Ecosystem. Multiple Paths.</h2>
          <p className="text-base text-gray-700">
            Whether you're a buyer looking for fresh produce, an investor supporting
            sustainable agriculture, or a lender assessing risk — FarmCred is built to
            give you visibility, trust, and direct access to those who grow our food.
          </p>

          <div className="pt-4 flex flex-wrap gap-4">
            <Link href="/about/buyers">
              <Button variant="outline" className="text-[#158f20] border-[#158f20]">
                For Buyers
              </Button>
            </Link>
            <Link href="/about/investors">
              <Button variant="outline" className="text-[#158f20] border-[#158f20]">
                For Investors
              </Button>
            </Link>
            <Link href="/about/marketplace">
              <Button variant="outline" className="text-[#158f20] border-[#158f20]">
                How the Marketplace Works
              </Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
