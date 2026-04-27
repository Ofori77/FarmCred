"use client";

import { useState, useEffect } from 'react';
import { TokenManager } from '@/lib/utils/tokenManager';
import { TokenRefreshManager } from '@/lib/utils/tokenRefreshManager';

/**
 * Development component to display token status
 * Remove this in production or hide behind a feature flag
 */
export function TokenStatus() {
  const [tokenInfo, setTokenInfo] = useState({
    isAuthenticated: false,
    accessTokenValid: false,
    refreshTokenValid: false,
    timeToExpiry: 0,
    willExpireSoon: false,
  });

  const updateTokenInfo = () => {
    setTokenInfo({
      isAuthenticated: TokenManager.isAuthenticated(),
      accessTokenValid: TokenManager.isAccessTokenValid(),
      refreshTokenValid: TokenManager.isRefreshTokenValid(),
      timeToExpiry: TokenRefreshManager.getTimeUntilExpiry(),
      willExpireSoon: TokenRefreshManager.willExpireSoon(),
    });
  };

  useEffect(() => {
    updateTokenInfo();
    
    // Update every 30 seconds
    const interval = setInterval(updateTokenInfo, 30000);
    
    // Update when storage changes
    const handleStorageChange = () => updateTokenInfo();
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Only show in development
  if (process.env.NODE_ENV === 'production') {
    return null;
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-3 rounded-lg text-xs font-mono z-50 max-w-xs">
      <h4 className="font-bold mb-2">🔐 Token Status (Dev)</h4>
      <div className="space-y-1">
        <div className={`flex justify-between ${tokenInfo.isAuthenticated ? 'text-green-400' : 'text-red-400'}`}>
          <span>Authenticated:</span>
          <span>{tokenInfo.isAuthenticated ? '✅' : '❌'}</span>
        </div>
        <div className={`flex justify-between ${tokenInfo.accessTokenValid ? 'text-green-400' : 'text-orange-400'}`}>
          <span>Access Token:</span>
          <span>{tokenInfo.accessTokenValid ? '✅' : '⚠️'}</span>
        </div>
        <div className={`flex justify-between ${tokenInfo.refreshTokenValid ? 'text-green-400' : 'text-red-400'}`}>
          <span>Refresh Token:</span>
          <span>{tokenInfo.refreshTokenValid ? '✅' : '❌'}</span>
        </div>
        <div className={`flex justify-between ${tokenInfo.willExpireSoon ? 'text-orange-400' : 'text-green-400'}`}>
          <span>Expires in:</span>
          <span>{formatTime(tokenInfo.timeToExpiry)}</span>
        </div>
        <button
          onClick={() => TokenRefreshManager.refreshToken()}
          className="w-full mt-2 bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded text-xs"
        >
          Manual Refresh
        </button>
      </div>
    </div>
  );
}
