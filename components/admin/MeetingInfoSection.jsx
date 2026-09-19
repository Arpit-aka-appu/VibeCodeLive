"use client";
import React, { useState, useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "next/navigation";
import {
  HiOutlineAcademicCap,
  HiOutlineUserGroup,
  HiOutlineClock,
  HiOutlineClipboardCopy,
  HiCheck,
} from "react-icons/hi";
import { LuCrown } from "react-icons/lu";
import { fetchMeetingDetails } from "@/lib/meetingApi";
import { parseTokenPayload } from "@/lib/socketService";
import { setMeetingInfo } from "@/store/meetingSlice";

const MeetingInfoSection = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const urlParamId = (params?.id) || "";

  const meetingId = useSelector((state) => state.meeting.meetingId);
  const meetingInfo = useSelector((state) => state.meeting.meetingInfo);
  const adminName = useSelector(
    (state) => state.meeting.adminName || state.meeting.meetingInfo?.adminName
  );
  const participantIds = useSelector(
    (state) => state.meeting.participants.allIds || []
  );
  const connectionStatus = useSelector(
    (state) => state.meeting.connectionStatus
  );

  const [copied, setCopied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Target ID for meeting lookup (either from redux state or URL param)
  const targetMeetingId = meetingId || urlParamId;

  // Sync meeting details on mount
  useEffect(() => {
    if (!targetMeetingId) return;

    // Check token payload first for instant hydration
    if (typeof window !== "undefined") {
      const token = sessionStorage.getItem("socketAuth");
      if (token) {
        const payload = parseTokenPayload(token);
        if (payload?.meetingName || payload?.meetingUrl) {
          dispatch(
            setMeetingInfo({
              name: payload.meetingName,
              adminName: payload.adminName,
              url: payload.meetingUrl,
            })
          );
        }
      }
    }

    // Fetch full document from backend
    fetchMeetingDetails(targetMeetingId);
  }, [targetMeetingId, dispatch]);

  // Meeting duration timer
  useEffect(() => {
    // Determine start timestamp
    let startTime = Date.now();
    if (meetingInfo?.createdAt) {
      const createdTime = new Date(meetingInfo.createdAt).getTime();
      // If created within the last 24 hours, use created time; otherwise use session start
      if (!isNaN(createdTime) && Date.now() - createdTime < 24 * 60 * 60 * 1000) {
        startTime = createdTime;
      }
    }

    const updateTimer = () => {
      const diff = Math.max(0, Math.floor((Date.now() - startTime) / 1000));
      setElapsedSeconds(diff);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [meetingInfo?.createdAt]);

  // Format seconds into HH:MM:SS or MM:SS
  const formattedDuration = useMemo(() => {
    const hours = Math.floor(elapsedSeconds / 3600);
    const minutes = Math.floor((elapsedSeconds % 3600) / 60);
    const seconds = elapsedSeconds % 60;

    const pad = (num) => String(num).padStart(2, "0");
    if (hours > 0) {
      return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
    }
    return `${pad(minutes)}:${pad(seconds)}`;
  }, [elapsedSeconds]);

  // Resolved values
  const meetingName =
    meetingInfo?.name ||
    (targetMeetingId ? `Classroom (${targetMeetingId.slice(0, 12)}...)` : "Live Classroom");

  const roomCode = meetingInfo?.url || targetMeetingId || "";
  const hostDisplayName = adminName || "Instructor";
  const isLive = connectionStatus === "connected";
  const totalMembers = participantIds.length;

  const handleCopyLink = async () => {
    if (!roomCode) return;
    try {
      const inviteUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/meeting/join?code=${roomCode}`
          : roomCode;
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn("Failed to copy link:", err);
    }
  };

  return (
    <div className="w-full mb-3 rounded-lg bg-gradient-to-b from-[#2e2e2e] to-[#252525] border border-zinc-700/60 p-3 shadow-md select-none transition-all duration-200">
      {/* Top Header: Meeting Name & Live Status */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="h-7 w-7 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <HiOutlineAcademicCap className="text-base" />
          </div>
          <div className="min-w-0">
            <h3
              className="text-xs font-bold text-zinc-100 truncate tracking-wide"
              title={meetingName}
            >
              {meetingName}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
              <LuCrown className="w-2.5 h-2.5 text-amber-400" />
              <span className="truncate">Host: {hostDisplayName}</span>
            </div>
          </div>
        </div>

        {/* Live Badge */}
        <div
          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-semibold tracking-wider uppercase shrink-0 ${
            isLive
              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
              : "bg-amber-500/10 text-amber-400 border-amber-500/30"
          }`}
        >
          <span className="relative flex h-1.5 w-1.5">
            {isLive && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span
              className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                isLive ? "bg-emerald-400" : "bg-amber-400"
              }`}
            ></span>
          </span>
          <span>{isLive ? "Live" : "Connecting"}</span>
        </div>
      </div>

      {/* Stats Cards Row */}
      <div className="grid grid-cols-2 gap-2 mb-2.5">
        {/* Total Members Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#1f1f1f] border border-zinc-700/50">
          <div className="p-1 rounded bg-blue-500/10 text-blue-400">
            <HiOutlineUserGroup className="text-sm" />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] text-zinc-400 uppercase tracking-wider">
              Total Members
            </span>
            <span className="text-xs font-bold text-zinc-100">
              {totalMembers} {totalMembers === 1 ? "Member" : "Members"}
            </span>
          </div>
        </div>

        {/* Session Duration Pill */}
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-[#1f1f1f] border border-zinc-700/50">
          <div className="p-1 rounded bg-emerald-500/10 text-emerald-400">
            <HiOutlineClock className="text-sm" />
          </div>
          <div className="min-w-0">
            <span className="block text-[9px] text-zinc-400 uppercase tracking-wider">
              Duration
            </span>
            <span className="text-xs font-mono font-bold text-emerald-400">
              {formattedDuration}
            </span>
          </div>
        </div>
      </div>

      {/* Room Code & Copy Link Bar */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-[#1c1c1c] border border-zinc-800 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-[10px] text-zinc-400 uppercase font-semibold">Code:</span>
          <span
            className="font-mono text-[11px] text-zinc-200 truncate select-all"
            title={roomCode}
          >
            {roomCode}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopyLink}
          className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all duration-150 shrink-0 ${
            copied
              ? "bg-emerald-600 text-white"
              : "bg-zinc-700/70 hover:bg-zinc-700 text-zinc-200 hover:text-white"
          }`}
          title="Copy meeting invite link to clipboard"
        >
          {copied ? (
            <>
              <HiCheck className="text-xs text-white" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <HiOutlineClipboardCopy className="text-xs" />
              <span>Copy Link</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default MeetingInfoSection;
