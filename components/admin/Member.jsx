"use client";
import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import UserCard from "./UserCard";
import MeetingInfoSection from "./MeetingInfoSection";
import { RiSearchLine } from "react-icons/ri";
import { HiOutlineUserGroup } from "react-icons/hi";

const Members = () => {
  const participantIds = useSelector(
    (state) => state.meeting.participants.allIds || []
  );
  const participantsById = useSelector(
    (state) => state.meeting.participants.byId || {}
  );
  const adminName = useSelector(
    (state) => state.meeting.adminName || state.meeting.meetingInfo?.adminName
  );
  const currentUserId = useSelector((state) => state.meeting.currentUser?.id);

  const [searchQuery, setSearchQuery] = useState("");

  const filteredParticipantIds = useMemo(() => {
    // Exclude host / teacher from the student monitoring cards
    const studentIds = participantIds.filter((id) => {
      const user = participantsById[id];
      if (!user) return false;
      if (user.isHost || user.role === "teacher") return false;
      if (currentUserId && id === currentUserId) return false;
      if (adminName && user.username && user.username.toLowerCase() === adminName.toLowerCase()) {
        return false;
      }
      return true;
    });

    if (!searchQuery.trim()) return studentIds;
    const q = searchQuery.toLowerCase().trim();
    return studentIds.filter((id) => {
      const user = participantsById[id];
      const name = user?.username || "";
      return name.toLowerCase().includes(q) || id.toLowerCase().includes(q);
    });
  }, [participantIds, participantsById, searchQuery, adminName, currentUserId]);

  return (
    <div className="h-full w-full flex flex-col p-2 bg-[#262626] rounded-b-lg border-x-[0.5px] border-b-[0.5px] border-zinc-600 overflow-hidden">
      {/* Scrollable Container */}
      <div className="flex-1 overflow-y-auto pr-0.5 custom-scrollbar">
        {/* Meeting Information Section (Name, Members, Duration, Code) */}
        <MeetingInfoSection />

        {/* Search Bar */}
        <div className="w-full mb-3 py-2 bg-[#333333] rounded-lg flex items-center px-2.5 gap-2 border border-zinc-700/40 transition-all duration-200 focus-within:ring-1 focus-within:ring-[#5C766D] focus-within:border-[#5C766D]">
          <RiSearchLine className="text-zinc-400 text-sm shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${filteredParticipantIds.length} students...`}
            className="flex-1 bg-transparent outline-none text-xs text-white placeholder-zinc-400"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="text-xs text-zinc-400 hover:text-zinc-200 px-1"
            >
              ×
            </button>
          )}
        </div>

        {/* Students List */}
        <div className="w-full flex flex-wrap gap-2 content-start pb-4">
          {filteredParticipantIds.length > 0 ? (
            filteredParticipantIds.map((id, index) => (
              <UserCard key={id || index} userId={id} />
            ))
          ) : (
            <div className="w-full py-8 flex flex-col items-center justify-center text-zinc-400 text-xs gap-1.5 bg-[#2a2a2a]/50 rounded-lg border border-dashed border-zinc-700">
              <HiOutlineUserGroup className="text-2xl text-zinc-500" />
              <span>
                {searchQuery
                  ? "No matching students found"
                  : "Waiting for students to join..."}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Members;
