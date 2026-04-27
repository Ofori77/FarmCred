"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, List, TrendingUp, DollarSign, Target, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvestorInvestments } from "@/hooks/useInvestorData";

const statusColorMap = {
  repaid: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  active: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  approved: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  declined: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  defaulted: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  cancelled: "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-300",
} as const;

type InvestmentStatus = keyof typeof statusColorMap;

// Helper function to safely convert to number
const toNumber = (value: any): number => {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') return parseFloat(value) || 0;
  return 0;
};

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-GH', {
    style: 'currency',
    currency: 'GHS',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount).replace('GHS', 'GH₵');
};

export default function InvestmentsPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { data: investments, loading, error } = useInvestorInvestments();

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#158f20] mx-auto"></div>
          <p className="text-gray-500">Loading your investments...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto">
          <p className="text-red-600 font-medium">Error loading investments</p>
          <p className="text-red-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }
  
  const safeInvestments = investments || [];

  // Calculate investment metrics with proper number conversion
  const totalInvested = safeInvestments
    .filter((investment) => investment.status !== "declined" && investment.status !== "cancelled")
    .reduce((sum, investment) => sum + toNumber(investment.amount), 0);

  const activeInvestments = safeInvestments.filter((inv) => 
    inv.status === "active" || inv.status === "approved"
  );
  
  const completedInvestments = safeInvestments.filter((inv) => inv.status === "repaid");
  
  const investmentProgress = safeInvestments.length > 0
    ? (completedInvestments.length / safeInvestments.length) * 100
    : 0;

  // Calculate total returns for completed investments
  const totalReturns = completedInvestments.reduce((sum, inv) => {
    const principal = toNumber(inv.amount);
    const interestRate = toNumber(inv.interest_rate);
    const periodMonths = toNumber(inv.repayment_period_months);
    const returns = principal * (interestRate / 100) * (periodMonths / 12);
    return sum + returns;
  }, 0);

  const avgROI = totalInvested > 0 ? (totalReturns / totalInvested) * 100 : 0;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#158f20]">My Investments</h1>
          <p className="text-gray-600 mt-1">Track your agricultural investments and returns</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant={viewMode === "grid" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("grid")}
            className="bg-[#158f20] hover:bg-[#157148]"
          >
            <Grid3X3 className="w-4 h-4 mr-2" /> Grid
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="bg-[#158f20] hover:bg-[#157148]"
          >
            <List className="w-4 h-4 mr-2" /> List
          </Button>
        </div>
      </div>

      {/* Investment Summary Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-r from-[#158f20] to-[#157148] text-white">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Invested</CardTitle>
            <DollarSign className="w-4 h-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalInvested)}</div>
            <p className="text-xs opacity-80">Across {safeInvestments.length} investments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Active Investments</CardTitle>
            <Target className="w-4 h-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{activeInvestments.length}</div>
            <p className="text-xs text-gray-600">Currently funding farmers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg. ROI</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{avgROI.toFixed(1)}%</div>
            <p className="text-xs text-gray-600">Return on investments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Investment Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={investmentProgress} className="h-3 mb-2" />
            <div className="text-sm text-gray-600">
              {completedInvestments.length} of {safeInvestments.length} completed
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Investments List/Grid */}
      {safeInvestments.length === 0 ? (
        <Card className="text-center p-8">
          <CardContent className="space-y-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Banknote className="w-8 h-8 text-gray-400" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">No investments yet</h3>
              <p className="text-gray-500">Start investing in farmers to see your portfolio here</p>
            </div>
            <Button className="bg-[#158f20] hover:bg-[#157148]">
              Browse Farmers
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div
          className={cn(
            viewMode === "grid"
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              : "space-y-4"
          )}
        >
          {safeInvestments.map((investment) => {
            const amount = toNumber(investment.amount);
            const interestRate = toNumber(investment.interest_rate);
            const periodMonths = toNumber(investment.repayment_period_months);
            const roi = (interestRate / 100) * (periodMonths / 12);
            const expectedReturns = amount + (amount * roi);
            
            return (
              <Card
                key={investment.id}
                className={cn(
                  "",
                  viewMode === "list" && "flex flex-row items-center justify-between p-6"
                )}
              >
                {viewMode === "grid" ? (
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-sm text-gray-500">Investment #{investment.id}</p>
                        <h3 className="font-semibold text-lg">{investment.farmer_full_name}</h3>
                      </div>
                      <Badge className={cn("text-xs", statusColorMap[investment.status] || "bg-gray-100 text-gray-700")}>
                        {investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Amount Invested:</span>
                        <span className="font-medium">{formatCurrency(amount)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Expected Total:</span>
                        <span className="font-medium text-green-600">{formatCurrency(expectedReturns)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Interest Rate:</span>
                        <span className="font-medium">{interestRate}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Duration:</span>
                        <span className="font-medium">{periodMonths} months</span>
                      </div>
                      {investment.due_date && (
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Due Date:</span>
                          <span className="font-medium">{new Date(investment.due_date).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>

                    {investment.date_repaid && (
                      <div className="pt-2 border-t">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Repaid On:</span>
                          <span className="font-medium text-green-600">
                            {new Date(investment.date_repaid).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">{investment.farmer_full_name}</h3>
                        <Badge className={cn("text-xs", statusColorMap[investment.status] || "bg-gray-100 text-gray-700")}>
                          {investment.status.charAt(0).toUpperCase() + investment.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500">Investment #{investment.id}</p>
                      {investment.due_date && (
                        <p className="text-xs text-gray-500">
                          Due: {new Date(investment.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="text-right space-y-1">
                      <div className="text-xl font-semibold">{formatCurrency(amount)}</div>
                      <div className="text-sm text-green-600">+{interestRate}% ROI</div>
                      <div className="text-xs text-gray-500">{periodMonths} months</div>
                    </div>
                  </>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}