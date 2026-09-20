import { connectDB } from "@/lib/db.js";
import Meeting from "@/models/Meeting.js";
import User from "@/models/User.model.js";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/getUserFromRequest";
import { ApiError } from "@/lib/errors";

export async function POST(req) {
  await connectDB();

  try {
    // 1. Authenticate user from JWT token in authorization header
    const decodedUser = await getUserFromRequest(req);
    const userId = decodedUser.userId || decodedUser.id;

    const { meetingId } = await req.json();

    if (!meetingId) {
      return NextResponse.json(
        { success: false, message: "Meeting identifier is required" },
        { status: 400 }
      );
    }

    // 2. Locate user in DB
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // 3. Locate meeting by Mongo _id or by URL slug
    let meeting = null;
    if (mongoose.Types.ObjectId.isValid(meetingId)) {
      meeting = await Meeting.findById(meetingId);
    }
    if (!meeting) {
      meeting = await Meeting.findOne({ url: meetingId });
    }

    if (!meeting) {
      return NextResponse.json(
        { success: false, message: "Meeting not found" },
        { status: 404 }
      );
    }

    const isHost = meeting.admin.toString() === user._id.toString();

    // 4. Check if user is currently recorded in members
    const isMember = meeting.members.some(
      (m) => m.toString() === user._id.toString()
    );

    // If neither host nor member, user is already not part of this meeting
    if (!isHost && !isMember) {
      return NextResponse.json({
        success: true,
        message: "User is not a member of this meeting",
        alreadyLeft: true,
        isHost: false,
      });
    }

    // 5. Remove user from meeting members list
    await Meeting.findByIdAndUpdate(meeting._id, {
      $pull: { members: user._id },
    });

    return NextResponse.json({
      success: true,
      message: isHost
        ? "Host left the meeting successfully"
        : "Left meeting successfully",
      isHost,
    });
  } catch (error) {
    console.error("Leave meeting error:", error);

    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          code: error.code,
        },
        {
          status: error.statusCode,
        }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong while leaving the meeting",
      },
      { status: 500 }
    );
  }
}
