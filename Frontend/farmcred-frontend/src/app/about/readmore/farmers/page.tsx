import { FarmCredNavbar } from "@/components/landing/Navbar";
import Footer from "@/components/marketplace/Footer";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FarmersReadMorePage() {
  return (
    <>
      <FarmCredNavbar />
      <main className="max-w-5xl mx-auto px-6 py-24 space-y-14">
        {/* Header */}
        <section className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-[#158f20]">For Farmers</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            FarmCred helps smallholder farmers sell directly to trusted buyers, receive secure payments, and unlock financial opportunities based on reputation.
          </p>
        </section>

        {/* Benefits Overview */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold text-[#157148]">What Farmers Can Do</h2>
          <ul className="list-disc list-inside text-base text-gray-700 space-y-2">
            <li>🧺 List your produce for sale on the FarmCred marketplace.</li>
            <li>💬 Communicate directly with buyers before they place an order.</li>
            <li>🔒 Get paid securely through our escrow system once delivery is confirmed.</li>
            <li>📈 Build a trusted reputation through buyer reviews and timely delivery.</li>
            <li>💸 Access small loans based on your transaction history and ratings.</li>
          </ul>
        </section>

        {/* Step-by-Step Process */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#157148]">How It Works for Farmers</h2>
          <ol className="list-decimal list-inside space-y-2 text-base text-gray-700">
            <li>
              <strong>Create a Farmer Profile:</strong> You’ll be onboarded by a local
              FarmCred representative or partner cooperative.
            </li>
            <li>
              <strong>List Produce:</strong> Share available stock, quantity, location, and
              delivery options. Add photos if available.
            </li>
            <li>
              <strong>Chat With Buyers:</strong> Answer questions from interested buyers through
              in-app messaging.
            </li>
            <li>
              <strong>Deliver the Produce:</strong> Once an order is confirmed, arrange pickup
              or delivery as agreed.
            </li>
            <li>
              <strong>Receive Payment:</strong> FarmCred holds payment securely until the
              buyer confirms receipt. Then you’re paid instantly.
            </li>
            <li>
              <strong>Build Reputation:</strong> Good reviews improve visibility and open up
              investment or loan options.
            </li>
          </ol>
        </section>

        {/* Credit Access */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold text-[#157148]">Get Access to Micro-Credit</h2>
          <p className="text-base text-gray-700">
            FarmCred isn’t just for selling — farmers with strong delivery records and good
            buyer feedback may qualify for small loans to scale production, purchase inputs,
            or meet urgent needs.
          </p>
          <p className="text-sm text-gray-600">
            Loans are approved based on your transaction history and repayment behavior. No
            traditional collateral is needed.
          </p>
        </section>

        {/* CTA */}
        <section className="pt-6 flex flex-wrap gap-4 justify-center">
          <Link href="/marketplace">
            <Button className="bg-[#158f20] text-white">View Marketplace</Button>
          </Link>
          <Link href="/about/investors">
            <Button variant="outline" className="text-[#158f20] border-[#158f20]">
              Learn How Investors Support Farmers
            </Button>
          </Link>
        </section>
      </main>
      <Footer />
    </>
  );
}
