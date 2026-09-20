"use client";
import React, { useState, useMemo } from "react";
import { useSelector } from "react-redux";
import MeetingInfoSection from "@/components/admin/MeetingInfoSection";
import { RiSearchLine } from "react-icons/ri";
import { HiOutlineUserGroup, HiOutlineUser } from "react-icons/hi";
import { LuCrown } from "react-icons/lu";

const MembersPage = () => {
  const participantIds = useSelector(
    (state) => state.meeting.participants.allIds || []
  );
  const participantsById = useSelector(
    (state) => state.meeting.participants.byId || {}
  );
  const adminName = useSelector(
    (state) => state.meeting.adminName || state.meeting.meetingInfo?.adminName
  );

  const [searchQuery, setSearchQuery] = useState("");

  const filteredParticipants = useMemo(() => {
    const list = participantIds.map((id) => participantsById[id]).filter(Boolean);
    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter(
      (user) =>
        user.username?.toLowerCase().includes(q) ||
        user.id?.toLowerCase().includes(q)
    );
  }, [participantIds, participantsById, searchQuery]);

  return (
    <div className="h-full w-full flex flex-col p-2 bg-[#262626] rounded-b-lg border-x-[0.5px] border-b-[0.5px] border-zinc-600 overflow-hidden">
      <div className="flex-1 overflow-y-auto pr-0.5 custom-scrollbar">
        {/* Meeting Information Section */}
        <MeetingInfoSection />

        {/* Search Bar */}
        <div className="w-full mb-3 py-2 bg-[#333333] rounded-lg flex items-center px-2.5 gap-2 border border-zinc-700/40 transition-all duration-200 focus-within:ring-1 focus-within:ring-[#5C766D] focus-within:border-[#5C766D]">
          <RiSearchLine className="text-zinc-400 text-sm shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={`Search ${participantIds.length} members...`}
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

        {/* Members Grid */}
        <div className="w-full flex flex-wrap gap-2 content-start pb-4">
          {filteredParticipants.length > 0 ? (
            filteredParticipants.map((user) => {
              const isHost =
                adminName &&
                user.username &&
                user.username.toLowerCase() === adminName.toLowerCase();

              return (
                <div
                  key={user.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#2e2e2e] border border-zinc-700/60 min-w-[160px] flex-1 hover:border-zinc-500/60 transition-all duration-150"
                >
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#5C766D] to-zinc-700 flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm">
                    {user.username?.charAt(0) || "U"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1">
                      <p
                        className="text-xs font-semibold text-zinc-100 truncate"
                        title={user.username}
                      >
                        {user.username || "Anonymous"}
                      </p>
                      {isHost && (
                        <LuCrown
                          className="text-amber-400 w-3 h-3 shrink-0"
                          title="Classroom Host"
                        />
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {isHost ? "Host / Teacher" : "Student"}
                    </p>
                  </div>
                  <span
                    className="h-2 w-2 rounded-full bg-emerald-500 shrink-0"
                    title="Online"
                  ></span>
                </div>
              );
            })
          ) : (
            <div className="w-full py-8 flex flex-col items-center justify-center text-zinc-400 text-xs gap-1.5 bg-[#2a2a2a]/50 rounded-lg border border-dashed border-zinc-700">
              <HiOutlineUserGroup className="text-2xl text-zinc-500" />
              <span>
                {searchQuery
                  ? "No matching classroom members found"
                  : "Waiting for classroom members to join..."}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MembersPage;
