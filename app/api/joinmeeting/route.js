import { connectDB } from "@/lib/db.js";
import Meeting from "@/models/Meeting.js";
import User from "@/models/User.model.js";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/getUserFromRequest";
import { ApiError } from "@/lib/errors";

export async function POST(req, res) {
  await connectDB();

  try {
    // 1. Read user token from cookies
    const decodedUser = await getUserFromRequest(req);

    const userId = decodedUser.userId;
    const { meetingId, password, formData } = await req.json();

    // 3. Find the user from DB
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({
        success: false,
        message: "User not found",
        status: 404,
      });
    }

    // 4. Find meeting based on meetingUrl
    const meeting = await Meeting.findById(meetingId);
    if (!meeting) {
      return NextResponse.json({
        success: false,
        message: "Meeting not found",
        status: 404,
      });
    }
    let meetingUrl;
    // meeting url for frontend
    if (meeting.url) {
      meetingUrl = `/meeting/member/${meeting.url}`;
    } else {
      meetingUrl = `/meeting/member/${meeting._id}`;
    }

    // 5. If user already exists in members, return success
    const alreadyMember = meeting.members.some(
      (m) => m.toString() === user._id.toString(),
    );

    const isHost = meeting.admin.toString() === user._id.toString();

    if (alreadyMember) {
      if (isHost) {
        // Admin is rejoining, allow it
        meetingUrl = `/meeting/admin/${meeting.url}`;
      }
    } else {
      await Meeting.findByIdAndUpdate(meetingId, {
        $addToSet: { members: user._id },
      });
    }

    const socketAuth = jwt.sign(
      {
        id: user._id,
        meetingId: meeting._id.toString(),
        meetingUrl: meeting.url,
        username: user.name,
        adminName: meeting.adminName,
        meetingName: meeting.name,
        isHost,
        role: isHost ? "teacher" : "student",
      },
      process.env.SOCKET_JWT_SECRET,
      { expiresIn: "60m" },
    );

    return NextResponse.json({
      success: true,
      socketAuth,
      message: "User added to meeting",
      status: 200,
      meetingUrl,
    });
  } catch (error) {
    console.error("Join meeting error:", error);

    // Handle your custom ApiError
    if (error instanceof ApiError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          code: error.code,
        },
        {
          status: error.statusCode,
        },
      );
    }

    // Handle unexpected errors
    return NextResponse.json(
      {
        success: false,
        message: "Something went wrong",
      },
      { status: 500 },
    );
  }
}
