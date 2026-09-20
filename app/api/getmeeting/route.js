import mongoose from "mongoose";
import Meeting from "@/models/Meeting.js";
import { connectDB } from "@/lib/db.js";
import { NextResponse } from "next/server";
import User from "@/models/User.model.js";

export async function POST(req, res) {
  try {
    await connectDB();

    const { meetingId } = await req.json();

    if (!meetingId) {
      return new NextResponse(JSON.stringify({ error: "Meeting ID is required" }), { status: 400 });
    }

    let meeting = null;
    if (mongoose.isValidObjectId(meetingId)) {
      meeting = await Meeting.findById(meetingId);
    }
    if (!meeting) {
      meeting = await Meeting.findOne({ url: meetingId });
    }

    if (!meeting) {
      return new NextResponse(JSON.stringify({ error: "Meeting not found" }), { status: 404 });
    }

    const members = meeting.members?.length
      ? await User.find({ _id: { $in: meeting.members } }).select("name email _id")
      : [];

    const defaultCode = `// Instructor Live Workspace
// Real-time synchronization active

function main() {
  console.log("Welcome to ${meeting.name || 'TeachView Live'}!");
}

main();
`;

    const code = meeting.data?.code || defaultCode;
    const language = meeting.data?.language || "javascript";
    const output = meeting.data?.output || [
      {
        Data: `Welcome to ${meeting.name || "TeachView Live"}!`,
        time: new Date().toLocaleTimeString(),
        type: "success",
      },
    ];

    const meetingObj = meeting.toObject ? meeting.toObject() : meeting;
    meetingObj.code = code;
    meetingObj.language = language;
    meetingObj.output = output;

    return new NextResponse(
      JSON.stringify({ success: true, meeting: meetingObj, members, code, language, output }),
      { status: 200 }
    );
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
