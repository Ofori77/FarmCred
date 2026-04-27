import axios from 'axios';
import { TokenManager } from '@/lib/utils/tokenManager';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

// Request interceptor to add auth header
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

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Check if this is a 401 error and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = TokenManager.getRefreshToken();
        
        if (refreshToken && !TokenManager.isTokenExpired(refreshToken)) {
          // Try to refresh the token
          const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/token/refresh/`, {
            refresh: refreshToken
          });

          const { access, refresh: newRefresh } = response.data;
          
          // Store the new tokens
          TokenManager.setTokens(access, newRefresh || refreshToken);
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        } else {
          // Refresh token is invalid or expired, force logout
          TokenManager.clearAll();
          
          if (typeof window !== 'undefined') {
            // Dispatch custom event for logout
            window.dispatchEvent(new CustomEvent('forceLogout'));
          }
        }
      } catch (refreshError) {
        // Refresh failed, clear tokens and force logout
        console.error('Token refresh failed:', refreshError);
        TokenManager.clearAll();
        
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('forceLogout'));
        }
        
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;



// apiClient.interceptors.request.use(
//   (config) => {
//     // get the token from localStorage 
//     if (typeof window !== 'undefined') {
//       const token = process.env.NEXT_PUBLIC_TOKEN;
//       if (token) {
//         config.headers.Authorization = `Bearer ${token}`;
//       }
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// apiClient.interceptors.response.use(
//   (response) => response,
//   (error) => {
//     if (error.response?.status === 401) {

//         if (typeof window !== 'undefined') {
//         localStorage.removeItem('access_token');
//         window.location.href = '/login';
//       }
//     }
//     return Promise.reject(error);
//   }
// );