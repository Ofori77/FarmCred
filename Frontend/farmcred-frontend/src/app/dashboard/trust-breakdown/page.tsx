"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import TrustStar from "@/components/dashboard/TrustStar";
import {
  useFarmerProfile,
  useFarmerOverview,
  useShareStatsLogs,
} from "@/hooks/useFarmerData";
import { toast } from "sonner";
import {
  CheckCircle,
  Clock,
  XCircle,
  TrendingUp,
  Phone,
  MapPin,
  Calendar,
  Info,
  Wheat,
  DollarSign,
  CreditCard,
  Shield,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { on } from "events";

export default function TrustBreakdown() {
  const { data: profile, loading: profileLoading } = useFarmerProfile();
  const { data: overview, loading: overviewLoading } = useFarmerOverview();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState("overview");

  const { shareStatsLogs, loading, error } = useShareStatsLogs();

  const [recipientNumber, setRecipientNumber] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleShare = async () => {
    try {
      await shareStatsLogs(recipientNumber);
      toast.success("Stats shared successfully!");
      setRecipientNumber("");
      setIsSharing(false);
    } catch (err) {
      toast.error(error || "Failed to share stats");
    }
  };

  if (profileLoading || overviewLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#158f20]"></div>
      </div>
    );
  }

  if (!profile || !overview) {
    return (
      <div className="text-center p-8">
        <p className="text-gray-500">No trust data available</p>
      </div>
    );
  }
  const safeOverview = {
    ...overview,
    trust_score_percent: overview.trust_score_percent || 0,
    total_income_current_month: overview.current_month_income || 0,
    total_loans: overview.total_loans_taken || 0,
    active_loans: overview.active_loans || 0,
    overdue_loans: overview.overdue_loans || 0,
    months_active: overview.months_active || 0,
    is_source_verified: overview.is_source_verified || false,
    source_verification_type: overview.source_verification_type || "Unknown",
    date_paid: overview.date_paid || "N/A",
    amount: overview.amount || 0,
    on_time: overview.on_time || false,
  };

  const safeProfile = {
    ...profile,
    full_name: profile.full_name || "Unknown",
    account_id: profile.account_id || "N/A",
    region: profile.region || "Unknown",
    country: profile.country || "Unknown",
    produce: profile.produce || [],
    phone_number: profile.phone_number || "N/A",
    trust_level_stars: profile.trust_level_stars || 0,
  };

  const getTrustLevel = (score: number) => {
    if (score >= 90)
      return {
        label: "Excellent",
        color: "bg-gradient-to-r from-[#158f20] to-[#0f6b18]",
        textColor: "text-[#158f20]",
      };
    if (score >= 80)
      return {
        label: "Very Good",
        color: "bg-gradient-to-r from-[#158f20] to-[#0f6b18]",
        textColor: "text-[#158f20]",
      };
    if (score >= 70)
      return {
        label: "Good",
        color: "bg-gradient-to-r from-[#158f20] to-[#0f6b18]",
        textColor: "text-[#158f20]",
      };
    if (score >= 60)
      return {
        label: "Fair",
        color: "bg-gradient-to-r from-[#158f20] to-[#0f6b18]",
        textColor: "text-[#158f20]",
      };
    return {
      label: "Poor",
      color: "bg-gradient-to-r from-[#158f20] to-[#0f6b18]",
      textColor: "text-[#158f20]",
    };
  };

  const trustLevel = getTrustLevel(safeOverview.trust_score_percent);
  const repaymentRate =
    safeOverview.total_loans_taken > 0
      ? (safeOverview.active_loans / safeOverview.total_loans_taken) * 100
      : 0;
  const onTimePaymentRate =
    safeOverview.total_loans > 0
      ? Math.round(
          (safeOverview.active_loans / safeOverview.total_loans_taken) * 100
        )
      : 0;

  function formatDistanceToNow(
    arg0: Date,
    arg1: { addSuffix: boolean }
  ): import("react").ReactNode {
    throw new Error("Function not implemented.");
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <p className="text-xl font-semibold mb-2">
          Comprehensive trust score breakdown and analysis
        </p>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <Card className="lg:col-span-1 bg-[#eff3e4] dark:bg-card">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4">
              <Avatar className="w-24 h-24 border-4 border-white dark:border-gray-200">
                <AvatarImage src="/placeholder-avatar.jpg" />
                <AvatarFallback className="bg-[#158f20] text-white text-2xl font-bold">
                  {safeProfile.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
            <CardTitle className="text-[#158f20] text-xl font-bold">
              {safeProfile.full_name}
            </CardTitle>

            {/*Status Badge*/}
            <div className="flex items-center justify-center gap-1 mt-2">
              <Badge
                variant="secondary"
                className="bg-green-100 text-[#158f20] border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-none"
              >
                <div className="w-2 h-2 rounded-full bg-[#158f20] dark:bg-green-300 mr-1"></div>
                Active
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <MapPin className="w-4 h-4 text-[#158f20]" />
                <span className="text-gray-600 dark:text-gray-200">{safeProfile.region}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-[#158f20]" />
                <span className="text-gray-600 dark:text-gray-200">
                  {safeProfile.phone_number}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Wheat className="w-4 h-4 text-[#158f20]" />
                <span className="text-gray-600 dark:text-gray-200">
                  {safeProfile.produce.length > 0
                    ? safeProfile.produce.join(", ")
                    : "Not specified"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Calendar className="w-4 h-4 text-[#158f20]" />
                <span className="text-gray-600 dark:text-gray-200">
                  Farmer ID: {safeProfile.account_id}
                </span>
              </div>
            </div>

            {/* Trust Level */}
            <div className="bg-white dark:bg-accent dark:border-none rounded-xl p-4 border border-green-100">
              <div className="flex flex-col items-center justify-center text-center">
                <p className="text-sm text-gray-500 dark:text-gray-200 mb-2">Trust Level</p>
                <TrustStar income={safeProfile.trust_level_stars} />
                <p className="text-xs text-gray-400 dark:text-gray-200 mt-1">
                  {Math.round(safeProfile.trust_level_stars)}/5 stars
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Trust Score Breakdown */}
        <Card className="lg:col-span-2 border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#158f20]">
              <Shield className="w-6 h-6" />
              Trust Score Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Trust Score Circle */}
              <div className="flex flex-col items-center justify-center p-6">
                <div className="relative w-40 h-40 mb-4">
                  <svg
                    className="w-full h-full transform -rotate-90"
                    viewBox="0 0 100 100"
                  >
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#f3f4f6"
                      strokeWidth="4"
                      fill="none"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#158f20"
                      strokeWidth="4"
                      fill="none"
                      strokeDasharray={`${
                        (safeOverview.trust_score_percent / 100) * 251.2
                      } 251.2`}
                      strokeLinecap="round"
                      className="transition-all duration-1000 ease-out"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-boldFarmer ID text-[#158f20]">
                      {Math.round(safeOverview.trust_score_percent)}%
                    </span>
                    <span className="text-xs font-medium text-gray-500 dark:text-gray-200 mt-1">
                      {trustLevel.label}
                    </span>
                  </div>
                </div>
                <Badge
                  className={`${trustLevel.color} text-white px-4 py-1 rounded-full`}
                >
                  Trust Score
                </Badge>
              </div>

              {/* Metrics */}
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-accent rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-200">
                      Repayments Made
                    </span>
                    <Info className="w-4 h-4 text-[#158f20]" />
                  </div>
                  <div className="text-2xl font-bold text-[#158f20]">
                    {safeOverview.active_loans}/{safeOverview.total_loans_taken}
                  </div>
                  <Progress value={onTimePaymentRate} className="h-2 mt-2" />
                </div>

                <div className="bg-green-50 dark:bg-accent rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-200">
                      On-time Payments
                    </span>
                    <CheckCircle className="w-4 h-4 text-[#158f20]" />
                  </div>
                  <div className="text-2xl font-bold text-[#158f20]">
                    {onTimePaymentRate}%
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-200 mt-1">
                    {safeOverview.active_loans} of{" "}
                    {safeOverview.total_loans_taken} payments
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-accent rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-200">
                      Late Payments
                    </span>
                    <Clock className="w-4 h-4 text-[#158f20]" />
                  </div>
                  <div className="text-2xl font-bold text-[#158f20]">
                    {safeOverview.overdue_loans}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-200 mt-1">
                    Payment delays recorded
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Financial Summary */}
        <Card className="border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#158f20]">
              <DollarSign className="w-5 h-5" />
              Financial Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-accent  rounded-lg">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-200">
                Monthly Income
              </span>
              <span className="font-bold text-[#158f20]">
                GH₵{safeOverview.current_month_income.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-accent rounded-lg">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-200">
                Consistency
              </span>
              <Badge
                variant="secondary"
                className="bg-green-100 text-[#158f20] dark:bg-green-900 dark:text-green-300"
              >
                {safeOverview.months_active} months active
              </Badge>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-accent rounded-lg">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-200">
                Source Verified
              </span>
              <Badge
                variant="secondary"
                className="bg-green-100 text-[#158f20] dark:bg-green-900 dark:text-green-300"
              >
                {safeOverview.is_source_verified
                  ? `Yes – via ${safeOverview.source_verification_type}`
                  : "No – source not verified"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Payment History */}
        <Card className="border-0 ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#158f20]">
              <CreditCard className="w-5 h-5" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {safeOverview.amount > 0 && safeOverview.date_paid !== "N/A" ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-accent rounded-lg">
                  <CheckCircle className="w-5 h-5 text-[#158f20]" />
                  <div className="flex-1">
                    <div className="font-medium text-sm">Recent Payment</div>
                    <div className="text-xs text-gray-500 dark:text-gray-200">
                      {formatDistanceToNow(new Date(safeOverview.date_paid), {
                        addSuffix: true,
                      })}{" "}
                      - {safeOverview.on_time ? "On time" : "Late"}
                    </div>
                  </div>
                  <span className="text-[#158f20] font-medium">
                    GH₵{safeOverview.amount.toLocaleString()}
                  </span>
                </div>

                {/* Optionally add a static or fallback "Previous Payment" block */}
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg opacity-60">
                  <CheckCircle className="w-5 h-5 text-gray-400" />
                  <div className="flex-1">
                    <div className="font-medium text-sm dark:text-gray-200">Previous Payment</div>
                    <div className="text-xs text-gray-400 dark:text-gray-200">
                      No previous payment data
                    </div>
                  </div>
                  <span className="text-gray-400 font-medium">GH₵--</span>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-200 text-center">
                No payment record found
              </div>
            )}

            <div className="flex items-center justify-center">
              <Button
                variant="outline"
                className="w-full mt-4 text-[#158f20]"
                size="sm"
                onClick={() => setShowShareDialog(true)}
              >
                <Phone className="w-4 h-4 ml-2" />
                Share Stats
              </Button>
            </div>

            <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
              <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2 text-[#158f20]">
                    <Phone className="w-5 h-5" />
                    Share Stats
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter recipient phone"
                    value={recipientNumber}
                    onChange={(e) => setRecipientNumber(e.target.value)}
                    className="w-full p-2 rounded-md"
                  />
                  <Button
                    onClick={handleShare}
                    disabled={loading || !recipientNumber}
                    className="w-full"
                  >
                    {loading ? "Sharing..." : "Share via SMS"}
                  </Button>
                  {error && (
                    <p className="text-sm text-red-500 text-center mt-2">
                      {error}
                    </p>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>

        {/* Trust Summary */}
        <Card className="border-0 ">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-[#158f20]">
              <TrendingUp className="w-5 h-5" />
              Trust Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-green-100 dark:bg-accent rounded-xl p-4">
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-[#158f20] mb-2">
                  {trustLevel.label}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-200 leading-relaxed">
                  Consistently reliable in repayments, with verified earnings
                  and strong farming output
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#158f20]"></div>
                  <span>Verified income source</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#158f20]"></div>
                  <span>High payment consistency</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#158f20]"></div>
                  <span>Active farming operations</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
