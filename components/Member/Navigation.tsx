"use client";

import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setViewMode } from "@/store/meetingSlice";
import { ViewMode } from "@/store/types";

interface NavigationProps {
  className?: string;
}

const Navigation = ({ className = "" }: NavigationProps) => {
  const dispatch = useDispatch();
  const viewMode = useSelector(
    (state: { meeting: { viewMode?: ViewMode } }) => state.meeting?.viewMode || "both"
  );

  const handleModeChange = (mode: ViewMode) => {
    dispatch(setViewMode(mode));
    if (typeof window !== "undefined") {
      setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
      setTimeout(() => window.dispatchEvent(new Event("resize")), 150);
    }
  };

  return (
    <div
      role="group"
      aria-label="Meeting workspace view mode"
      className={`w-60 h-7 border-[0.5px] border-zinc-500 rounded-md flex overflow-hidden select-none bg-[#1a1a1a] ${className}`}
    >
      {/* Left Mode Button */}
      <button
        type="button"
        aria-pressed={viewMode === "left"}
        title="Left: Expand left panel to full workspace"
        onClick={() => handleModeChange("left")}
        className={`border-r rounded-l-md w-20 border-zinc-500 text-xs font-medium flex justify-center items-center cursor-pointer transition-colors
          ${
            viewMode === "left"
              ? "bg-zinc-600 text-white font-semibold shadow-inner"
              : "text-zinc-400 hover:bg-[#2a2b2b] hover:text-zinc-200"
          }`}
      >
        Left
      </button>

      {/* Both Mode Button */}
      <button
        type="button"
        aria-pressed={viewMode === "both"}
        title="Both: Show both panels side by side"
        onClick={() => handleModeChange("both")}
        className={`border-r w-20 border-zinc-500 text-xs font-medium flex justify-center items-center cursor-pointer transition-colors
          ${
            viewMode === "both"
              ? "bg-zinc-600 text-white font-semibold shadow-inner"
              : "text-zinc-400 hover:bg-[#2a2b2b] hover:text-zinc-200"
          }`}
      >
        Both
      </button>

      {/* Right Mode Button */}
      <button
        type="button"
        aria-pressed={viewMode === "right"}
        title="Right: Expand right panel to full workspace"
        onClick={() => handleModeChange("right")}
        className={`rounded-r-md w-20 border-zinc-500 text-xs font-medium flex justify-center items-center cursor-pointer transition-colors
          ${
            viewMode === "right"
              ? "bg-zinc-600 text-white font-semibold shadow-inner"
              : "text-zinc-400 hover:bg-[#2a2b2b] hover:text-zinc-200"
          }`}
      >
        Right
      </button>
    </div>
  );
};

export default Navigation;
