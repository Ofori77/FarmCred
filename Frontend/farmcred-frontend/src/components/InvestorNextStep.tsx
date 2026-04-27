"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type InvestorNextStepProps = {
  formData: any;
  setFormData: React.Dispatch<React.SetStateAction<any>>;
};

export default function InvestorNextStep({
  formData,
  setFormData,
}: InvestorNextStepProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev: any) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Label
          htmlFor="phoneNumber"
          className="text-sm font-medium text-[#157148] font-[Inter]"
        >
          Phone Number
        </Label>
        <Input
          id="phoneNumber"
          name="phoneNumber"
          type="tel"
          required
          value={formData.phoneNumber}
          onChange={handleChange}
          placeholder="e.g. +233XXXXXXXXX"
          className="h-10 border-[#D6DFBC] focus:border-[#158f20] focus:ring-[#158f20] text-[#157148] text-sm font-[Inter]"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="country"
          className="text-sm font-medium text-[#157148] font-[Inter]"
        >
          Country
        </Label>
        <Input
          id="country"
          name="country"
          type="text"
          required
          value={formData.country}
          onChange={handleChange}
          placeholder="Ghana"
          className="h-10 border-[#D6DFBC] focus:border-[#158f20] focus:ring-[#158f20] text-[#157148] text-sm font-[Inter]"
        />
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="region"
          className="text-sm font-medium text-[#157148] font-[Inter]"
        >
          Region
        </Label>
        <Input
          id="region"
          name="region"
          type="text"
          required
          value={formData.region}
          onChange={handleChange}
          placeholder="Greater Accra"
          className="h-10 border-[#D6DFBC] focus:border-[#158f20] focus:ring-[#158f20] text-[#157148] text-sm font-[Inter]"
        />
      </div>
    </div>
  );
}
