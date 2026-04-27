"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Pencil, Trash2 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  useDeleteFarmerAccount,
  useFarmerProfile,
  useUpdateProfile,
} from "@/hooks/useFarmerData";
import { toast } from "sonner";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";

export default function MyAccount() {
  const { t } = useLanguage();
  const { data: profile, loading, refetch } = useFarmerProfile();
  const { updateProfile, loading: saving } = useUpdateProfile();
  const [phone, setPhone] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { deleteAccount } = useDeleteFarmerAccount();

  useEffect(() => {
    if (profile?.phone_number) setPhone(profile.phone_number);
  }, [profile]);

  async function handlePhoneSave() {
    if (!phone) {
      toast.error("Phone number cannot be empty.");
      return;
    }
    try {
      await updateProfile({ phone_number: phone });
      toast.success("Phone number updated successfully.");
      setEditingPhone(false);
      refetch(); // Refresh profile data
    } catch (error: any) {
      toast.error(error.message || "Failed to update phone number.");
    }
  }

  async function handleChangePassword() {
    if (!password || password.length < 12) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      toast.success("Password changed successfully!");
      setPassword("");
      setNewPassword("");
      setShowPassword(false);
    } catch (error: any) {
      toast.error(error.message || "Failed to change password.");
    }
  }

  async function handleDeleteAccount() {
    const confirmed = confirm(
      "Are you sure you want to delete your account? This action cannot be undone."
    );

    if (confirmed) {
      try {
        await deleteAccount(); // call hook function
        toast.success("Account deleted successfully");
        window.location.href = "/login"; // or redirect to goodbye page
      } catch (error: any) {
        toast.error(error.message || "Failed to delete account");
      }
    }
  }

  if (loading) {
    return <div className="p-4">{t("loading") || "Loading..."}</div>;
  }

  if (!profile) {
    return (
      <div className="p-4 text-red-600">
        {t("No Profile") || "No profile data available."}
      </div>
    );
  }

  return (
    <div className="space-y-6 px-6 py-8 max-w-6xl">
      {/* Email & User ID */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#158f20]">Account Info</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 max-w-sm">
          <div>
            <Label className="text-[#158f20] mb-1">Email</Label>
            <Input value={profile.email} disabled />
          </div>
          <div>
            <Label className="text-[#158f20] mb-1">User ID</Label>
            <Input value={profile.account_id || profile.id} disabled />
          </div>
        </CardContent>
      </Card>

      {/* Phone Number */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#158f20]">Phone Number</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 max-w-sm">
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!editingPhone}
            />
            {editingPhone ? (
              <Button
                className="bg-[#158f20]"
                size="sm"
                onClick={handlePhoneSave}
              >
                Save
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                className="text-[#158f20]"
                onClick={() => setEditingPhone(true)}
              >
                <Pencil className="w-4 h-4 mr-1" /> Change
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader>
          <CardTitle className="text-[#158f20]">Password</CardTitle>
        </CardHeader>
        <CardContent>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="text-[#158f20]">
                <Pencil className="w-4 h-4 mr-1" /> Change Password
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Password Settings</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                {/* Current Password */}
                <div>
                  <Label className="mb-1">Current Password</Label>
                  <div className="flex gap-2">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your current password"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <Label className="mb-1">New Password</Label>
                  <div className="flex gap-2">
                    <Input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter a new password"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button className="bg-[#158f20]" onClick={handleChangePassword}>
                  Save New Password
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Delete Account */}
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="ghost"
            className="text-destructive flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            Delete My Account
          </Button>
        </DialogTrigger>

        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-red-600">Confirm Delete</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Are you sure? This action cannot be undone.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={handleDeleteAccount}
            >
              Yes, Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
