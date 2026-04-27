"use client";
import BrowseFarmers from "@/components/investor/BrowseFarmers";
import { Input } from "@/components/ui/input";
import { Search, Globe, Filter, Leaf, Users } from "lucide-react";
import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLanguage } from "@/contexts/LanguageContext";

export default function BrowseFarmersPage() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<
    "all" | "region" | "trust score < 60" | "trust score > 60" | "crops"
  >("all");

  const { t } = useLanguage();

  const handleTabChange = (value: string) => {
    setFilter(value as typeof filter);
  };

  return (
    <div className="px-6 lg:px-24 py-6">
      <div className="flex items-center justify-center mb-4 flex-col gap-4">
        <div className="relative w-full max-w-lg">
          <Input
            placeholder={t("search_placeholder")}
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
        </div>
      </div>

      <Tabs defaultValue="all" onValueChange={handleTabChange} className="mb-6">
        <TabsList className="flex flex-wrap justify-start gap-2">
          <TabsTrigger value="all" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            {t("all")}
          </TabsTrigger>
          <TabsTrigger value="region" className="flex items-center gap-2">
            <Globe className="w-4 h-4" />
            {t("region")}
          </TabsTrigger>
          <TabsTrigger
            value="trust score > 60"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            {t("trust_above_60")}
          </TabsTrigger>
          <TabsTrigger
            value="trust score < 60"
            className="flex items-center gap-2"
          >
            <Filter className="w-4 h-4" />
            {t("trust_below_60")}
          </TabsTrigger>
          <TabsTrigger value="crops" className="flex items-center gap-2">
            <Leaf className="w-4 h-4" />
            {t("crops")}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <BrowseFarmers tablelength={10} search={search} filter={filter} />
    </div>
  );
}
