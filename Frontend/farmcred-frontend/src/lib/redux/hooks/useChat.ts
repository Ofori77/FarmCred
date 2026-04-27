import { useAppDispatch, useAppSelector } from '../store';
import { 
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
  clearChat
} from '../features/chatSlice';
import { Conversation, Message } from '@/lib/types/marketplacetypes';

export const useChat = () => {
  const dispatch = useAppDispatch();
  const {
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    unreadCount,
  } = useAppSelector((state) => state.chat);

  const setConversationsData = (conversationsData: Conversation[]) => {
    dispatch(setConversations(conversationsData));
  };

  const addNewConversation = (conversation: Conversation) => {
    dispatch(addConversation(conversation));
  };

  const setActive = (conversation: Conversation | null) => {
    dispatch(setActiveConversation(conversation));
  };

  const setConversationMessages = (conversationId: number, messagesData: Message[]) => {
    dispatch(setMessages({ conversationId, messages: messagesData }));
  };

  const addNewMessage = (conversationId: number, message: Message) => {
    dispatch(addMessage({ conversationId, message }));
  };

  const markMessageAsRead = (conversationId: number, messageId: number) => {
    dispatch(markAsRead({ conversationId, messageId }));
  };

  const markAllAsRead = (conversationId: number) => {
    dispatch(markConversationAsRead(conversationId));
  };

  const updateUnreadCount = (count: number) => {
    dispatch(setUnreadCount(count));
  };

  const setLoadingState = (isLoading: boolean) => {
    dispatch(setLoading(isLoading));
  };

  const setErrorState = (errorMessage: string | null) => {
    dispatch(setError(errorMessage));
  };

  const clearAllChat = () => {
    dispatch(clearChat());
  };

  // Helper functions
  const getMessagesForConversation = (conversationId: number): Message[] => {
    return messages[conversationId] || [];
  };

  const getActiveMessages = (): Message[] => {
    return activeConversation ? getMessagesForConversation(activeConversation.id) : [];
  };

  const hasUnreadMessages = (conversationId: number): boolean => {
    const conversationMessages = messages[conversationId] || [];
    return conversationMessages.some(msg => !msg.is_read);
  };

  const getUnreadMessagesCount = (conversationId: number): number => {
    const conversationMessages = messages[conversationId] || [];
    return conversationMessages.filter(msg => !msg.is_read).length;
  };

  const getLastMessage = (conversationId: number): Message | null => {
    const conversationMessages = messages[conversationId] || [];
    return conversationMessages.length > 0 ? conversationMessages[conversationMessages.length - 1] : null;
  };

  return {
    // Data
    conversations,
    activeConversation,
    messages,
    loading,
    error,
    unreadCount,
    
    // Actions
    setConversationsData,
    addNewConversation,
    setActive,
    setConversationMessages,
    addNewMessage,
    markMessageAsRead,
    markAllAsRead,
    updateUnreadCount,
    setLoadingState,
    setErrorState,
    clearAllChat,
    
    // Helpers
    getMessagesForConversation,
    getActiveMessages,
    hasUnreadMessages,
    getUnreadMessagesCount,
    getLastMessage,
  };
};
