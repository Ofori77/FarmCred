import { FarmCredNavbar } from "@/components/landing/Navbar";
import Footer from "@/components/marketplace/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function InvestorsReadMorePage() {
  return (
    <>
      <FarmCredNavbar />
      <main className="max-w-5xl mx-auto px-6 py-24 space-y-14">
        {/* Header */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-[#158f20]">Investor Opportunities</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Learn how FarmCred turns your capital into local impact — while giving you secure,
            data-backed returns through farm-based lending and order financing.
          </p>
        </section>

        {/* How Capital Is Used */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#157148]">Where Your Capital Goes</h2>
          <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
            <li>📦 Pre-financing bulk produce orders made by verified buyers.</li>
            <li>💧 Micro-loans for trusted farmers to meet seasonal needs.</li>
            <li>🚜 Equipment or input financing for farm cooperatives.</li>
            <li>📈 Scaling high-performing producers in rural districts.</li>
          </ul>
        </section>

        {/* How Returns Work */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#157148]">How Returns Are Generated</h2>
          <p className="text-base text-gray-700">
            FarmCred investment cycles typically range from 3–6 months depending on the crop and
            delivery schedule. Returns are derived from markup on fulfilled produce orders or
            interest from seasonal loans.
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 mt-2">
            <li>Returns are shared at the end of the investment cycle.</li>
            <li>FarmCred takes a small platform fee only on successful outcomes.</li>
            <li>Delays or defaults are monitored — you get regular updates.</li>
          </ul>
        </section>

        {/* Risk & Transparency */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#157148]">Safeguards & Transparency</h2>
          <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
            <li>🔐 Escrow protection — funds are held until delivery is verified.</li>
            <li>📊 Farmer and order history is tracked through the platform.</li>
            <li>✅ Investment rounds are verified by FarmCred field teams before listing.</li>
            <li>📬 You receive monthly updates with visuals and data summaries.</li>
          </ul>
        </section>

        {/* Impact Reporting */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#157148]">Your Impact</h2>
          <p className="text-base text-gray-700">
            Every investment supports real farmers, real communities, and real food supply chains.
            We publish quarterly reports on:
          </p>
          <ul className="list-disc list-inside text-base text-gray-700 mt-2">
            <li>🌽 Yield data and market distribution</li>
            <li>👨🏾‍🌾 Number of farmers supported</li>
            <li>📉 Reduction in post-harvest losses</li>
            <li>🏥 Indirect community benefits (nutrition, income access)</li>
          </ul>
        </section>

        {/* CTA */}
        <section className="pt-6 flex flex-wrap gap-4 justify-center">
          <Link href="/invest">
            <Button className="bg-[#158f20] text-white">Start Investing</Button>
          </Link>
          <Link href="/about/investors">
            <Button variant="outline" className="text-[#158f20] border-[#158f20]">
              Back to Overview
            </Button>
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
