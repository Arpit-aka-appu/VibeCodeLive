"use client";

import React, { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { LuLogOut, LuTriangleAlert, LuLoader } from "react-icons/lu";
import { leaveMeetingApi } from "@/lib/meetingApi";
import { emitLeaveMeeting } from "@/lib/socketService";
import { resetMeeting } from "@/store/meetingSlice";

import type { MeetingState } from "@/store/types";

interface LeaveMeetingButtonProps {
  className?: string;
}

interface RootStoreState {
  meeting: MeetingState;
}

export default function LeaveMeetingButton({ className = "" }: LeaveMeetingButtonProps) {
  const router = useRouter();
  const dispatch = useDispatch();
  const params = useParams();

  const meetingIdFromState = useSelector(
    (state: RootStoreState) => state.meeting.meetingId || state.meeting.meetingInfo?.url
  );
  const targetMeetingId =
    meetingIdFromState || (params?.id as string) || "";

  const [isOpen, setIsOpen] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenDialog = () => {
    setErrorMessage(null);
    setIsOpen(true);
  };

  const handleCloseDialog = () => {
    if (isLeaving) return; // prevent closing while leave request is in progress
    setErrorMessage(null);
    setIsOpen(false);
  };

  const handleConfirmLeave = async () => {
    if (isLeaving) return; // prevent duplicate clicks
    setIsLeaving(true);
    setErrorMessage(null);

    try {
      // 1. Remove authenticated user from meeting membership in database
      const result = await leaveMeetingApi(targetMeetingId);

      if (!result?.success && !result?.alreadyLeft) {
        throw new Error(result?.message || "Failed to leave meeting. Please try again.");
      }

      // 2. Inform socket server and disconnect socket room
      try {
        await emitLeaveMeeting(targetMeetingId);
      } catch (socketErr) {
        console.warn("Socket leave emit warning:", socketErr);
      }

      // 3. Clean up local authentication and Redux meeting state
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("socketAuth");
      }
      dispatch(resetMeeting());

      // 4. Close dialog and redirect user to /meeting/join
      setIsOpen(false);
      router.replace("/meeting/join");
    } catch (err: unknown) {
      console.error("Leave meeting error:", err);
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message)
          : "An unexpected error occurred while leaving the meeting.";
      setErrorMessage(message);
      setIsLeaving(false);
    }
  };

  return (
    <>
      {/* Leave Meeting Header Button */}
      <button
        type="button"
        onClick={handleOpenDialog}
        className={`flex items-center gap-1.5 h-8 px-2.5 rounded-md bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border border-red-500/25 hover:border-red-500/40 text-xs font-semibold tracking-wide transition-all duration-150 cursor-pointer shadow-sm ${className}`}
        title="Leave Meeting"
      >
        <LuLogOut className="text-sm shrink-0" />
        <span className="hidden sm:inline">Leave</span>
      </button>

      {/* Confirmation Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={handleCloseDialog}
        >
          <div
            className="bg-[#1e1e1e] border border-zinc-700/80 rounded-xl shadow-2xl max-w-md w-full p-5 text-zinc-200 select-none animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header with Icon */}
            <div className="flex items-center gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                <LuTriangleAlert className="text-xl" />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-100">Leave Meeting?</h3>
                <p className="text-[11px] text-zinc-400">Classroom Session</p>
              </div>
            </div>

            {/* Description Text */}
            <p className="text-xs text-zinc-300 leading-relaxed mt-2">
              Are you sure you want to leave this meeting? You will need to join the meeting again to return.
            </p>

            {/* Error Notification inside Dialog */}
            {errorMessage && (
              <div className="mt-3.5 p-2.5 rounded-lg bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-start gap-2">
                <LuTriangleAlert className="text-red-400 text-base shrink-0 mt-0.5" />
                <span className="leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2.5 mt-5">
              <button
                type="button"
                onClick={handleCloseDialog}
                disabled={isLeaving}
                className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-semibold transition cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmLeave}
                disabled={isLeaving}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-semibold shadow-md transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLeaving ? (
                  <>
                    <LuLoader className="animate-spin text-sm" />
                    <span>Leaving...</span>
                  </>
                ) : (
                  <>
                    <LuLogOut className="text-sm" />
                    <span>Leave Meeting</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
