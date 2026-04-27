"use client";

import {
  DialogContent,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FarmerProfile, InvestorFarmers } from "@/lib/types/investortypes";
import {
  Phone,
  MapPin,
  User,
  ShieldCheck,
  Leaf,
  Home,
  BadgeDollarSign,
  Calendar,
  Landmark,
  Contact,
  ClipboardList,
  Globe,
  BadgeCent,
  PiggyBank,
  Loader2,
  BookUser,
  Handshake,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface FarmerProfileDialogProps {
  farmer: InvestorFarmers;
  fullProfile?: FarmerProfile | null;
  onClose: () => void;
}

export default function FarmerProfileDialogContent({
  farmer,
  fullProfile,
  onClose,
}: FarmerProfileDialogProps) {
  const { t } = useLanguage();
  const profileData = fullProfile || farmer;
  const isLoadingFullProfile = !fullProfile;

  return (
    <DialogContent className="text-[#158f20] space-y-4 max-w-4xl">
      <DialogTitle className="text-[#158f20] text-xl mb-2 flex items-center gap-2">
        <User className="w-5 h-5" /> {t("farmer_profile")}
      </DialogTitle>

      {isLoadingFullProfile && (
        <div className="flex items-center justify-center p-4">
          <Loader2 className="w-6 h-6 animate-spin text-[#158f20]" />
          <span className="ml-2 text-sm text-muted-foreground">
            {t("loading_detailed_profile")}
          </span>
        </div>
      )}

      <Card className="border border-[#157148]/30 rounded-xl shadow-sm">
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
          <InfoItem
            icon={<User />}
            label={t("full_name")}
            value={profileData.full_name}
          />
          <InfoItem
            icon={<Phone />}
            label={t("phone")}
            value={fullProfile?.phone_number || "N/A"}
          />
          <InfoItem
            icon={<BookUser />}
            label={t("account_ID")}
            value={fullProfile?.id || farmer.id}
          />

          {fullProfile?.national_id && (
            <InfoItem
              icon={<Contact />}
              label={t("national_ID")}
              value={fullProfile.national_id}
            />
          )}
          {fullProfile?.dob && (
            <InfoItem
              icon={<Calendar />}
              label={t("date_of_birth")}
              value={fullProfile.dob}
            />
          )}
          {fullProfile?.home_address && (
            <InfoItem
              icon={<Home />}
              label={t("home_address")}
              value={fullProfile.home_address}
            />
          )}

          <InfoItem
            icon={<MapPin />}
            label={t("region")}
            value={fullProfile?.region || "N/A"}
          />
          <InfoItem
            icon={<Globe />}
            label={t("country")}
            value={fullProfile?.country || "N/A"}
          />
          <InfoItem
            icon={<ShieldCheck />}
            label={t("trust_score")}
            value={`${profileData.trust_score_percent}%`}
          />
          <InfoItem
            icon={<Handshake />}
            label={t("trust_level")}
            value={`${profileData.trust_level_stars} ${t("stars")}`}
          />

          {fullProfile?.total_income_last_12_months !== undefined && (
            <InfoItem
              icon={<BadgeDollarSign />}
              label={t("total_income_12mo")}
              value={`GHS ${fullProfile.total_income_last_12_months.toLocaleString()}`}
            />
          )}

          {/* Produce */}
          <div className="flex items-center gap-3 col-span-1 sm:col-span-2">
            <Leaf className="text-[#158f20] w-5 h-5" />
            <div>
              <p className="text-sm text-muted-foreground">{t("produce")}</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {fullProfile?.produce?.map((item, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-green-100 text-[#158f20] text-xs font-medium"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Transactions, Transfers, Loans */}
          {fullProfile && (
            <div className="col-span-1 sm:col-span-2 flex flex-col gap-2 mt-2">
              <InfoCount
                icon={<ClipboardList />}
                label={t("transactions")}
                value={fullProfile.transactions?.length ?? 0}
              />
              <InfoCount
                icon={<BadgeCent />}
                label={t("transfers")}
                value={fullProfile.transfers?.length ?? 0}
              />
              <InfoCount
                icon={<PiggyBank />}
                label={t("loans")}
                value={fullProfile.loans?.length ?? 0}
              />
            </div>
          )}

          {!fullProfile && (
            <div className="col-span-1 sm:col-span-2 flex flex-col gap-2 mt-2">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">
                  {t("basic_profile_information_displayed")}
                </span>
              </div>
              <div className="text-sm text-muted-foreground">
                {t(
                  "detailed_transaction_and_loan_history_available"
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <DialogClose asChild>
          <Button variant="destructive" onClick={onClose}>
            {t("close")}
          </Button>
        </DialogClose>
      </div>
    </DialogContent>
  );
}

// Reusable components for brevity
function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="text-[#158f20] w-5 h-5">{icon}</div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-base font-medium text-[#05402E] dark:text-green-700">
          {value}
        </p>
      </div>
    </div>
  );
}

function InfoCount({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="text-sm text-muted-foreground flex items-center gap-2">
      <div className="w-4 h-4 text-[#158f20]">{icon}</div>
      {label}:{" "}
      <span className="font-medium text-[#05402E] dark:text-green-700">
        {value}
      </span>
    </div>
  );
}
