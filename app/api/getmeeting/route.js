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

    return new NextResponse(JSON.stringify({ success: true, meeting, members }), { status: 200 });
  } catch (error) {
    return new NextResponse(JSON.stringify({ error: error.message }), { status: 500 });
  }
}
