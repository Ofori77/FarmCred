import { TokenManager } from '@/lib/utils/tokenManager';
import axios from 'axios';

/**
 * Token refresh utility for automatically refreshing tokens before they expire
 */
export class TokenRefreshManager {
  private static refreshTimer: NodeJS.Timeout | null = null;
  private static isRefreshing = false;

  /**
   * Start automatic token refresh
   * This will check token expiry every 5 minutes and refresh if needed
   */
  static startAutoRefresh(): void {
    if (typeof window === 'undefined') return;

    this.stopAutoRefresh(); // Clear any existing timer

    this.refreshTimer = setInterval(() => {
      this.checkAndRefreshToken();
    }, 5 * 60 * 1000); // Check every 5 minutes

    // Also check immediately
    this.checkAndRefreshToken();
  }

  /**
   * Stop automatic token refresh
   */
  static stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Check if token needs refresh and refresh it if necessary
   */
  static async checkAndRefreshToken(): Promise<boolean> {
    if (this.isRefreshing) return false;

    try {
      const accessToken = TokenManager.getAccessToken();
      const refreshToken = TokenManager.getRefreshToken();

      // If no tokens, nothing to refresh
      if (!accessToken || !refreshToken) {
        return false;
      }

      // If access token is still valid (more than 5 minutes remaining), no need to refresh
      const timeToExpiry = TokenManager.getTokenTimeToExpiry(accessToken);
      if (timeToExpiry > 5 * 60) { // More than 5 minutes remaining
        return false;
      }

      // If refresh token is expired, can't refresh
      if (TokenManager.isTokenExpired(refreshToken)) {
        console.log('Refresh token expired, cannot refresh');
        TokenManager.clearAll();
        window.dispatchEvent(new CustomEvent('forceLogout'));
        return false;
      }

      this.isRefreshing = true;

      // Attempt to refresh the token
      const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/api/token/refresh/`, {
        refresh: refreshToken
      });

      const { access, refresh: newRefresh } = response.data;

      // Store the new tokens
      TokenManager.setTokens(access, newRefresh || refreshToken);

      console.log('Token refreshed successfully');
      return true;

    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // If refresh failed, clear tokens and force logout
      TokenManager.clearAll();
      
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('forceLogout'));
      }
      
      return false;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Manually refresh token
   */
  static async refreshToken(): Promise<boolean> {
    return this.checkAndRefreshToken();
  }

  /**
   * Get time until access token expires (in seconds)
   */
  static getTimeUntilExpiry(): number {
    const accessToken = TokenManager.getAccessToken();
    return TokenManager.getTokenTimeToExpiry(accessToken);
  }

  /**
   * Check if access token will expire soon (within next 5 minutes)
   */
  static willExpireSoon(): boolean {
    const timeToExpiry = this.getTimeUntilExpiry();
    return timeToExpiry < 5 * 60; // Less than 5 minutes
  }
}
