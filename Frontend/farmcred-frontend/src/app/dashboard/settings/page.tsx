"use client";

import { useTheme } from "next-themes";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useToggleDiscoverability } from "@/hooks/useFarmerData";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { logout } from "@/lib/services/authService";
import { LogOut } from "lucide-react";
import router from "next/router";
import { toast } from "sonner";

export default function SettingsPage() {
  const { setTheme, theme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const [darkMode, setDarkMode] = useState(theme === "dark");

  // Toggle discoverability state
  const {
    toggleDiscoverability,
    isDiscoverable,
    loading: discoverabilityLoading,
    error: toggleError,
  } = useToggleDiscoverability();
  const [discoverable, setDiscoverable] = useState(false);

  // Optionally sync with state after toggle
  const handleDiscoverabilityToggle = async () => {
    try {
      const data = await toggleDiscoverability();
      setDiscoverable(data.is_discoverable_by_investors);
      toast.success(data.message);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  useEffect(() => {
    // Sync theme with switch state
    setTheme(darkMode ? "dark" : "light");
  }, [darkMode, setTheme]);

  function handleLanguageChange(value: "en" | "twi" | "fr") {
    setLanguage(value);
  }

  // Handle logout
  const handleLogout = () => {
    try {
      logout();

      router.push("/login");

      console.log("Logged out successfully");
    } catch (error) {
      console.error("Error during logout:", error);
      router.push("/login");
    }
  };

  return (
    <div className="space-y-6 px-6 py-8 max-w-6xl">
      {/* Theme */}
      <Card>
        <CardHeader>
          <CardTitle>{t("appearance")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Label htmlFor="theme-toggle">{t("dark_mode")}</Label>
          <Switch
            id="theme-toggle"
            checked={darkMode}
            onCheckedChange={setDarkMode}
          />
        </CardContent>
      </Card>

      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle>{t("language")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-[200px] capitalize">
              <SelectValue placeholder={t("language")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t("english")}</SelectItem>
              <SelectItem value="fr">{t("french")}</SelectItem>
              <SelectItem value="twi">{t("twi")}</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Discoverability Toggle */}
      <Card>
        <CardHeader>
          <CardTitle>{t("visibility_to_investors")}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <Label htmlFor="discoverability-toggle">
            {t("make_profile_visible")}
          </Label>
          <Switch
            id="discoverability-toggle"
            checked={discoverable}
            disabled={discoverabilityLoading}
            onCheckedChange={handleDiscoverabilityToggle}
          />
        </CardContent>
      </Card>

      {/* Logout */}
      <Card>
        <CardContent>
          <Button
            variant="ghost"
            className="text-destructive flex items-center gap-2"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            {t("logout")}
          </Button>{" "}
        </CardContent>
      </Card>
    </div>
  );
}
