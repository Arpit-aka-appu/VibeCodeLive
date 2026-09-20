"use client";

import React from "react";
import { useParams } from "next/navigation";
import MeetingChat from "@/components/chat/MeetingChat";

const CommentsPage = () => {
  const params = useParams();
  const meetingId = typeof params?.id === "string" ? params.id : "";

  return (
    <div className="h-full w-full overflow-hidden">
      <MeetingChat meetingId={meetingId} />
    </div>
  );
};

export default CommentsPage;
