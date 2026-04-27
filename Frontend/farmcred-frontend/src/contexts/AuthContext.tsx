"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getUserInfo,
  getUserRole,
  isAuthenticated,
  logout,
} from "@/lib/services/authService";
import { TokenManager } from "@/lib/utils/tokenManager";

interface AuthContextType {
  user: any;
  userRole: string | null;
  isAuth: boolean;
  loading: boolean;
  logout: () => void;
  refreshAuthState: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userRole: null,
  isAuth: false,
  loading: true,
  logout: () => {},
  refreshAuthState: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAuth, setIsAuth] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = () => {
    try {
      const authenticated = isAuthenticated();
      const userInfo = getUserInfo();
      const role = getUserRole();

      if (authenticated && userInfo) {
        setIsAuth(true);
        setUser(userInfo);
        setUserRole(role);
      } else {
        setIsAuth(false);
        setUser(null);
        setUserRole(null);

        const currentPath = window.location.pathname;
        // Define public routes that don't require authentication
        const publicRoutes = [
          "/",
          "/login",
          "/signup",
          "/about",
          "/marketplace",
          "/about/buyers",
          "/about/investors",
          "/about/readmore"
        ];
        
        const isPublicRoute = publicRoutes.some(route => 
          currentPath === route || currentPath.startsWith(route + "/")
        );

        if (!isPublicRoute) {
          console.log(
            "Not authenticated, redirecting to login from AuthContext"
          );
          router.replace("/login");
        }
      }
    } catch (error) {
      console.error("Error checking auth status:", error);
      setIsAuth(false);
      setUser(null);
      setUserRole(null);

      const currentPath = window.location.pathname;
      // Define public routes that don't require authentication
      const publicRoutes = [
        "/",
        "/login",
        "/signup",
        "/about",
        "/marketplace",
        "/about/buyers",
        "/about/investors",
        "/about/readmore"
      ];
      
      const isPublicRoute = publicRoutes.some(route => 
        currentPath === route || currentPath.startsWith(route + "/")
      );

      if (!isPublicRoute) {
        console.log("Auth check error, redirecting to login");
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    setIsAuth(false);
    setUser(null);
    setUserRole(null);
    router.replace("/login");
  };

  const refreshAuthState = () => {
    checkAuth();
  };

  useEffect(() => {
    checkAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (
        e.key === "access_token" ||
        e.key === "user_info" ||
        e.key === "refresh_token"
      ) {
        console.log("Storage changed, rechecking auth");
        checkAuth();
      }
    };

    const handleWindowFocus = () => {
      checkAuth();
    };

    // Listen for custom logout events
    const handleForceLogout = () => {
      console.log("Force logout event received");
      handleLogout();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleWindowFocus);
    window.addEventListener("forceLogout", handleForceLogout);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleWindowFocus);
      window.removeEventListener("forceLogout", handleForceLogout);
    };
  }, [router]);

  return (
    <AuthContext.Provider
      value={{ user, userRole, isAuth, loading, logout: handleLogout, refreshAuthState }}
    >
      {children}
    </AuthContext.Provider>
  );
};
