import React, { useState, useEffect } from "react";
import Split from "react-split";
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

  const [activeSideTab, setActiveSideTab] = useState("members");
  const unreadCount = useSelector((state) => state.chat?.unreadCount || 0);

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

  return (
    <Split
      className="flex h-full w-full overflow-hidden"
      sizes={[75, 25]}
      minSize={[400, 270]}
      expandToMin={false}
      gutterSize={10}
      gutterAlign="center"
      snapOffset={30}
      dragInterval={1}
      direction="horizontal"
      cursor="col-resize"
    >
      {/* Left Side: Code Workspace with Student Tabs */}
      <div className="h-full rounded-lg flex flex-col overflow-hidden">
        <div className="w-full h-9 bg-[#333333] rounded-t-lg border-x-[0.5px] border-t-[0.5px] border-zinc-600 text-zinc-400 flex items-center overflow-hidden">
          <StudentCodeTabs />
        </div>
        <div className="flex-1 min-h-0">
          {isStudentTabActive ? (
            <ReadOnlyCodeViewer studentId={activeTab} />
          ) : (
            <CodeEditor />
          )}
        </div>
      </div>

      {/* Right Side: Participant Snapshots List & Live Chat */}
      <div className="h-full rounded-lg flex flex-col overflow-hidden">
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
        <div className="flex-1 min-h-0">
          {activeSideTab === "members" ? (
            <Members />
          ) : (
            <MeetingChat meetingId={id} />
          )}
        </div>
      </div>
    </Split>
  );
};

export default Base;
