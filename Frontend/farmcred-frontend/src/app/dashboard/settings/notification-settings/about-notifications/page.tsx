"use client";

import { Bell, Mail, Smartphone, Star, ShieldCheck } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function AboutNotifications() {
  return (
    <div className="space-y-6 px-6 py-8 max-w-6xl">
      {/* Intro */}
      <Card>
        <CardHeader className="flex flex-row items-center gap-3">
          <Bell className="text-[#158f20]" />
          <CardTitle className="text-[#158f20]">Notification System Overview</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Our notification system ensures that you’re always informed about important updates to your account,
          investment activity, trust level progress, and system alerts. You can customize what you receive and how you receive it.
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader className="flex items-center gap-3">
          <Star className="text-yellow-500" />
          <CardTitle>Notification Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><strong className="text-[#158f20]">Trust Level Alerts:</strong> Get notified when your trust level increases or changes due to activity or feedback.</p>
          <p><strong className="text-[#158f20]">Account Changes:</strong> Receive alerts for login attempts, password changes, and critical account actions.</p>
          <p><strong className="text-[#158f20]">Investment Activity:</strong> Stay updated when your investments are funded, repaid, or updated.</p>
        </CardContent>
      </Card>

      {/* Delivery Methods */}
      <Card>
        <CardHeader className="flex items-center gap-3">
          <Smartphone className="text-blue-600" />
          <CardTitle>Delivery Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p><Mail className="inline w-4 h-4 mr-1 text-[#158f20]" /> <strong>Email:</strong> Full message notifications to your registered email address.</p>
          <p><Smartphone className="inline w-4 h-4 mr-1 text-[#158f20]" /> <strong>SMS:</strong> Brief alerts directly to your mobile number.</p>
          <p><Bell className="inline w-4 h-4 mr-1 text-[#158f20]" /> <strong>In-App:</strong> Instant notifications inside your dashboard.</p>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader className="flex items-center gap-3">
          <ShieldCheck className="text-green-600" />
          <CardTitle>Privacy & Security</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          You are in full control of what notifications you receive. We will never share your data with third parties, and all notifications are encrypted and secure.
        </CardContent>
      </Card>
    </div>
  );
}
