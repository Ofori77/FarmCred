"use client";

import { useState } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useRequestLoan } from "@/hooks/useFarmerLoan";
import { FarmerLoans } from "@/lib/types/farmertypes";

interface Props {
  onSuccess?: () => void;
  loans: FarmerLoans[];
}

export function RequestLoanModal({ onSuccess, loans }: Props) {
  const [amount, setAmount] = useState("");
  const { requestLoan, loading, error } = useRequestLoan();

  const handleSubmit = async () => {
    if (
      loans.some(
        (loan) => loan.status === "active" || loan.status === "pending"
      )
    ) {
      toast.error("You already have a pending or active loan.");
      return;
    }
    try {
      await requestLoan({
        amount: Number(amount),
      });
      toast.success("Loan requested successfully!");
      onSuccess?.(); // optional callback
      setAmount(""); // Reset amount after submission
    } catch (err) {
      toast.error(error || "Loan request failed");
    }
  };

  return (
    <DialogContent className="sm:max-w-[480px]">
      <DialogHeader>
        <DialogTitle className="text-[#158f20]">Request a Loan</DialogTitle>
      </DialogHeader>

      <div className="grid gap-4 py-2">
        <div className="grid gap-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="Enter loan amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>

      <DialogFooter>
        <Button
          onClick={handleSubmit}
          disabled={loading || !amount || Number(amount) <= 0}
          className="bg-[#158f20] text-white hover:bg-[#10741b]"
        >
          {loading ? "Submitting..." : "Submit Request"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
