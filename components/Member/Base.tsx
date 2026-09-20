"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { RiCodeSSlashLine } from "react-icons/ri";
import { FiUser } from "react-icons/fi";
import { VscComment } from "react-icons/vsc";
import { IoIosInformationCircleOutline } from "react-icons/io";
import { TbNotes } from "react-icons/tb";
import Nav_Link from "@/components/Member/Nav_Link";
import AdminLiveCodeViewer from "@/components/Member/AdminLiveCodeViewer";
import { useRouter, useParams } from "next/navigation";
import { connectSocket, joinMeeting } from "@/lib/socketService";
import { setMeetingId } from "@/store/meetingSlice";
import { useDispatch, useSelector } from "react-redux";

const Base = ({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) => {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch();
  const router = useRouter();

  const [splitRatio, setSplitRatio] = useState(55); // 55% instructor screen, 45% student workspace
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const unreadCount = useSelector(
    (state: { chat?: { unreadCount?: number } }) => state.chat?.unreadCount || 0
  );

  const viewMode = useSelector(
    (state: { meeting: { viewMode?: "left" | "both" | "right" } }) =>
      state.meeting?.viewMode || "both"
  );

  const leftNavArray = [
    {
      title: "Code",
      icon: <RiCodeSSlashLine className="text-green-500" />,
      className: "",
      href: `/meeting/member/${id}/user-code`,
    },
    {
      title: "Members",
      icon: <FiUser className="text-yellow-500" />,
      className: "",
      href: `/meeting/member/${id}/members`,
    },
    {
      title: "Live Chat",
      icon: <VscComment className="text-blue-500" />,
      className: "",
      href: `/meeting/member/${id}/comments`,
      badge: unreadCount,
    },
    {
      title: "Notes",
      icon: <TbNotes className="text-red-500" />,
      className: "",
      href: `/meeting/member/${id}/notes`,
    },
    {
      title: "About",
      icon: <IoIosInformationCircleOutline className="text-[#08b5a6]" />,
      className: "",
      href: `/meeting/member/${id}/about`,
    },
  ];

  // connect socket user effect
  useEffect(() => {
    const token = sessionStorage.getItem("socketAuth");

    if (!token) {
      router.replace("/meeting/join");
      return;
    }

    connectSocket(token);
    dispatch(setMeetingId(id));
    joinMeeting(id);
  }, [id, dispatch, router]);

  // Handle draggable divider between Left and Right in 'both' mode
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const relativeX = moveEvent.clientX - rect.left;
      const percentage = (relativeX / rect.width) * 100;
      // Clamp between 25% and 75%
      if (percentage >= 25 && percentage <= 75) {
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
      {/* Left Side: Instructor's Live Code & Console Output */}
      <div
        style={{
          display: viewMode === "right" ? "none" : "flex",
          width: viewMode === "left" ? "100%" : `${splitRatio}%`,
          height: "100%",
        }}
        className="rounded-lg flex flex-col overflow-hidden min-h-0"
      >
        <div className="w-full h-9 bg-[#333333] rounded-t-lg px-3 flex items-center justify-between border-x-[0.5px] border-t-[0.5px] border-zinc-600 text-zinc-300 select-none shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <RiCodeSSlashLine className="text-green-400 text-base shrink-0" />
            <span className="text-xs font-semibold text-zinc-100 truncate">
              Instructor Live Screen
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full shrink-0">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400"></span>
            </span>
            <span>Live Sync</span>
          </div>
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {left || <AdminLiveCodeViewer />}
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

      {/* Right Side: Student Workspace (User Code, Members, Comments, Notes, About) */}
      <div
        style={{
          display: viewMode === "left" ? "none" : "flex",
          width: viewMode === "right" ? "100%" : `calc(${100 - splitRatio}% - 10px)`,
          height: "100%",
        }}
        className="rounded-lg flex flex-col overflow-hidden min-h-0"
      >
        <div className="w-full h-9 shrink-0 bg-[#333333] rounded-t-lg p-1 flex items-center border-x-[0.5px] border-t-[0.5px] border-zinc-600 gap-1 overflow-x-scroll no-scrollbar text-zinc-400">
          {leftNavArray.map((link, index) => (
            <Nav_Link
              key={index}
              title={link.title}
              icon={link.icon}
              className={link.className}
              href={link.href}
              badge={link.badge}
            />
          ))}
        </div>
        <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
          {right}
        </div>
      </div>
    </div>
  );
};

export default Base;
