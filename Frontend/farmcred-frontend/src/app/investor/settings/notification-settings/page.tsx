"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function NotificationSettingsPage() {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [smsEnabled, setSmsEnabled] = useState(false);

  return (
    <div className="space-y-6 px-6 py-8 max-w-6xl">
      {/* Delivery Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Email Notifications</Label>
            <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <Label>In-App Notifications</Label>
            <Switch checked={inAppEnabled} onCheckedChange={setInAppEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <Label>SMS Notifications</Label>
            <Switch checked={smsEnabled} onCheckedChange={setSmsEnabled} />
          </div>
        </CardContent>
      </Card>

      {/* Notification Types */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {["Investment Funded", "Repayment Updates", "New Farmer Alert", "Promotions"].map((label) => (
            <div key={label} className="flex items-center gap-2">
              <Checkbox id={label} />
              <Label htmlFor={label}>{label}</Label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Frequency */}
      <Card>
        <CardHeader>
          <CardTitle>Frequency</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Label>Send notifications:</Label>
          <div className="flex gap-3">
            <Button variant="outline">Real-time</Button>
            <Button variant="outline">Daily Summary</Button>
          </div>
        </CardContent>
      </Card>

      {/* Mute */}
      <Card>
        <CardHeader>
          <CardTitle>Mute Notifications</CardTitle>
        </CardHeader>
        <CardContent>
          <Switch /> <span className="ml-2 text-sm">Mute all notifications temporarily</span>
        </CardContent>
      </Card>
    </div>
  );
}
