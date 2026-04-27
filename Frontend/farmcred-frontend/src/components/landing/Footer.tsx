import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-[#05402E] text-white border-t px-6 py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <div className="flex items-center space-x-2">
              <Image
                src="/logo/farmcred-03.png"
                alt="FarmCred"
                width={240}
                height={100}
              />
            </div>
            <p className="mt-4 text-sm text-white">
              Empowering smallholder farmers through transparent, decentralized investment and loan solutions.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-[#72BF01]">Platform</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-200">
              <li><Link href="/features">Features</Link></li>
              <li><Link href="/farmers">Browse Farmers</Link></li>
              <li><Link href="/loans">Loan Programs</Link></li>
              <li><Link href="/invest">Invest</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-[#72BF01]">Company</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-200">
              <li><Link href="/about">About Us</Link></li>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/support">Support</Link></li>
              <li><Link href="/contact">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-[#72BF01]">Legal</h3>
            <ul className="mt-4 space-y-2 text-sm text-gray-200">
              <li><Link href="/privacy">Privacy Policy</Link></li>
              <li><Link href="/terms">Terms of Service</Link></li>
              <li><Link href="/security">Security</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t pt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-200">
            © 2025 FarmCred. All rights reserved.
          </p>
          <div className="flex gap-4">
            <Link href="/privacy">
              <Button variant="ghost" size="sm" className="text-gray-200 hover:text-[#3B7918]">
                Privacy
              </Button>
            </Link>
            <Link href="/terms">
              <Button variant="ghost" size="sm" className="text-gray-200 hover:text-[#3B7918]">
                Terms
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
