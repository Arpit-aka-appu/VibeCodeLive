import React from "react";
import type { Metadata } from "next";
import Controles from "@/components/Member/Controles";
import Navigation from "@/components/Member/Navigation";
import Profile_info_section from "@/components/Member/Profile_info_section";
import Admin_info_section from "@/components/Member/Admin_info_section";
import LeaveMeetingButton from "@/components/Member/LeaveMeetingButton";

export const metadata: Metadata = {
  title: "Meeting",
  description: "Layout for meeting admin pages",
};

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="w-screen h-screen flex flex-col p-2 bg-[#0f0f0f] overflow-hidden">
      {/* Top Header Bar */}
      <div className="w-full h-10 flex items-center justify-between px-1 shrink-0">

        {/* Left Side: Leave Meeting button immediately to the left of TV/admin section */}
        <div className="flex items-center gap-2.5">
          <LeaveMeetingButton />
          <Admin_info_section />
        </div>

        {/* Center: View Navigation */}
        <Navigation />

        {/* Right Side: Profile & Tools */}
        <div className="flex items-center">
          <Profile_info_section />
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full h-full overflow-hidden flex flex-col">{children}</div>
      {/* <div className="fixed bottom-3 right-2 rounded-lg border-[0.5px]  border-zinc-600 flex">
        <Controles />
      </div> */}
    </div>
  );
}
