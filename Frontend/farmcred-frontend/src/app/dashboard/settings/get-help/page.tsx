"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Mail, HelpCircle, Info } from "lucide-react";

export default function GetHelpPage() {
  const [messages, setMessages] = useState<{ role: string; text: string }[]>([]);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: "user", text: input };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    try {
      const response = await fetch("/api/route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: input }),
      });

      const data = await response.json();
      setMessages((prev) => [...prev, { role: "bot", text: data.reply }]);
    } catch (error) {
      console.error("Error fetching AI reply:", error);
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: "Oops, something went wrong." },
      ]);
    }
  };

  return (
    <div className="px-6 py-8 space-y-6">
      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#158f20]">
            <HelpCircle className="w-5 h-5" />
            Farmer Support FAQs
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <strong>How do I update my farm details?</strong>
            <p>
              Go to "My Account" under Settings and click the edit button beside your farm info.
            </p>
          </div>
          <div>
            <strong>How do I receive investments?</strong>
            <p>
              Once your profile is verified and published, investors can view and fund your profile.
            </p>
          </div>
          <div>
            <strong>How do I get verified?</strong>
            <p>
              Upload all required farm documents and identification. Our team will review and approve them.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Contact Support */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#158f20]">
            <Mail className="w-5 h-5" />
            Contact Support
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="email">Your Email</Label>
          <Input id="email" placeholder="your@email.com" />
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" placeholder="e.g. Issue with profile update" />
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Describe your issue or question..."
          />
          <Button className="mt-2 bg-[#158f20] hover:bg-[#136b1b]">Send Message</Button>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#158f20]">
            <Info className="w-5 h-5" />
            Quick Access
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <ul className="list-disc list-inside">
            <li>
              <Link
                href="/farmer/settings/my-account"
                className="text-[#158f20] hover:underline"
              >
                Update My Profile
              </Link>
            </li>
            <li>
              <Link
                href="/farmer/investors"
                className="text-[#158f20] hover:underline"
              >
                View Interested Investors
              </Link>
            </li>
            <li>
              <Link
                href="/farmer/reviews"
                className="text-[#158f20] hover:underline"
              >
                Read My Reviews
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
