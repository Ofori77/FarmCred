import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function FinalCTA() {
  return (
    <section className="bg-[#eff3e4] text-[#05402e] px-6 py-32 lg:px-8">
      <div className="mx-auto max-w-7xl text-center">
        <h2 className="text-3xl font-bold">
          Empower Farmers. Invest in Fresh Produce Today.
        </h2>
        <p className="mt-4 text-lg text-gray-800 mx-auto max-w-2xl">
          Join a growing community supporting local farmers while earning returns. Buy, sell, or invest in quality produce—all in one platform.
        </p>

        <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/marketplace">
            <Button
              size="lg"
              className="bg-gradient-to-br from-[#128f20] to-[#72BF01] text-white hover:opacity-90 shadow-lg"
            >
              Explore Marketplace
            </Button>
          </Link>
          <Link href="/signup">
            <Button
              size="lg"
              variant="outline"
              className="text-[#158f20] hover:bg-white hover:opacity-90 shadow-lg hover:text-[#05402E]"
            >
              Join as Investor
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
