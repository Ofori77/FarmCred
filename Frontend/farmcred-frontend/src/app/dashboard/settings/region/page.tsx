"use client";

import { useState } from "react";
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const regions = [
  "Greater Accra",
  "Ashanti",
  "Central",
  "Eastern",
  "Northern",
  "Upper East",
  "Upper West",
  "Volta",
  "Western",
  "Bono",
  "Bono East",
  "Ahafo",
  "Oti",
  "Savannah",
  "North East",
  "Western North",
];

export default function RegionSettings() {
  const { t } = useLanguage();
  const [region, setRegion] = useState<string>("");

  function handleSave() {
    // TODO: Save region to backend
    alert(`Region saved: ${region}`);
  }

  return (
    <div className=" bg-white dark:bg-background max-w-2xl">
      <div className="mb-6">
        <label className="block mb-2 font-semibold text-[#158f20]">
          {t("Region") || "Region"}
        </label>
        <Select value={region} onValueChange={setRegion}>
          <SelectTrigger className="w-xs">
            <SelectValue placeholder={t("Region") || "Select region"} />
          </SelectTrigger>
          <SelectContent>
            {regions.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      </div>
  )
}
      