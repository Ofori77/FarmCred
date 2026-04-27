"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { registerFarmer, registerInvestor } from "@/lib/services/authService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import Image from "next/image";
import FarmerNextStep from "@/components/FarmerNextStep";
import InvestorNextStep from "@/components/InvestorNextStep";

export default function SignupPage() {
  const [year, setYear] = useState<number | null>(null);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "farmer",
    phoneNumber: "",
    country: "",
    region: "",
    dob: "",
    nationalID: "",
    homeAddress: "",
    produce: [],
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleRoleChange = (value: string) => {
    setFormData({
      ...formData,
      role: value,
    });
  };

  const handleContinue = () => {
    // Basic validation for step 1
    if (
      !formData.fullName ||
      !formData.email ||
      !formData.password ||
      !formData.role
    ) {
      setError("Please fill in all required fields");
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    // Password validation
    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters long");
      return;
    }

    setError("");
    setStep(2);
  };

  const handleBack = () => {
    setStep(1);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      let result;

      if (formData.role === "farmer") {
        // Validate farmer-specific fields
        if (
          !formData.phoneNumber ||
          !formData.country ||
          !formData.region ||
          !formData.dob ||
          !formData.nationalID ||
          !formData.homeAddress
        ) {
          setError("Please fill in all required fields");
          setLoading(false);
          return;
        }

        result = await registerFarmer(
          formData.email,
          formData.password,
          formData.fullName,
          formData.role,
          formData.phoneNumber,
          formData.country,
          formData.region,
          formData.dob,
          formData.nationalID,
          formData.homeAddress,
          formData.produce
        );
      } else {
        // Validate investor-specific fields
        if (!formData.phoneNumber || !formData.country || !formData.region) {
          setError("Please fill in all required fields");
          setLoading(false);
          return;
        }

        result = await registerInvestor(
          formData.email,
          formData.password,
          formData.fullName,
          formData.role,
          formData.phoneNumber,
          formData.country,
          formData.region
        );
      }

      if (result.success) {
        router.push(
          "/login?message=Registration successful! Please sign in to continue."
        );
      } else {
        setError(
          result.error?.message ||
            result.error?.email?.[0] ||
            result.error?.password?.[0] ||
            "Registration failed. Please try again."
        );
      }
    } catch (error) {
      setError("An unexpected error occurred. Please try again.");
    }

    setLoading(false);
  };

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Logo positioned at top left */}
      <div className="fixed top-6 left-6 z-50 backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl max-w-sm text-center shadow-xl">
        <Image
          src="/logo/farmcred-07.png"
          alt="FarmCred Logo"
          width={160}
          height={60}
          className="h-16 w-auto object-contain"
          priority
        />
      </div>

      <div className="grid lg:grid-cols-2 min-h-screen">
        <div className="hidden lg:block relative">
          <div className="absolute inset-0">
            <Image
              src="/images/farmer-3.jpg"
              alt="FarmCred - Agricultural investment platform"
              fill
              className="object-cover"
              priority
            />
          </div>

          <div className="absolute inset-0 bg-[#eff3e4]/20"></div>

          <div className="absolute bottom-12 left-8 right-8 flex justify-center">
            <div className="backdrop-blur-md bg-white/10 border border-white/20 rounded-2xl p-6 max-w-sm text-center shadow-xl">
              <div className="space-y-4">
                <h1 className="text-xl font-bold text-white drop-shadow-lg font-[Plus Jakarta Sans]">
                  Join FarmCred
                </h1>
                <p className="text-white/90 font-[Inter] text-sm leading-relaxed drop-shadow-md">
                  Connect with farmers and investors. Build sustainable
                  agriculture together with trusted credit solutions.
                </p>
              </div>
            </div>
          </div>

          <div className="absolute bottom-6 left-8 right-8 text-center">
            <p className="text-white/90 font-[Inter] text-xs">
              © {year ?? ""} FarmCred. All rights reserved.{" "}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center px-6 py-8 sm:px-8 lg:px-12">
          <div className="mx-auto w-full max-w-sm">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-[#158f20] font-[Plus Jakarta Sans]">
                Create account
              </h2>
              <p className="mt-2 text-sm text-[#157148] font-[Inter]">
                {step === 1
                  ? "Get started with FarmCred today"
                  : "Complete your profile"}
              </p>
            </div>

            <Card className="border-[#D6DFBC] shadow-none">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-[#157148] font-[Inter]">
                  {step === 1 ? "Sign up" : `Complete ${formData.role} profile`}
                </CardTitle>
                <CardDescription className="text-sm font-[Inter] text-gray-600">
                  {step === 1
                    ? "Create your account in just a few steps"
                    : `Step ${step} of 2 - Additional information`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {error && (
                  <Alert
                    variant="destructive"
                    className="border-red-200 bg-red-50"
                  >
                    <AlertDescription className="font-[Inter] text-sm text-red-700">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

                {step === 1 ? (
                  // Step 1: Basic Information
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <Label
                        htmlFor="fullName"
                        className="text-sm font-medium text-[#157148] font-[Inter]"
                      >
                        Full name
                      </Label>
                      <Input
                        id="fullName"
                        name="fullName"
                        type="text"
                        required
                        value={formData.fullName}
                        onChange={handleChange}
                        placeholder="John Doe"
                        className="h-10 border-[#D6DFBC] focus:border-[#158f20] focus:ring-[#158f20] text-[#157148] font-[Inter] text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="email"
                        className="text-sm font-medium text-[#157148] font-[Inter]"
                      >
                        Email
                      </Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="john@example.com"
                        className="h-10 border-[#D6DFBC] focus:border-[#158f20] focus:ring-[#158f20] text-[#157148] font-[Inter] text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#157148] font-[Inter]">
                        I am a
                      </Label>
                      <Select
                        value={formData.role}
                        onValueChange={handleRoleChange}
                      >
                        <SelectTrigger className="h-10 border-[#D6DFBC] focus:border-[#158f20] focus:ring-[#158f20] text-[#157148] font-[Inter] text-sm">
                          <SelectValue placeholder="Select your role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            value="farmer"
                            className="font-[Inter] text-sm"
                          >
                            Farmer seeking credit
                          </SelectItem>
                          <SelectItem
                            value="investor"
                            className="font-[Inter] text-sm"
                          >
                            Investor
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="password"
                        className="text-sm font-medium text-[#157148] font-[Inter]"
                      >
                        Password
                      </Label>
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="new-password"
                        required
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="Create a strong password"
                        className="h-10 border-[#D6DFBC] focus:border-[#158f20] focus:ring-[#158f20] text-[#157148] font-[Inter] text-sm"
                      />
                    </div>

                    <Button
                      type="button"
                      onClick={handleContinue}
                      className="w-full h-11 bg-[#158f20] hover:bg-[#157148] text-white font-[Inter] font-medium text-sm mt-6"
                    >
                      Continue
                    </Button>
                  </div>
                ) : (
                  // Step 2: Additional Information
                  <form onSubmit={handleSubmit} className="space-y-5">
                    {formData.role === "farmer" ? (
                      <FarmerNextStep
                        formData={formData}
                        setFormData={setFormData}
                      />
                    ) : (
                      <InvestorNextStep
                        formData={formData}
                        setFormData={setFormData}
                      />
                    )}

                    <div className="flex space-x-3 pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        className="flex-1 h-11 border-[#D6DFBC] text-[#157148] hover:bg-[#f5f7f0] font-[Inter] font-medium text-sm"
                      >
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="flex-1 h-11 bg-[#158f20] hover:bg-[#157148] text-white font-[Inter] font-medium text-sm"
                      >
                        {loading && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        {loading ? "Creating account..." : "Create account"}
                      </Button>
                    </div>
                  </form>
                )}

                <div className="text-center pt-4">
                  <p className="text-sm text-[#157148] font-[Inter]">
                    Already have an account?{" "}
                    <Link
                      href="/login"
                      className="font-medium text-[#158f20] hover:text-[#157148] hover:underline"
                    >
                      Sign in
                    </Link>
                  </p>
                </div>
              </CardContent>
            </Card>

            <p className="text-center text-xs text-gray-500 font-[Inter] mt-6 leading-relaxed">
              By creating an account, you agree to our{" "}
              <Link href="#" className="text-[#158f20] hover:underline">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="#" className="text-[#158f20] hover:underline">
                Privacy Policy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
