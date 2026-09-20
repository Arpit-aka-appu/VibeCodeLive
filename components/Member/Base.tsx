"use client";
import Split from "react-split";
import { RiCodeSSlashLine } from "react-icons/ri";
import { FiUser } from "react-icons/fi";
import { VscComment } from "react-icons/vsc";
import { IoIosInformationCircleOutline } from "react-icons/io";
import { TbNotes } from "react-icons/tb";
import Nav_Link from "@/components/Member/Nav_Link";
import AdminLiveCodeViewer from "@/components/Member/AdminLiveCodeViewer";
import { useEffect } from "react";
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

  const unreadCount = useSelector(
    (state: { chat?: { unreadCount?: number } }) => state.chat?.unreadCount || 0
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

  const dispatch = useDispatch();
  const router = useRouter();

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

  return (
    <Split
      className="flex h-full w-full overflow-hidden"
      sizes={[55, 45]}
      minSize={[350, 300]}
      expandToMin={false}
      gutterSize={10}
      gutterAlign="center"
      snapOffset={30}
      dragInterval={1}
      direction="horizontal"
      cursor="col-resize"
    >
      {/* Left Side: Instructor's Live Code & Console Output */}
      <div className="h-full rounded-lg flex flex-col overflow-hidden">
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
        <div className="flex-1 min-h-0">{left || <AdminLiveCodeViewer />}</div>
      </div>

      {/* Right Side: Student Workspace (User Code, Members, Comments, Notes, About) */}
      <div className="rounded-lg flex flex-col overflow-hidden h-full">
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
        <div className="flex-1 min-h-0">{right}</div>
      </div>
    </Split>
  );
};

export default Base;
