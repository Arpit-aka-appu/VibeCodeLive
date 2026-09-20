import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export interface ChatMessage {
  _id: string;
  meetingId: string;
  senderId: string;
  senderName: string;
  senderRole: "student" | "teacher" | "admin";
  message: string;
  createdAt: string | Date;
}

export interface ChatState {
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  hasMoreMessages: boolean;
  unreadCount: number;
  isChatOpen: boolean;
  error: string | null;
}

const initialState: ChatState = {
  messages: [],
  isLoadingMessages: false,
  isSendingMessage: false,
  hasMoreMessages: false,
  unreadCount: 0,
  isChatOpen: false,
  error: null,
};

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    setMessages(state, action: PayloadAction<ChatMessage[]>) {
      const unique = new Map<string, ChatMessage>();
      action.payload.forEach((msg) => {
        if (msg?._id) unique.set(msg._id, msg);
      });
      state.messages = Array.from(unique.values());
      state.isLoadingMessages = false;
      state.error = null;
    },

    prependMessages(state, action: PayloadAction<ChatMessage[]>) {
      const existingIds = new Set(state.messages.map((m) => m._id));
      const older = action.payload.filter((m) => !existingIds.has(m._id));
      state.messages = [...older, ...state.messages];
      state.isLoadingMessages = false;
    },

    addChatMessage(
      state,
      action: PayloadAction<ChatMessage & { currentUserId?: string }>
    ) {
      const { currentUserId, ...message } = action.payload;
      const alreadyExists = state.messages.some((m) => m._id === message._id);
      if (!alreadyExists) {
        state.messages.push(message);

        // Increment unread count only if chat is not open and sender is not current user
        if (!state.isChatOpen && currentUserId && message.senderId !== currentUserId) {
          state.unreadCount += 1;
        } else if (!state.isChatOpen && !currentUserId) {
          // Fallback if currentUserId is not provided
          state.unreadCount += 1;
        }
      }
    },

    setChatOpen(state, action: PayloadAction<boolean>) {
      state.isChatOpen = action.payload;
      if (action.payload) {
        state.unreadCount = 0;
      }
    },

    resetUnreadCount(state) {
      state.unreadCount = 0;
    },

    setIsLoadingMessages(state, action: PayloadAction<boolean>) {
      state.isLoadingMessages = action.payload;
    },

    setIsSendingMessage(state, action: PayloadAction<boolean>) {
      state.isSendingMessage = action.payload;
    },

    setHasMoreMessages(state, action: PayloadAction<boolean>) {
      state.hasMoreMessages = action.payload;
    },

    setChatError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },

    resetChat() {
      return initialState;
    },
  },
});

export const {
  setMessages,
  prependMessages,
  addChatMessage,
  setChatOpen,
  resetUnreadCount,
  setIsLoadingMessages,
  setIsSendingMessage,
  setHasMoreMessages,
  setChatError,
  resetChat,
} = chatSlice.actions;

export default chatSlice.reducer;
