import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BuyerProfile } from "@/lib/types/marketplacetypes";

interface UserState {
  profile: BuyerProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  preferences: {
    language: string;
    currency: string;
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
  };
}

const initialState: UserState = {
  profile: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  preferences: {
    language: 'en',
    currency: 'GHS',
    notifications: {
      email: true,
      sms: true,
      push: true,
    },
  },
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    setProfile: (state, action: PayloadAction<BuyerProfile>) => {
      state.profile = action.payload;
      state.isAuthenticated = true;
    },

    updateProfile: (state, action: PayloadAction<Partial<BuyerProfile>>) => {
      if (state.profile) {
        state.profile = { ...state.profile, ...action.payload };
      }
    },

    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
      if (!action.payload) {
        state.profile = null;
      }
    },

    setPreferences: (state, action: PayloadAction<Partial<UserState['preferences']>>) => {
      state.preferences = { ...state.preferences, ...action.payload };
    },

    updateNotificationSettings: (
      state, 
      action: PayloadAction<Partial<UserState['preferences']['notifications']>>
    ) => {
      state.preferences.notifications = { 
        ...state.preferences.notifications, 
        ...action.payload 
      };
      
      // Update profile if it exists
      if (state.profile) {
        state.profile.receive_email_notifications = state.preferences.notifications.email;
        state.profile.receive_sms_notifications = state.preferences.notifications.sms;
        // Note: push notifications might need to be added to BuyerProfile type
      }
    },

    logout: (state) => {
      state.profile = null;
      state.isAuthenticated = false;
      state.error = null;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
});

export const {
  setLoading,
  setError,
  setProfile,
  updateProfile,
  setAuthenticated,
  setPreferences,
  updateNotificationSettings,
  logout,
  clearError,
} = userSlice.actions;

export default userSlice.reducer;
