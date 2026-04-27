"use client";
import {
  DialogContent,
  DialogTitle,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InvestorFarmers } from "@/lib/types/investortypes";
import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

interface FarmerProfileDialogProps {
  farmer: InvestorFarmers;
  onClose: () => void;
  onConfirm: (amount: number) => void;
}

export function InvestorDialogContent({
  farmer,
  onClose,
  onConfirm,
}: FarmerProfileDialogProps) {
  const { t } = useLanguage();
  const [amount, setAmount] = useState<number>(0);
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = () => {
    if (!amount || amount <= 0) {
      setError("Please Enter Valid Amount");
      return;
    }
    if (!agreed) {
      setError("Please Accept Terms");
      return;
    }
    setError("");
    onConfirm(amount);
  };

   return (
    <DialogContent className="space-y-4">
      <DialogTitle className="text-lg font-medium text-gray-800 dark:text-gray-100 text-center">
        {t("Invest in Farmer")}:{" "}
        <span className="font-semibold text-[#158f20]">{farmer.full_name}</span>
        <DialogClose />
      </DialogTitle>

      <div className="space-y-2">
        <Label htmlFor="amount">{t("Amount to Invest")}</Label>
        <Input
          id="amount"
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          placeholder={t("Enter Amount")}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="terms"
          checked={agreed}
          onCheckedChange={(checked) => setAgreed(!!checked)}
        />
        <Label htmlFor="terms">
          {t("I agree to")}{" "}
          <a href="/terms" target="_blank" className="underline text-blue-600">
            {t("Investment Terms")}
          </a>
        </Label>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <DialogFooter className="flex justify-between">
        <Button variant="destructive" onClick={onClose}>
          {t("Cancel")}
        </Button>
        <Button onClick={handleConfirm}>{t("Confirm Investment")}</Button>
      </DialogFooter>
    </DialogContent>
  );
}

