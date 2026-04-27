"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isAuthenticated } from "@/lib/services/authService";

export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);
    const [isAuthorized, setIsAuthorized] = useState(false);

    useEffect(() => {
      const checkAuth = () => {
        try {
          const authenticated = isAuthenticated();

          if (authenticated) {
            setIsAuthorized(true);
            setIsChecking(false);
          } else {
            setIsAuthorized(false);
            setIsChecking(false);
            router.replace("/login");
            return;
          }
        } catch (error) {
          console.error("Authentication check failed:", error);
          setIsAuthorized(false);
          setIsChecking(false);
          router.replace("/login");
        }
      };

      checkAuth();

      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === "access_token" || e.key === "refresh_token") {
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
            <p className="mt-4 text-[#157148] font-medium">Loading...</p>
          </div>
        </div>
      );
    }

    return isAuthorized ? <Component {...props} /> : null;
  };
}
