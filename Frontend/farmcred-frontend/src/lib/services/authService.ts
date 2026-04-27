import axios from "axios";
import { TokenManager } from "@/lib/utils/tokenManager";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const apiClient = axios.create({
  baseURL: API_URL,
});

apiClient.interceptors.request.use(
  (config) => {
    const token = TokenManager.getAccessToken();
    if (token && !TokenManager.isTokenExpired(token)) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    const isTokenError =
      error.response?.status === 401 ||
      error.response?.data?.detail?.includes("token not valid") ||
      error.response?.data?.detail?.includes("Token is invalid") ||
      error.response?.data?.code === "token_not_valid";

    if (isTokenError && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = TokenManager.getRefreshToken();
      if (refreshToken && !TokenManager.isTokenExpired(refreshToken)) {
        try {
          const response = await axios.post(
            `${API_URL}/api/token/refresh/`,
            {
              refresh: refreshToken,
            }
          );

          const { access, refresh: newRefresh } = response.data;
          TokenManager.setTokens(access, newRefresh || refreshToken);

          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        } catch (refreshError: any) {
          console.error("Token refresh failed:", refreshError);

          const isRefreshTokenInvalid =
            refreshError.response?.data?.detail?.includes("token not valid") ||
            refreshError.response?.data?.code === "token_not_valid";

          if (isRefreshTokenInvalid) {
            console.log("Refresh token is invalid, forcing logout");
            forceLogout();
          }

          return Promise.reject(refreshError);
        }
      } else {
        console.log("No valid refresh token available, forcing logout");
        forceLogout();
      }
    }

    if (isTokenError && originalRequest._retry) {
      console.log("Token still invalid after refresh attempt, forcing logout");
      forceLogout();
    }

    return Promise.reject(error);
  }
);

const forceLogout = () => {
  console.log("Forcing logout due to invalid token");
  logout();

  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
};

const forceAdminLogout = () => {
  console.log("Forcing admin logout due to invalid token");
  logout();

  if (typeof window !== "undefined") {
    window.location.href = "/admin-login";
  }
};

// Regular login function
export const loginAndStoreToken = async (email: string, password: string) => {
  try {
    const response = await axios.post(`${API_URL}/api/account/login/`, {
      email,
      password,
    });

    const { access, refresh, user } = response.data;

    TokenManager.setTokens(access, refresh);
    TokenManager.setUserInfo(user);

    console.log("Logged in! Token stored.");
    return {
      success: true,
      data: response.data,
      userRole: user?.role,
    };
  } catch (error: any) {
    console.error("Login failed:", error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

// Admin login function
export const adminLoginAndStoreToken = async (email: string, password: string) => {
  try {
    const response = await axios.post(`${API_URL}/api/account/login/`, {
      email,
      password,
    });

    const { access, refresh, user } = response.data;

    // Check if user is admin - updated to check role field
    const isAdmin = user?.is_superuser || user?.is_staff || user?.role === "admin";
    
    if (!isAdmin) {
      console.log("Admin check failed - user is not admin");
      return { 
        success: false, 
        error: { message: "Unauthorized: Admin access required" }
      };
    }

    TokenManager.setTokens(access, refresh);
    TokenManager.setUserInfo(user);

    console.log("Admin logged in! Token stored.");
    return {
      success: true,
      data: response.data,
      userRole: "admin",
      isAdmin: true,
    };
  } catch (error: any) {
    console.error("Admin login failed:", error.response?.data || error.message);
    return { success: false, error: error.response?.data || error.message };
  }
};

export const registerFarmer = async (
  email: string,
  password: string,
  fullName: string,
  role: string = "farmer",
  phoneNumber: string,
  country: string,
  region: string,
  dob: string,
  nationalID: string,
  homeAddress: string,
  produce:string[],
) => {
  try {
    const response = await axios.post(`${API_URL}/api/account/register/`, {
      email,
      password,
      full_name: fullName,
      role: role,
      phone_number: phoneNumber,
      country: country,
      region: region,
      dob: dob,
      national_id: nationalID,
      home_address: homeAddress,
      produce: produce
    });

    console.log("Registration successful!");
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error(
      "Registration failed:",
      error.response?.data || error.message
    );
    return { success: false, error: error.response?.data || error.message };
  }
};

export const registerInvestor = async (
  email: string,
  password: string,
  fullName: string,
  role: string = "investor",
  phoneNumber: string,
  country: string,
  region: string
) => {
  try {
    const response = await axios.post(`${API_URL}/api/account/register/`, {
      email,
      password,
      full_name: fullName,
      role: role,
      phone_number: phoneNumber,
      country: country,
      region: region,
    });

    console.log("Registration successful!");
    return { success: true, data: response.data };
  } catch (error: any) {
    console.error(
      "Registration failed:",
      error.response?.data || error.message
    );
    return { success: false, error: error.response?.data || error.message };
  }
};

export const logout = async () => {
  try {
    const refreshToken = TokenManager.getRefreshToken();
    
    // Call backend logout to blacklist the token if available
    if (refreshToken) {
      await axios.post(`${API_URL}/api/account/logout/`, {
        refresh_token: refreshToken
      });
    }
  } catch (error) {
    console.error('Backend logout error:', error);
    // Continue with local logout even if backend call fails
  } finally {
    // Always clear local tokens
    TokenManager.clearAll();
    console.log("Logged out successfully");
  }
};

export const getAccessToken = () => {
  return TokenManager.getAccessToken();
};

export const getRefreshToken = () => {
  return TokenManager.getRefreshToken();
};

export const getUserInfo = () => {
  return TokenManager.getUserInfo();
};

export const getUserRole = () => {
  return TokenManager.getUserRole();
};

export const isAuthenticated = () => {
  return TokenManager.isAuthenticated();
};

export const isAdmin = () => {
  return TokenManager.isAdmin();
};

export const isAuthenticatedAdmin = () => {
  return TokenManager.isAuthenticated() && TokenManager.isAdmin();
};

export { apiClient, forceLogout, forceAdminLogout };
