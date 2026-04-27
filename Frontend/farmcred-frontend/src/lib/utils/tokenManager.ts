/**
 * Token Manager utility for handling JWT tokens
 * Provides methods for token storage, retrieval, validation, and expiration checking
 */

export class TokenManager {
  private static ACCESS_TOKEN_KEY = 'access_token';
  private static REFRESH_TOKEN_KEY = 'refresh_token';
  private static USER_INFO_KEY = 'user_info';

  /**
   * Store both access and refresh tokens
   */
  static setTokens(accessToken: string, refreshToken: string): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.ACCESS_TOKEN_KEY, accessToken);
        localStorage.setItem(this.REFRESH_TOKEN_KEY, refreshToken);
      } catch (error) {
        console.error('Error storing tokens:', error);
      }
    }
  }

  /**
   * Get access token
   */
  static getAccessToken(): string | null {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(this.ACCESS_TOKEN_KEY);
      } catch (error) {
        console.error('Error retrieving access token:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Get refresh token
   */
  static getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem(this.REFRESH_TOKEN_KEY);
      } catch (error) {
        console.error('Error retrieving refresh token:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Store user information
   */
  static setUserInfo(userInfo: any): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));
      } catch (error) {
        console.error('Error storing user info:', error);
      }
    }
  }

  /**
   * Get user information
   */
  static getUserInfo(): any | null {
    if (typeof window !== 'undefined') {
      try {
        const userInfo = localStorage.getItem(this.USER_INFO_KEY);
        return userInfo ? JSON.parse(userInfo) : null;
      } catch (error) {
        console.error('Error retrieving user info:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Clear all tokens and user info
   */
  static clearAll(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(this.ACCESS_TOKEN_KEY);
        localStorage.removeItem(this.REFRESH_TOKEN_KEY);
        localStorage.removeItem(this.USER_INFO_KEY);
      } catch (error) {
        console.error('Error clearing tokens:', error);
      }
    }
  }

  /**
   * Check if a token is expired
   */
  static isTokenExpired(token: string | null): boolean {
    if (!token) return true;
    
    try {
      // JWT tokens have 3 parts separated by dots
      const parts = token.split('.');
      if (parts.length !== 3) return true;

      // Decode the payload (second part)
      const payload = JSON.parse(atob(parts[1]));
      
      // Check if exp claim exists
      if (!payload.exp) return true;
      
      // Compare expiration time with current time (exp is in seconds, Date.now() is in ms)
      const currentTime = Math.floor(Date.now() / 1000);
      const bufferTime = 60; // 1 minute buffer before expiration
      
      return payload.exp < (currentTime + bufferTime);
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  /**
   * Check if access token is valid (exists and not expired)
   */
  static isAccessTokenValid(): boolean {
    const token = this.getAccessToken();
    return !this.isTokenExpired(token);
  }

  /**
   * Check if refresh token is valid (exists and not expired)
   */
  static isRefreshTokenValid(): boolean {
    const token = this.getRefreshToken();
    return !this.isTokenExpired(token);
  }

  /**
   * Get time until token expires (in seconds)
   */
  static getTokenTimeToExpiry(token: string | null): number {
    if (!token) return 0;
    
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return 0;

      const payload = JSON.parse(atob(parts[1]));
      
      if (!payload.exp) return 0;
      
      const currentTime = Math.floor(Date.now() / 1000);
      return Math.max(0, payload.exp - currentTime);
    } catch (error) {
      console.error('Error getting token expiry time:', error);
      return 0;
    }
  }

  /**
   * Check if user is authenticated (has valid tokens and user info)
   */
  static isAuthenticated(): boolean {
    const hasUserInfo = !!this.getUserInfo();
    const hasValidAccessToken = this.isAccessTokenValid();
    const hasValidRefreshToken = this.isRefreshTokenValid();
    
    // User is authenticated if they have user info and either a valid access token or valid refresh token
    return hasUserInfo && (hasValidAccessToken || hasValidRefreshToken);
  }

  /**
   * Get user role from stored user info
   */
  static getUserRole(): string | null {
    const userInfo = this.getUserInfo();
    return userInfo?.role || null;
  }

  /**
   * Check if user is admin
   */
  static isAdmin(): boolean {
    const userInfo = this.getUserInfo();
    return !!(userInfo?.is_superuser || userInfo?.is_staff || userInfo?.role === "admin");
  }
}
