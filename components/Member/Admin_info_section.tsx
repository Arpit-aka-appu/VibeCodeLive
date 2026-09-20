"use client";
import React, { useState, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams } from "next/navigation";
import { LuUserPen, LuCrown } from "react-icons/lu";
import { MdOutlineVolumeUp, MdOutlineVolumeOff } from "react-icons/md";
import { fetchMeetingDetails } from "@/lib/meetingApi";
import { parseTokenPayload } from "@/lib/socketService";
import { setAdminName } from "@/store/meetingSlice";

const Admin_info_section = () => {
  const dispatch = useDispatch();
  const params = useParams();
  const urlParamId = (params?.id as string) || "";

  const meetingId = useSelector((state: any) => state.meeting.meetingId);
  const adminNameFromState = useSelector(
    (state: any) => state.meeting.adminName || state.meeting.meetingInfo?.adminName
  );
  const connectionStatus = useSelector(
    (state: any) => state.meeting.connectionStatus
  );

  const [resolvedAdminName, setResolvedAdminName] = useState<string>(
    adminNameFromState || "Host"
  );
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Sync admin name from token or API if not yet in state
  useEffect(() => {
    if (adminNameFromState) {
      setResolvedAdminName(adminNameFromState);
      return;
    }

    if (typeof window !== "undefined") {
      const token = sessionStorage.getItem("socketAuth");
      if (token) {
        const payload = parseTokenPayload(token);
        if (payload?.adminName) {
          setResolvedAdminName(payload.adminName);
          dispatch(setAdminName(payload.adminName));
          return;
        }
      }
    }

    const targetId = meetingId || urlParamId;
    if (targetId) {
      fetchMeetingDetails(targetId).then((meeting) => {
        if (meeting?.adminName) {
          setResolvedAdminName(meeting.adminName);
        }
      });
    }
  }, [adminNameFromState, meetingId, urlParamId, dispatch]);

  const toggleAudio = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsAudioMuted((prev) => !prev);
  };

  const isLive = connectionStatus === "connected";

  return (
    <div className="relative flex items-center h-8 gap-2.5 select-none">
      {/* Brand Icon / Logo Indicator */}
      <div
        className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 via-teal-600 to-zinc-800 flex items-center justify-center text-white font-black text-xs shadow-sm border border-emerald-400/30"
        title="TeachView Live Classroom"
      >
        <span>TV</span>
      </div>

      {/* Admin Info Pill */}
      <div
        className="relative flex h-full items-center gap-2 px-2.5 py-1 rounded-md bg-zinc-800/90 hover:bg-zinc-800 border border-zinc-700/60 text-zinc-200 transition-all duration-150 group cursor-default"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {/* Host Avatar Icon / Crown */}
        <div className="relative flex items-center justify-center text-yellow-400">
          <LuUserPen className="text-base" />
          <span className="absolute -top-1.5 -right-1 text-[9px] text-amber-300">
            <LuCrown className="w-2.5 h-2.5" />
          </span>
        </div>

        {/* Host Name */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-[140px]">
          <p
            className="text-xs font-semibold text-zinc-100 truncate tracking-wide"
            title={`Host: ${resolvedAdminName}`}
          >
            {resolvedAdminName}
          </p>
        </div>

        {/* Role Tag */}
        <span className="hidden sm:inline-flex text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
          Host
        </span>

        {/* Live Status Indicator */}
        <div
          className="flex items-center"
          title={isLive ? "Host is Live & Connected" : "Connecting to session..."}
        >
          {isLive ? (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          ) : (
            <span className="h-2 w-2 rounded-full bg-amber-500/80"></span>
          )}
        </div>

        {/* Audio / Volume Toggle */}
        <button
          type="button"
          onClick={toggleAudio}
          className={`p-1 rounded transition-colors ${
            isAudioMuted
              ? "text-red-400 hover:bg-red-950/40 hover:text-red-300"
              : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
          }`}
          title={isAudioMuted ? "Audio Muted (Click to unmute)" : "Audio Active (Click to mute)"}
        >
          {isAudioMuted ? (
            <MdOutlineVolumeOff className="text-sm" />
          ) : (
            <MdOutlineVolumeUp className="text-sm" />
          )}
        </button>

        {/* Hover Details Tooltip */}
        {showTooltip && (
          <div className="absolute top-full left-0 mt-1.5 z-50 w-52 p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 shadow-xl text-xs space-y-1.5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5">
              <span className="text-zinc-400 text-[11px]">Instructor / Host</span>
              <span className="text-[10px] text-emerald-400 font-medium">● Active</span>
            </div>
            <p className="font-semibold text-zinc-100 text-sm">{resolvedAdminName}</p>
            <div className="text-[11px] text-zinc-400 flex items-center justify-between pt-1">
              <span>Status:</span>
              <span className="text-zinc-200">{isLive ? "Connected" : "Connecting"}</span>
            </div>
            <div className="text-[11px] text-zinc-400 flex items-center justify-between">
              <span>Audio:</span>
              <span className={isAudioMuted ? "text-red-400" : "text-emerald-400"}>
                {isAudioMuted ? "Muted" : "Broadcasting"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin_info_section;
