import { FarmCredNavbar } from "@/components/landing/Navbar";
import Footer from "@/components/marketplace/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function LendersReadMorePage() {
  return (
    <>
      <FarmCredNavbar />
      <main className="max-w-5xl mx-auto px-6 py-24 space-y-14">
        {/* Header */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-[#158f20]">We Power It</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            FarmCred is the engine behind the credit. We are the lenders — using AI trust scores,
            smart contracts, and transparent repayment tracking to make capital accessible and reliable.
          </p>
        </section>

        {/* What Makes Us Different */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#157148]">Our Lending Advantage</h2>
          <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
            <li>🧠 AI-powered trust scoring based on behavior, sales, delivery & reviews.</li>
            <li>🤝 Microloans released directly to trusted farmers or co-ops.</li>
            <li>📄 Smart contracts enforce repayment terms securely on-chain.</li>
            <li>📈 Real-time repayment tracking through user dashboards.</li>
            <li>🚫 No need for traditional collateral — data is the new guarantee.</li>
          </ul>
        </section>

        {/* Loan Use Cases */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#157148]">How Farmers Use the Credit</h2>
          <p className="text-base text-gray-700">
            Our loans are purpose-built. Each is linked to a transaction or farming goal:
          </p>
          <ul className="list-disc list-inside text-base text-gray-700 mt-2">
            <li>🌱 Input loans (seeds, fertilizer, irrigation support)</li>
            <li>🚚 Delivery & logistics prep for large orders</li>
            <li>🛠️ Equipment rental for harvest time</li>
            <li>⏳ Bridging income gaps between planting and payment</li>
          </ul>
        </section>

        {/* Tech Infrastructure */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#157148]">Technology-Backed Lending</h2>
          <p className="text-base text-gray-700">
            FarmCred isn’t a bank. It’s a technology platform using structured, real-world signals
            to make safe lending decisions at scale:
          </p>
          <ul className="list-disc list-inside text-gray-700 mt-2">
            <li>⚙️ Dynamic repayment terms based on farmer performance</li>
            <li>🛰️ Location and delivery verification via mobile data</li>
            <li>📊 Escrow-backed enforcement and automatic late fees</li>
          </ul>
        </section>

        {/* CTA */}
        <section className="pt-6 flex flex-wrap gap-4 justify-center">
          <Link href="/marketplace">
            <Button className="bg-[#158f20] text-white">Visit Marketplace</Button>
          </Link>
          <Link href="/about">
            <Button variant="outline" className="text-[#158f20] border-[#158f20]">
              Back to About
            </Button>
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
