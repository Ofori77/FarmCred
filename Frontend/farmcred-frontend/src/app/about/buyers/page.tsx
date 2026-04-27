import { FarmCredNavbar } from "@/components/landing/Navbar";
import Footer from "@/components/marketplace/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function BuyersAboutPage() {
  return (
    <>
      <FarmCredNavbar />
      <main className="max-w-5xl mx-auto px-6 py-24 space-y-14">
        {/* Intro */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-[#158f20]">For Buyers</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Get fresh, traceable farm produce directly from Ghanaian farmers —
            without the middlemen or hidden costs.
          </p>
        </section>

        {/* Why Buy Here */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#157148]">Why Use FarmCred?</h2>
          <ul className="list-disc list-inside space-y-2 text-gray-700 text-base">
            <li>🚚 Order from verified smallholder farmers with clear pricing.</li>
            <li>💬 Message farmers before buying and ask about availability or quality.</li>
            <li>🔒 Pay securely via escrow — farmers are paid only after you receive your order.</li>
            <li>📦 Choose pickup or delivery (where available).</li>
            <li>🌱 Support sustainable, local agriculture directly.</li>
          </ul>
        </section>

        {/* How It Works */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#157148]">How to Buy</h2>
          <ol className="list-decimal list-inside space-y-2 text-gray-700 text-base">
            <li>Browse produce using filters like category or farmer location.</li>
            <li>Add products to your cart and select your payment method.</li>
            <li>Choose delivery or pickup and confirm the order.</li>
            <li>Track your delivery and release payment once it's delivered.</li>
            <li>Leave a review to support the farmer and build trust.</li>
          </ol>
        </section>

        {/* CTA */}
        <section className="pt-6 flex flex-wrap gap-4 justify-center">
          <Link href="/marketplace">
            <Button className="bg-[#158f20] text-white">Start Shopping</Button>
          </Link>
          <Link href="/about/marketplace">
            <Button variant="outline" className="text-[#158f20] border-[#158f20]">
              How the Marketplace Works
            </Button>
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
