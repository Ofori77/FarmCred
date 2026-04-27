"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useFarmerProfile, useUpdateProfile } from "@/hooks/useFarmerData";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function NotificationSettings() {
  const { data: profile, loading } = useFarmerProfile();
  const { updateProfile, loading: saving } = useUpdateProfile();

  const [trustLevelNotify, setTrustLevelNotify] = useState(true);
  const [smsNotify, setSmsNotify] = useState(false);
  const [emailNotify, setEmailNotify] = useState(true);

  // Load current preferences
  useEffect(() => {
    if (profile) {
      setTrustLevelNotify(profile.receive_level_notifications);
      setSmsNotify(profile.receive_sms_notifications);
      setEmailNotify(profile.receive_email_notifications);
    }
  }, [profile]);

  // Unified handler
  const handleUpdate = async (field: string, value: boolean) => {
    try {
      const updateData = { [field]: value };

      await updateProfile(updateData);
      toast.success("Preferences updated");
    } catch (error) {
      console.error("Update failed:", error);
      toast.error("Failed to update preferences");
    }
  };

  if (loading) return <p className="text-muted">Loading settings...</p>;

  return (
    <div className="space-y-6 px-6 py-8 max-w-6xl">
      {/* Intro */}
      <div className="mb-4 flex items-center justify-between">
        <span className="font-medium text-[#157148]">
          Notification Preferences
        </span>
        <Link
          href="/dashboard/settings/notification-settings/about-notifications"
          className="text-[#157148] underline text-sm ml-2"
        >
          About notifications
        </Link>
      </div>

      {/* Notification Type */}
      <Card>
        <CardHeader>
          <CardTitle>Notification Triggers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox
              id="trust-level"
              checked={trustLevelNotify}
              onCheckedChange={(checked) => {
                const value = checked === true;
                setTrustLevelNotify(value);
                handleUpdate("receive_level_notifications", value);
              }}
              className="border-[#157148] data-[state=checked]:bg-[#158f20] data-[state=checked]:border-[#158f20]"
            />
            <Label htmlFor="trust-level" className="text-sm">
              Notify me when I advance to a new trust level
            </Label>
          </div>
        </CardContent>
      </Card>

      {/* Delivery Methods */}
      <Card>
        <CardHeader>
          <CardTitle>Delivery Methods</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label>Mobile SMS Notification</Label>
            <Switch
              checked={smsNotify}
              onCheckedChange={(checked) => {
                setSmsNotify(checked);
                handleUpdate("receive_sms_notifications", checked);
              }}
              disabled={saving}
              className="data-[state=checked]:bg-[#158f20]"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label>Email Notification</Label>
            <Switch
              checked={emailNotify}
              onCheckedChange={(checked) => {
                setEmailNotify(checked);
                handleUpdate("receive_email_notifications", checked);
              }}
              disabled={saving}
              className="data-[state=checked]:bg-[#158f20]"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
