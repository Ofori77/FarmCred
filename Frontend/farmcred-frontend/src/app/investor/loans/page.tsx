"use client";

import { useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Grid3X3, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInvestorLoans } from "@/hooks/useInvestorData";

const statusColorMap = {
  repaid: "bg-green-100 text-green-700",
  active: "bg-blue-100 text-blue-700",
  pending: "bg-yellow-100 text-yellow-800",
  approved: "bg-indigo-100 text-indigo-700",
  declined: "bg-red-100 text-red-700",
};

export default function LoanPage() {
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const { data: loans, loading, error } = useInvestorLoans();

  if (loading) {
    return <p className="text-center p-8 text-gray-500">Loading reviews...</p>;
  }

  if (error) {
    return <p className="text-center p-8 text-red-600">Error: {error}</p>;
  }
  
  const safeLoans = loans || [];

  const totalLoaned = safeLoans
    .filter((loan) => loan.status !== "declined")
    .reduce((sum, loan) => sum + loan.amount, 0);

  const repaidLoans = safeLoans.filter((loan) => loan.status === "repaid");
  const repaymentProgress = safeLoans.length
    ? (repaidLoans.length / safeLoans.length) * 100
    : 0;

  return (
    <div className="p-4 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-2xl font-semibold text-[#158f20]">My Loans</h2>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="w-4 h-4 mr-1" /> Grid
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4 mr-1" /> List
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Total Loaned Amount</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold text-[#158f20]">
            GHS {totalLoaned.toFixed(2)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Repayment Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={repaymentProgress} className="h-3" />
            <div className="text-sm mt-2">
              {repaidLoans.length} of {safeLoans.length} loans repaid
            </div>
          </CardContent>
        </Card>
      </div>

      <div
        className={cn(
          viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            : "space-y-4"
        )}
      >
        {safeLoans.map((loan) => (
          <Card
            key={loan.id}
            className={cn(
              "transition-all",
              viewMode === "list" && "flex justify-between p-4 items-start"
            )}
          >
            <div className="space-y-2 p-4">
              <div className="text-sm text-muted-foreground">
                Loan ID: #{loan.id}
              </div>
              <div className="text-xl font-semibold">GHS {loan.amount}</div>
              <div className="text-sm">Due: {loan.due_date}</div>
              <Badge className={cn("w-fit", statusColorMap[loan.status])}>
                {loan.status.charAt(0).toUpperCase() + loan.status.slice(1)}
              </Badge>
            </div>
            {viewMode === "list" && (
              <div className="p-4 space-y-2">
                <div className="text-xl font-semibold">GHS {loan.amount}</div>
                <div className="text-xs text-muted-foreground">
                  {loan.due_date}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
