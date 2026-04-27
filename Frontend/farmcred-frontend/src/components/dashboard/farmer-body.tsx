"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";

import TransferHistory from "./TransferHistory";
import TransactionHistory from "./TransactionHistory";
import TrustStar from "./TrustStar";
import FarmerProduct from "./farmer-product";

import {
  useFarmerProfile,
  useFarmerOverview,
  useFarmerTransactions,
  useFarmerTransfers,
} from "@/hooks/useFarmerData";

import IncomeExpensesChart from "./IncomeExpenseTransaction";

export default function FarmerDashboard() {
  const {
    data: profile,
    loading: profileLoading,
    error: profileError,
  } = useFarmerProfile();
  const { data: overview, loading: overviewLoading } = useFarmerOverview();
  const { data: transactions, loading: transactionsLoading } =
    useFarmerTransactions();
  const { data: transfers, loading: transfersLoading } = useFarmerTransfers();

  const loading =
    profileLoading ||
    overviewLoading ||
    transactionsLoading ||
    transfersLoading;

  if (profileError) {
    console.error("Failed to fetch profile:", profileError);
  }

  return (
    <div className="flex-1 w-full px-6 mt-2 flex flex-col gap-6">
      {/* === Overview Section === */}
      {/* === Overview Section (reordered layout) === */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex flex-wrap gap-4 w-full">
          {/* Total Income */}
          <Card className="flex-[1.4] dark:bg-card p-4 rounded-[12px] border flex flex-col justify-between shadow-sm">
            <CardTitle className="text-sm font-medium ">Total Income</CardTitle>
            <CardContent className="px-0 mt-auto">
              {loading ? (
                <>
                  <Skeleton className="h-10 w-32 mb-2" />
                  <Skeleton className="h-4 w-24" />
                </>
              ) : (
                <>
                  <div className="text-4xl font-semibold mb-2">
                    GH₵{overview?.total_income_last_12_months || 0}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Last 12 months
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Transfer History (moved up) */}
          <Card className="flex-[1.2] dark:bg-card p-4 rounded-[12px] border flex flex-col shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
              <CardTitle className="text-sm font-medium mb-2">
                Transfer History
              </CardTitle>
              <Link href="/dashboard/transfers">
                <Button
                  variant="ghost"
                  className="text-gray-400 hover:text-[#157148] h-auto p-1 font-medium text-sm"
                >
                  View More
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto p-0">
              {loading ? <SkeletonRows /> : <TransferHistory />}
            </CardContent>
          </Card>

          {/* Trust Info */}
          <div className="flex flex-col gap-4 flex-1 min-w-[250px]">
            {/* Trust Level */}
            <Card className="dark:bg-card p-4 rounded-[12px] border shadow-sm">
              <CardTitle className="text-sm font-medium mb-2">
                Trust Level
              </CardTitle>
              <CardContent className="text-3xl px-0">
                {overview && <TrustStar income={overview.trust_level_stars} />}
              </CardContent>
            </Card>

            {/* Trust Score */}
            <Card className="dark:bg-card p-4 rounded-[12px] border shadow-sm">
              <CardTitle className="text-sm font-medium mb-2">
                Trust Score
              </CardTitle>
              <CardContent className="text-3xl font-semibold px-0">
                {overview && \${Math.round(overview.trust_score_percent || 0)}%`}`
                {overview && (
                  <Progress
                    value={overview.trust_score_percent || 0}
                    className="w-full h-[7px] rounded-full overflow-hidden mt-2"
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* === Chart + Products (left) and Transaction History (right) === */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-6 min-h-[500px]">
        {/* Left Column: Chart + My Products */}
        <div className="flex flex-col gap-6">
          {/* Income vs Expenses Chart */}
          <IncomeExpensesChart />

          {/* My Products */}
          <Card className="p-6 flex flex-col w-full dark:bg-card rounded-[12px] shadow-sm flex-1">
            <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
              <CardTitle className="text-sm font-medium">My Products</CardTitle>
            </CardHeader>
            <div className="flex-1 overflow-auto">
              {loading ? (
                <Skeleton className="h-24 w-full rounded-md" />
              ) : (
                <FarmerProduct />
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Transaction History */}
        <Card className="p-6 flex flex-col w-full dark:bg-card rounded-[12px] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between p-0 pb-4">
            <CardTitle className="text-sm font-medium">
              Transaction History
            </CardTitle>
            <Link href="/dashboard/transactions">
              <Button
                variant="ghost"
                className="text-gray-400 hover:text-[#157148] h-auto p-1 font-medium text-sm"
              >
                View More
              </Button>
            </Link>
          </CardHeader>
          <div className="flex-1 overflow-auto">
            {loading ? (
              <SkeletonRows />
            ) : (
              <TransactionHistory tablelength={8} />
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

// Skeleton for table-style rows
function SkeletonRows() {
  return (
    <div className="space-y-3">
      {[...Array(4)].map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}
