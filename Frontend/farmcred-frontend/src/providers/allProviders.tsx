"use client";

import { FC, ReactNode, useEffect } from "react";
import { TokenRefreshManager } from "@/lib/utils/tokenRefreshManager";
import { TokenManager } from "@/lib/utils/tokenManager";

interface ProvidersProps {
  children: ReactNode;
}

const Providers: FC<ProvidersProps> = ({ children }) => {
  useEffect(() => {
    // Start automatic token refresh if user is authenticated
    if (TokenManager.isAuthenticated()) {
      TokenRefreshManager.startAutoRefresh();
    }

    // Listen for authentication changes to start/stop auto refresh
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "access_token" || e.key === "refresh_token" || e.key === "user_info") {
        if (TokenManager.isAuthenticated()) {
          TokenRefreshManager.startAutoRefresh();
        } else {
          TokenRefreshManager.stopAutoRefresh();
        }
      }
    };

    // Listen for logout events to stop auto refresh
    const handleForceLogout = () => {
      TokenRefreshManager.stopAutoRefresh();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("forceLogout", handleForceLogout);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("forceLogout", handleForceLogout);
      TokenRefreshManager.stopAutoRefresh();
    };
  }, []);

  return <>{children}</>;
};

export default Providers;
