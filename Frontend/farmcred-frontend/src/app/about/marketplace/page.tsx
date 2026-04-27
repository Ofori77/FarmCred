import Footer from "@/components/marketplace/Footer";
import { MarketplaceNavbar } from "@/components/marketplace/Navbar";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function MarketplaceAboutPage() {
  return (
    <>
      <MarketplaceNavbar />
      <main className="max-w-5xl mx-auto px-6 py-24 space-y-14">
        {/* Header */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-[#158f20]">How the Marketplace Works</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            The FarmCred marketplace is a simple, secure, and transparent way for buyers to source farm produce directly from smallholder farmers across Ghana.
          </p>
        </section>

        {/* Benefits */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#157148]">What Makes It Different?</h2>
          <ul className="list-disc list-inside text-gray-700 space-y-2 text-base">
            <li>🧺 All produce listed by verified farmers with current stock levels.</li>
            <li>💬 Built-in messaging to speak with farmers before purchase.</li>
            <li>🔐 Escrow payment — farmers are paid only after successful delivery.</li>
            <li>🛒 Add to cart, sort, and filter by region, category, and farmer name.</li>
            <li>📦 Track orders and leave reviews to help build a reputation system.</li>
          </ul>
        </section>

        {/* Buying Steps */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#157148]">The Buying Process</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 text-base">
            <li>Browse produce by category, region, or search keyword.</li>
            <li>Add products to your cart and select delivery or pickup.</li>
            <li>Choose your payment method (Mobile Money, Bank Transfer, Cash on Delivery).</li>
            <li>Receive your order and confirm it — then payment is released to the farmer.</li>
            <li>Leave a review and save the farmer to your trusted list.</li>
          </ol>
        </section>

        {/* CTA */}
        <section className="pt-6 flex flex-wrap gap-4 justify-center">
          <Link href="/marketplace">
            <Button className="bg-[#158f20] text-white">Go to Marketplace</Button>
          </Link>
          <Link href="/about/buyers">
            <Button variant="outline" className="text-[#158f20] border-[#158f20]">
              Learn More for Buyers
            </Button>
          </Link>
          <Link href="/about/readmore/farmers">
            <Button variant="outline" className="text-[#158f20] border-[#158f20]">
              Read More About Farmers
            </Button>
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
