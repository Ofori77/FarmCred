import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { Conversation, Message } from "@/lib/types/marketplacetypes";

interface ChatState {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  messages: { [conversationId: number]: Message[] };
  loading: boolean;
  error: string | null;
  unreadCount: number;
}

const initialState: ChatState = {
  conversations: [],
  activeConversation: null,
  messages: {},
  loading: false,
  error: null,
  unreadCount: 0,
};

export const chatSlice = createSlice({
  name: 'chat',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    setConversations: (state, action: PayloadAction<Conversation[]>) => {
      state.conversations = action.payload;
    },

    addConversation: (state, action: PayloadAction<Conversation>) => {
      const exists = state.conversations.find(conv => conv.id === action.payload.id);
      if (!exists) {
        state.conversations.unshift(action.payload);
      }
    },

    setActiveConversation: (state, action: PayloadAction<Conversation | null>) => {
      state.activeConversation = action.payload;
    },

    setMessages: (state, action: PayloadAction<{ conversationId: number; messages: Message[] }>) => {
      state.messages[action.payload.conversationId] = action.payload.messages;
    },

    addMessage: (state, action: PayloadAction<{ conversationId: number; message: Message }>) => {
      if (!state.messages[action.payload.conversationId]) {
        state.messages[action.payload.conversationId] = [];
      }
      state.messages[action.payload.conversationId].push(action.payload.message);
      
      // Update unread count if message is not from current user
      if (!action.payload.message.is_read) {
        state.unreadCount += 1;
      }
    },

    markAsRead: (state, action: PayloadAction<{ conversationId: number; messageId: number }>) => {
      const messages = state.messages[action.payload.conversationId];
      if (messages) {
        const message = messages.find(msg => msg.id === action.payload.messageId);
        if (message && !message.is_read) {
          message.is_read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      }
    },

    markConversationAsRead: (state, action: PayloadAction<number>) => {
      const messages = state.messages[action.payload];
      if (messages) {
        messages.forEach(message => {
          if (!message.is_read) {
            message.is_read = true;
            state.unreadCount = Math.max(0, state.unreadCount - 1);
          }
        });
      }
    },

    setUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },

    clearChat: (state) => {
      state.conversations = [];
      state.activeConversation = null;
      state.messages = {};
      state.unreadCount = 0;
    },
  },
});

export const {
  setLoading,
  setError,
  setConversations,
  addConversation,
  setActiveConversation,
  setMessages,
  addMessage,
  markAsRead,
  markConversationAsRead,
  setUnreadCount,
  clearChat,
} = chatSlice.actions;

export default chatSlice.reducer;
