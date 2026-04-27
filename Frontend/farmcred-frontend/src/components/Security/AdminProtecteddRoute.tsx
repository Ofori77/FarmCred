"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticatedAdmin } from "@/lib/services/authService";

interface AdminProtectedRouteProps {
  children: React.ReactNode;
}

export default function AdminProtectedRoute({
  children,
}: AdminProtectedRouteProps) {
  const router = useRouter();
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    const checkAuth = () => {
      try {
        const authenticated = isAuthenticatedAdmin();

        if (authenticated) {
          setIsAuthorized(true);
          setIsChecking(false);
        } else {
          setIsAuthorized(false);
          setIsChecking(false);
          router.replace("/admin-login");
          return;
        }
      } catch (error) {
        console.error("Admin authentication check failed:", error);
        setIsAuthorized(false);
        setIsChecking(false);
        router.replace("/admin-login");
      }
    };

    checkAuth();

    // Listen for storage changes to handle logout in other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "access_token" ||
        e.key === "refresh_token" ||
        e.key === "user_info"
      ) {
        checkAuth();
      }
    };

    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, [router]);

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#eff3e4]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#158f20] mx-auto"></div>
          <p className="mt-4 text-[#157148] font-medium">
            Verifying admin authentication...
          </p>
        </div>
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
}
