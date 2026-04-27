"use client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Dialog } from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { MoreVertical } from "lucide-react";
import { useFarmerList } from "@/hooks/useInvestorData";
import { useFarmerDetails } from "@/hooks/useInvestorData";
import { InvestorFarmers } from "@/lib/types/investortypes";
import { useState } from "react";
import FarmerProfile from "./FarmerProfileDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { InvestorDialogContent } from "./InvestmentDialog";
import { useLanguage } from "@/contexts/LanguageContext";
import TrustStar from "../dashboard/TrustStar";
import { investorService } from "@/lib/api/investor";
import { toast } from "sonner";

interface BrowseFarmersProps {
  tablelength: number;
  search?: string;
  filter?: string;
  onFiltered?: (filtered: InvestorFarmers[]) => void;
}

const BrowseFarmers = ({
  tablelength,
  search,
  filter = "all",
}: BrowseFarmersProps) => {
  const { t } = useLanguage();
  const { data: farmerListData, loading, error } = useFarmerList();
  const length = tablelength;
  const farmers: InvestorFarmers[] = Array.isArray(farmerListData)
    ? farmerListData
    : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-[#157148]">{t("loading_farmers")}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-red-600">
          {t("error_loading_farmers")}: {error}
        </div>
      </div>
    );
  }

  if (!farmers || farmers.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-gray-500">{t("no_farmers_available")}</div>
      </div>
    );
  }

  const filteredFarmers = farmers.filter((farmer: InvestorFarmers) => {
    const query = search?.toLowerCase() || "";
    if (filter === "trust score > 60" && farmer.trust_score_percent <= 60) {
      return false;
    }
    if (filter === "trust score < 60" && farmer.trust_score_percent >= 60) {
      return false;
    }

    if (search && filter === "all") {
      return (
        farmer.full_name.toLowerCase().includes(query) ||
        farmer.id.toString().includes(query)
      );
    }
    return true;
  });

  const farmerData = filteredFarmers.slice(0, length);

  return (
    <Card className="border border-gray-200 p-6">
      <CardContent className="overflow-x-auto p-0">
        <Table>
          <TableHeader>
            <TableRow className="border-b border-gray-200 hover:bg-transparent">
              {[
                "ID",
                "Full Name",
                "Trust Level Stars",
                "Trust Score Percent",
                "Active Loans",
                "Overdue Loans",
                "Action",
              ].map((label) => (
                <TableHead
                  key={label}
                  className="text-base font-normal text-card-foreground h-auto py-3"
                  style={{ letterSpacing: "-0.06em" }}
                >
                  {t(label)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {farmerData.map((farmer: InvestorFarmers, index: number) => (
              <FarmerTableRow
                key={farmer.id}
                farmers={farmer}
                isLast={index === farmerData.length - 1}
              />
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

interface FarmersTableRowProps {
  farmers: InvestorFarmers;
  isLast: boolean;
}

function FarmerTableRow({ farmers, isLast }: FarmersTableRowProps) {
  const { t } = useLanguage();
  const [openDetails, setOpenDetails] = useState(false);
  const [openInvest, setOpenInvest] = useState(false);
  const { data: fullProfile } = useFarmerDetails(farmers.id);

  const handleAddToReviews = async () => {
    try {
      await investorService.addReview(farmers.id);
      toast.success(`${farmers.full_name} added to your review list`);
    } catch (error: any) {
      if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
        toast.info(`${farmers.full_name} is already in your review list`);
      } else {
        toast.error(error.message || "Failed to add farmer to reviews");
      }
    }
  };

  return (
    <TableRow
      className={`hover:bg-transparent ${
        !isLast ? "border-b border-gray-100" : "border-none"
      }`}
    >
      <TableCell
        className="text-base font-normal text-[#158F20] py-3"
        style={{ letterSpacing: "-0.06em" }}
      >
        {farmers.id}
      </TableCell>
      <TableCell
        className="text-base font-normal text-[#158F20] py-3"
        style={{ letterSpacing: "-0.06em" }}
      >
        {farmers.full_name}
      </TableCell>
      <TableCell
        className="text-base font-normal py-3"
        style={{ letterSpacing: "-0.06em" }}
      >
        <TrustStar income={farmers.trust_level_stars} size="text-sm" />
      </TableCell>
      <TableCell
        className="text-base font-normal py-3 text-[#158f20] dark:text-green-700"
        style={{ letterSpacing: "-0.06em" }}
      >
        {Math.round(farmers.trust_score_percent)}%
      </TableCell>
      <TableCell
        className="text-base font-normal py-3 text-[#158f20]  dark:text-green-700"
        style={{ letterSpacing: "-0.06em" }}
      >
        {farmers.active_loans}
      </TableCell>
      <TableCell
        className="text-base font-normal text-[#158f20]  dark:text-green-700 py-3"
        style={{ letterSpacing: "-0.06em" }}
      >
        {farmers.overdue_loans}
      </TableCell>
      <TableCell className="py-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4 text-[#157148]" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="flex flex-col w-48 gap-1">
            <DropdownMenuItem onClick={() => setOpenDetails(true)}>
              {t("view_details")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setOpenInvest(true)}>
              {t("invest_in_farmer")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddToReviews}>
              Add to Reviews
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={openDetails} onOpenChange={setOpenDetails}>
          <FarmerProfile
            farmer={farmers}
            fullProfile={fullProfile}
            onClose={() => setOpenDetails(false)}
          />
        </Dialog>
        <Dialog open={openInvest} onOpenChange={setOpenInvest}>
          <InvestorDialogContent
            farmer={farmers}
            onClose={() => setOpenInvest(false)}
            onConfirm={(amount) => {
              console.log("Invested:", amount, "in", farmers.full_name);
              setOpenInvest(false);
            }}
          />
        </Dialog>
      </TableCell>
    </TableRow>
  );
}

export default BrowseFarmers;
