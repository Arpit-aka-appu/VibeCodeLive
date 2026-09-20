"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import {
  LuSend,
  LuLoader,
  LuArrowDown,
  LuCrown,
  LuMessageSquare,
} from "react-icons/lu";
import {
  setMessages,
  addChatMessage,
  setChatOpen,
  resetUnreadCount,
  type ChatMessage,
  type ChatState,
} from "@/store/chatSlice";
import { fetchChatMessagesApi, sendChatMessageApi } from "@/lib/meetingApi";
import { emitChatMessage } from "@/lib/socketService";
import type { MeetingState } from "@/store/types";

interface MeetingChatProps {
  meetingId: string;
  className?: string;
}

interface RootStoreState {
  chat: ChatState;
  meeting: MeetingState;
  user: {
    user: {
      _id?: string;
      id?: string;
      name?: string;
      role?: string;
    } | null;
  };
}

export default function MeetingChat({ meetingId, className = "" }: MeetingChatProps) {
  const dispatch = useDispatch();

  const messages = useSelector((state: RootStoreState) => state.chat.messages);
  const currentUser = useSelector(
    (state: RootStoreState) => state.meeting.currentUser
  );
  const authUser = useSelector((state: RootStoreState) => state.user.user);

  const currentUserId = currentUser?.id || authUser?._id || authUser?.id || "";

  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);

  // Track if user is near bottom and how many new messages arrived while scrolled up
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const isAtBottomRef = useRef(true);

  // Keep ref in sync
  useEffect(() => {
    isAtBottomRef.current = isAtBottom;
  }, [isAtBottom]);

  // Mark chat as open and reset unread count when chat component is mounted
  useEffect(() => {
    dispatch(setChatOpen(true));
    dispatch(resetUnreadCount());

    return () => {
      dispatch(setChatOpen(false));
    };
  }, [dispatch]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    messagesEndRef.current?.scrollIntoView({ behavior });
    setIsAtBottom(true);
    setUnreadBelowCount(0);
  }, []);

  // Fetch initial chat history on mount
  useEffect(() => {
    let isMounted = true;

    async function loadHistory() {
      if (!meetingId) return;
      setIsLoadingHistory(true);
      try {
        const res = await fetchChatMessagesApi(meetingId, 50);
        if (isMounted && res?.success && Array.isArray(res.messages)) {
          dispatch(setMessages(res.messages));
          // Instant scroll to bottom after initial load
          setTimeout(() => {
            if (isMounted) scrollToBottom("auto");
          }, 50);
        }
      } catch (err) {
        console.warn("Failed to load chat history:", err);
      } finally {
        if (isMounted) setIsLoadingHistory(false);
      }
    }

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [meetingId, dispatch, scrollToBottom]);

  // Handle auto-scroll on new message arrivals
  const prevMessagesLengthRef = useRef(messages.length);
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    prevMessagesLengthRef.current = messages.length;

    if (!isNewMessage) return;

    const lastMessage = messages[messages.length - 1];
    const isSentByMe = lastMessage?.senderId === currentUserId;

    // If sent by me, always scroll to bottom immediately
    if (isSentByMe) {
      scrollToBottom("smooth");
      return;
    }

    // If already near bottom, smoothly scroll down
    if (isAtBottomRef.current) {
      scrollToBottom("smooth");
    } else {
      // User is reviewing earlier messages; increment unread below counter
      setUnreadBelowCount((prev) => prev + 1);
    }
  }, [messages, currentUserId, scrollToBottom]);

  // Detect scroll position to check if user is near bottom
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const threshold = 80; // px
    const nearBottom = scrollHeight - scrollTop - clientHeight <= threshold;

    setIsAtBottom(nearBottom);
    if (nearBottom) {
      setUnreadBelowCount(0);
    }
  };

  const handleSendMessage = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setSendError(null);

    try {
      // 1. Persist message in MongoDB via Next.js backend
      const res = await sendChatMessageApi(meetingId, trimmed);
      if (!res?.success || !res?.chatMessage) {
        throw new Error(res?.message || "Failed to persist chat message");
      }

      const savedMessage: ChatMessage = res.chatMessage;

      // 2. Broadcast message to all meeting participants via Socket.IO
      try {
        await emitChatMessage(meetingId, trimmed, savedMessage);
      } catch (socketErr) {
        console.warn("Socket broadcast warning:", socketErr);
      }

      // 3. Immediately add message to local Redux state (deduplicated by _id)
      dispatch(addChatMessage({ ...savedMessage, currentUserId }));

      // Clear input and scroll down
      setInputValue("");
      scrollToBottom("smooth");
    } catch (err: unknown) {
      console.error("Failed to send message:", err);
      const errMsg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "Failed to send message. Please try again.";
      setSendError(errMsg);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (dateInput: string | Date | undefined) => {
    if (!dateInput) return "";
    try {
      const d = new Date(dateInput);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <div
      className={`h-full w-full flex flex-col bg-[#1e1e1e] border-x-[0.5px] border-b-[0.5px] border-zinc-700/80 rounded-b-lg overflow-hidden text-zinc-200 relative ${className}`}
    >
      {/* Messages Scroll Area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 relative text-xs"
      >
        {isLoadingHistory ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 gap-2 py-10">
            <LuLoader className="animate-spin text-xl text-blue-400" />
            <span className="text-xs">Loading classroom chat...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-zinc-400 text-center px-4 py-12 select-none">
            <div className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center text-zinc-400 mb-2">
              <LuMessageSquare className="text-lg" />
            </div>
            <p className="font-semibold text-zinc-300 text-xs">No messages yet.</p>
            <p className="text-[11px] text-zinc-400 mt-1 max-w-[200px] leading-relaxed">
              Ask a question, discuss code, or share insights with the class.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUserId;
            const isTeacher = msg.senderRole === "teacher" || msg.senderRole === "admin";

            return (
              <div
                key={msg._id || index}
                className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}
              >
                {/* Sender Info & Role Badge */}
                <div
                  className={`flex items-center gap-1.5 mb-1 px-1 text-[11px] ${
                    isMe ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <span className="font-semibold text-zinc-300">
                    {isMe ? "You" : msg.senderName}
                  </span>

                  {isTeacher && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 leading-none">
                      <LuCrown className="text-[10px]" />
                      <span>Teacher</span>
                    </span>
                  )}

                  {!isTeacher && !isMe && (
                    <span className="text-[10px] text-zinc-400 font-medium">
                      Student
                    </span>
                  )}

                  <span className="text-[10px] text-zinc-400">
                    {formatTime(msg.createdAt)}
                  </span>
                </div>

                {/* Message Bubble */}
                <div
                  className={`max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed break-words whitespace-pre-wrap ${
                    isMe
                      ? "bg-blue-600/20 text-blue-100 border border-blue-500/30 rounded-tr-none"
                      : isTeacher
                      ? "bg-amber-950/20 text-zinc-100 border border-amber-600/30 rounded-tl-none"
                      : "bg-zinc-800/80 text-zinc-200 border border-zinc-700/60 rounded-tl-none"
                  }`}
                >
                  {msg.message}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* "New Messages Below" Floating Pill */}
      {unreadBelowCount > 0 && (
        <button
          type="button"
          onClick={() => scrollToBottom("smooth")}
          className="absolute bottom-16 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg transition-all cursor-pointer z-10 animate-bounce"
        >
          <LuArrowDown className="text-xs" />
          <span>
            {unreadBelowCount} new {unreadBelowCount === 1 ? "message" : "messages"}
          </span>
        </button>
      )}

      {/* Error notification if send fails */}
      {sendError && (
        <div className="px-3 py-1.5 bg-red-950/80 border-t border-red-800 text-red-200 text-[11px] flex items-center justify-between">
          <span className="truncate">{sendError}</span>
          <button
            onClick={() => setSendError(null)}
            className="text-red-400 hover:text-red-200 ml-2 font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Message Composer */}
      <div className="p-2 border-t border-zinc-700/80 bg-[#181818] shrink-0">
        <div className="flex items-end gap-1.5 bg-zinc-800/90 border border-zinc-700/80 rounded-lg p-1.5 focus-within:border-blue-500/60 transition">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message or ask a doubt... (Enter to send)"
            rows={1}
            maxLength={1000}
            className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-400 resize-none outline-none max-h-24 px-1 py-0.5 leading-relaxed"
          />

          <button
            type="button"
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isSending}
            className="flex items-center justify-center w-7 h-7 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white transition cursor-pointer shrink-0 disabled:cursor-not-allowed"
            title="Send message (Enter)"
          >
            {isSending ? (
              <LuLoader className="animate-spin text-xs" />
            ) : (
              <LuSend className="text-xs" />
            )}
          </button>
        </div>
        <div className="flex items-center justify-between px-1 mt-1 text-[10px] text-zinc-400 select-none">
          <span>Shift + Enter for new line</span>
          <span>{inputValue.length}/1000</span>
        </div>
      </div>
    </div>
  );
}
