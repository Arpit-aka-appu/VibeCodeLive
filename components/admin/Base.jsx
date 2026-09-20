import React, { useState, useEffect, useRef, useCallback } from "react";
import CodeEditor from "./CodeEditor";
import Members from "./Member";
import StudentCodeTabs from "./StudentCodeTabs";
import ReadOnlyCodeViewer from "./ReadOnlyCodeViewer";
import MeetingChat from "@/components/chat/MeetingChat";
import { useRouter, useParams } from "next/navigation";
import { useDispatch, useSelector } from "react-redux";
import { connectSocket, joinMeeting } from "@/lib/socketService";
import { setMeetingId, resetStudentCodeTabs } from "@/store/meetingSlice";
import { setChatOpen, resetUnreadCount } from "@/store/chatSlice";
import { FiUsers } from "react-icons/fi";
import { VscComment } from "react-icons/vsc";

const Base = () => {
  const { id } = useParams();
  const dispatch = useDispatch();
  const router = useRouter();

  const [splitRatio, setSplitRatio] = useState(75); // 75% code workspace, 25% members/chat
  const isDraggingRef = useRef(false);
  const containerRef = useRef(null);

  const [activeSideTab, setActiveSideTab] = useState("members");
  const unreadCount = useSelector((state) => state.chat?.unreadCount || 0);
  const viewMode = useSelector((state) => state.meeting?.viewMode || "both");

  const activeTab = useSelector(
    (state) => state.meeting.studentCodeTabs?.activeTab
  );
  const openTabs = useSelector(
    (state) => state.meeting.studentCodeTabs?.openTabs || []
  );

  const isStudentTabActive =
    activeTab && activeTab !== "host" && openTabs.includes(activeTab);

  // connect socket effect
  useEffect(() => {
    const token = sessionStorage.getItem("socketAuth");

    if (!token) {
      router.replace("/meeting/join");
      return;
    }

    connectSocket(token);
    dispatch(setMeetingId(id));
    joinMeeting(id);

    return () => {
      // Clear all student code tabs and snapshots on leaving the meeting
      dispatch(resetStudentCodeTabs());
    };
  }, [id, dispatch, router]);

  // Handle draggable divider between Left and Right in 'both' mode
  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = moveEvent.clientX - rect.left;
      const percentage = (relativeX / rect.width) * 100;
      // Clamp between 20% and 80%
      if (percentage >= 20 && percentage <= 80) {
        setSplitRatio(percentage);
      }
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
      window.dispatchEvent(new Event("resize"));
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex flex-row h-full w-full min-h-0 overflow-hidden relative"
    >
      {/* Left Side: Code Workspace with Student Tabs */}
      <div
        style={{
          display: viewMode === "right" ? "none" : "flex",
          width: viewMode === "left" ? "100%" : `${splitRatio}%`,
          height: "100%",
        }}
        className="rounded-lg flex flex-col overflow-hidden min-h-0"
      >
        <div className="w-full h-9 bg-[#333333] rounded-t-lg border-x-[0.5px] border-t-[0.5px] border-zinc-600 text-zinc-400 flex items-center overflow-hidden shrink-0">
          <StudentCodeTabs />
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {isStudentTabActive ? (
            <ReadOnlyCodeViewer studentId={activeTab} />
          ) : (
            <CodeEditor />
          )}
        </div>
      </div>

      {/* Splitter Gutter (Draggable divider in 'both' mode) */}
      <div
        style={{
          display: viewMode === "both" ? "flex" : "none",
        }}
        className="w-2.5 h-full cursor-col-resize items-center justify-center hover:bg-blue-500/20 active:bg-blue-500/40 transition-colors shrink-0 select-none group"
        onMouseDown={handleMouseDown}
        title="Drag to resize panels"
      >
        <div className="w-1 h-8 rounded-full bg-zinc-600 group-hover:bg-blue-400 transition-colors" />
      </div>

      {/* Right Side: Participant Snapshots List & Live Chat */}
      <div
        style={{
          display: viewMode === "left" ? "none" : "flex",
          width: viewMode === "right" ? "100%" : `calc(${100 - splitRatio}% - 10px)`,
          height: "100%",
        }}
        className="rounded-lg flex flex-col overflow-hidden min-h-0"
      >
        <div className="w-full h-9 bg-[#333333] rounded-t-lg px-2 flex items-center border-x-[0.5px] border-t-[0.5px] border-zinc-600 text-zinc-400 gap-1 select-none shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveSideTab("members");
              dispatch(setChatOpen(false));
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium cursor-pointer transition ${
              activeSideTab === "members"
                ? "bg-zinc-700/90 text-zinc-100 font-semibold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/40"
            }`}
          >
            <FiUsers className="text-xs" />
            <span>Members</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSideTab("chat");
              dispatch(setChatOpen(true));
              dispatch(resetUnreadCount());
            }}
            className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-medium cursor-pointer transition relative ${
              activeSideTab === "chat"
                ? "bg-zinc-700/90 text-zinc-100 font-semibold shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700/40"
            }`}
          >
            <VscComment className="text-xs" />
            <span>Chat</span>
            {unreadCount > 0 && activeSideTab !== "chat" && (
              <span className="flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-blue-500 text-[10px] font-bold text-white leading-none ml-1">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {activeSideTab === "members" ? (
            <Members />
          ) : (
            <MeetingChat meetingId={id} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Base;
