import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#05402E] text-white px-6 py-10 lg:px-12">
      <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Logo and description */}
        <div>
          <div className="mb-4">
            <Image
              src="/logo/farmcred-03.png"
              alt="FarmCred"
              width={200}
              height={80}
              className="object-contain"
            />
          </div>
          <p className="text-sm text-gray-200">
            Connecting buyers directly with trusted smallholder farmers across
            Ghana. Transparent pricing, quality produce.
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h3 className="font-semibold text-[#72BF01] mb-4">Quick Links</h3>
          <ul className="space-y-2 text-sm text-gray-200">
            <li>
              <Link href="/marketplace">Marketplace</Link>
            </li>
            <li>
              <Link href="/farmers">Farmers</Link>
            </li>
            <li>
              <Link href="/invest">Invest</Link>
            </li>
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h3 className="font-semibold text-[#72BF01] mb-4">Contact Us</h3>
          <ul className="space-y-2 text-sm text-gray-200">
            <li>
              Email:{" "}
              <a href="mailto:support@farmcred.com" className="underline">
                support@farmcred.com
              </a>
            </li>
            <li>Phone: +233 20 241 7423</li>
            <li>Address: Brunei Complex, KNUST, Kumasi, Ghana</li>
          </ul>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="mt-10 border-t pt-4 flex flex-col sm:flex-row justify-between items-center text-sm text-gray-300 gap-4">
        <p>© 2025 FarmCred. All rights reserved.</p>
        <div className="flex gap-3">
          <Link href="/privacy">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-[#72BF01]"
            >
              Privacy Policy
            </Button>
          </Link>
          <Link href="/terms">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-300 hover:text-[#72BF01]"
            >
              Terms of Use
            </Button>
          </Link>
        </div>
      </div>
    </footer>
  );
}
