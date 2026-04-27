"use client";

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
import {
  Mail,
  HelpCircle,
  Info,
} from "lucide-react";

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
        "Content-Type": "application/json", //
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
    <div className="px-6 py-8 space-y-6 max-w-6xl">
      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-[#158f20]">
            <HelpCircle className="w-5 h-5" />
            Frequently Asked Questions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <div>
            <strong>How do I invest in a farmer?</strong>
            <p>
              Go to the Browse Farmers section and click "Invest". Follow the
              steps to complete your investment.
            </p>
          </div>
          <div>
            <strong>Where can I see my investment progress?</strong>
            <p>
              Visit the "My Investments" page to view returns and repayment
              status.
            </p>
          </div>
          <div>
            <strong>Can I edit my account information?</strong>
            <p>
              Yes, head to the "My Account" section in Settings to update your
              details.
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
          <Input id="subject" placeholder="e.g. Issue with investment" />
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            placeholder="Describe your issue or question..."
          />
          <Button className="mt-2">Send Message</Button>
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
              <a
                href="/investor/investments"
                className="text-[#158f20] hover:underline"
              >
                View My Investments
              </a>
            </li>
            <li>
              <a
                href="investor/settings/my-account"
                className="text-[#158f20] hover:underline"
              >
                Update Account Info
              </a>
            </li>
            <li>
              <a href="investor/reviews" className="text-[#158f20] hover:underline">
                Submit a Farmer Review
              </a>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Floating Chat Widget */}
      <Card className="max-w-md fixed bottom-4 right-4 shadow-lg z-50">
        <CardHeader>
          <CardTitle className="text-[#158f20]">Farmcred Chat Assistant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="max-h-60 overflow-y-auto space-y-1 text-sm">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded ${
                  msg.role === "user"
                    ? "bg-green-100 text-right"
                    : "bg-gray-100"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
            />
            <Button onClick={handleSend}>Send</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
