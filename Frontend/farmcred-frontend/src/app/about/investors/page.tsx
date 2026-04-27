import { FarmCredNavbar } from "@/components/landing/Navbar";
import Footer from "@/components/marketplace/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function InvestorsAboutPage() {
  return (
    <>
      <FarmCredNavbar />
      <main className="max-w-5xl mx-auto px-6 py-24 space-y-14">
        {/* Hero */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-[#158f20]">For Investors</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Support Ghana’s agricultural growth while earning returns from real farm-based
            activity. FarmCred connects your capital directly to verified farmer operations.
          </p>
        </section>

        {/* Why Invest */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#157148]">Why Invest in FarmCred?</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 text-base">
            <li>📊 Back real farm orders with escrow and transaction tracking.</li>
            <li>🌍 Drive local development and food system sustainability.</li>
            <li>🔎 Monitor project updates, outcomes, and repayment behavior.</li>
            <li>🔐 Investments are traceable and visible via your FarmCred dashboard.</li>
            <li>🤝 Engage with a vetted network of trustworthy farmers.</li>
          </ul>
        </section>

        {/* Investment Opportunities */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#157148]">Investment Opportunities</h2>
          <p className="text-gray-700 text-base">
            FarmCred offers curated opportunities to support high-potential farm projects across different regions.
            These projects are backed by demand from the marketplace and tracked through growth stages.
          </p>
          <ul className="list-disc list-inside space-y-2 text-gray-700 text-base">
            <li>🌽 **Maize Cluster - Bono East:** High-volume seasonal project with rapid turnover.</li>
            <li>🍍 **Pineapple Expansion - Central Region:** Co-invest with agribusinesses to scale export-ready production.</li>
            <li>🥬 **Organic Vegetable Pilot - Volta Region:** Track growth reports and community nutrition metrics.</li>
            <li>📈 View yield forecasts, projected returns, and environmental impact reports for every opportunity.</li>
          </ul>
          <p className="text-sm text-gray-600">
            New investment rounds open periodically. You can follow specific farms, get alerts, or pledge early.
          </p>
        </section>

        {/* How It Works */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#157148]">How Investment Works</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 text-base">
            <li>Choose a farmer campaign or pooled investment opportunity.</li>
            <li>Fund using mobile money or bank transfer via our investor portal.</li>
            <li>Track progress on produce growth, delivery, and sales.</li>
            <li>Receive returns based on produce sales or loan repayment terms.</li>
            <li>Review impact reports and continue building your portfolio.</li>
          </ol>
        </section>

        {/* CTA */}
        <section className="pt-6 flex flex-wrap gap-4 justify-center">
          <Link href="/invest">
            <Button className="bg-[#158f20] text-white">Browse Investment Options</Button>
          </Link>
          <Link href="/about/readmore/investors">
            <Button variant="outline" className="text-[#158f20] border-[#158f20]">
              Read More About Impact
            </Button>
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
