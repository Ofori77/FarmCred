import { useAppDispatch, useAppSelector } from '../store';
import { 
  setLoading,
  setError,
  setProfile,
  updateProfile,
  setAuthenticated,
  setPreferences,
  updateNotificationSettings,
  logout,
  clearError
} from '../features/userSlice';
import { BuyerProfile } from '@/lib/types/marketplacetypes';

export const useUser = () => {
  const dispatch = useAppDispatch();
  const {
    profile,
    isAuthenticated,
    loading,
    error,
    preferences,
  } = useAppSelector((state) => state.user);

  const setUserProfile = (profileData: BuyerProfile) => {
    dispatch(setProfile(profileData));
  };

  const updateUserProfile = (updates: Partial<BuyerProfile>) => {
    dispatch(updateProfile(updates));
  };

  const setLoadingState = (isLoading: boolean) => {
    dispatch(setLoading(isLoading));
  };

  const setErrorState = (errorMessage: string | null) => {
    dispatch(setError(errorMessage));
  };

  const setAuthenticationStatus = (status: boolean) => {
    dispatch(setAuthenticated(status));
  };

  const updateUserPreferences = (prefs: Partial<typeof preferences>) => {
    dispatch(setPreferences(prefs));
  };

  const updateNotifications = (notifications: Partial<typeof preferences.notifications>) => {
    dispatch(updateNotificationSettings(notifications));
  };

  const logoutUser = () => {
    dispatch(logout());
  };

  const clearUserError = () => {
    dispatch(clearError());
  };

  // Helper functions
  const getFullName = () => profile?.full_name || '';
  const getEmail = () => profile?.email || '';
  const getPhoneNumber = () => profile?.phone_number || '';
  const getLocation = () => `${profile?.region || ''}, ${profile?.country || ''}`.trim().replace(/^,\s*|,\s*$/g, '');

  return {
    // Data
    profile,
    isAuthenticated,
    loading,
    error,
    preferences,
    
    // Actions
    setUserProfile,
    updateUserProfile,
    setLoadingState,
    setErrorState,
    setAuthenticationStatus,
    updateUserPreferences,
    updateNotifications,
    logoutUser,
    clearUserError,
    
    // Helpers
    getFullName,
    getEmail,
    getPhoneNumber,
    getLocation,
  };
};
