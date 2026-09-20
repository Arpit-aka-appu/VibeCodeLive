import { connectDB } from "@/lib/db.js";
import Meeting from "@/models/Meeting.js";
import User from "@/models/User.model.js";
import ChatMessage from "@/models/ChatMessage.js";
import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/getUserFromRequest";
import jwt from "jsonwebtoken";

// Helper to authenticate via standard accessToken or socketAuth token
async function authenticateRequest(req) {
  try {
    const decoded = getUserFromRequest(req);
    if (decoded) return decoded;
  } catch (err) {
    // Fallback: check x-socket-token or socketAuth header
    const socketToken =
      req.headers.get("x-socket-token") ||
      (req.headers.get("authorization")?.startsWith("Bearer ")
        ? req.headers.get("authorization").split(" ")[1]
        : null);

    if (socketToken && process.env.SOCKET_JWT_SECRET) {
      try {
        const decodedSocket = jwt.verify(
          socketToken,
          process.env.SOCKET_JWT_SECRET
        );
        if (decodedSocket) {
          return {
            userId: decodedSocket.id || decodedSocket.userId,
            username: decodedSocket.username,
            role: decodedSocket.role,
            isHost: decodedSocket.isHost,
            meetingId: decodedSocket.meetingId,
          };
        }
      } catch {
        // invalid socket token as well
      }
    }
    throw err;
  }
}

// GET /api/meeting/chat?meetingId=<id>&limit=50&before=<timestamp>
export async function GET(req) {
  await connectDB();

  try {
    const decoded = await authenticateRequest(req);
    const userId = decoded.userId || decoded.id;

    const { searchParams } = new URL(req.url);
    const meetingId = searchParams.get("meetingId");
    const limit = Math.min(Math.max(parseInt(searchParams.get("limit") || "50", 10), 1), 100);
    const before = searchParams.get("before");

    if (!meetingId) {
      return NextResponse.json(
        { success: false, message: "Meeting identifier is required" },
        { status: 400 }
      );
    }

    // Verify user exists
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Locate meeting by _id or url slug
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

    // Verify membership: user must be host or in meeting.members
    const isHost = meeting.admin.toString() === user._id.toString();
    const isMember = Array.isArray(meeting.members) && meeting.members.some(
      (m) => m.toString() === user._id.toString()
    );

    if (!isHost && !isMember) {
      return NextResponse.json(
        { success: false, message: "You are not a member of this meeting" },
        { status: 403 }
      );
    }

    // Query messages
    const query = { meetingId: meeting._id };
    if (before) {
      const beforeDate = new Date(before);
      if (!isNaN(beforeDate.getTime())) {
        query.createdAt = { $lt: beforeDate };
      }
    }

    const rawMessages = await ChatMessage.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = rawMessages.length > limit;
    const pageMessages = hasMore ? rawMessages.slice(0, limit) : rawMessages;

    // Reverse to chronological order (oldest to newest) for front-end rendering
    const messages = pageMessages.reverse().map((msg) => ({
      _id: msg._id.toString(),
      meetingId: meeting.url || meeting._id.toString(),
      senderId: msg.senderId.toString(),
      senderName: msg.senderName,
      senderRole: msg.senderRole,
      message: msg.message,
      createdAt: msg.createdAt,
    }));

    return NextResponse.json({
      success: true,
      messages,
      hasMore,
    });
  } catch (error) {
    console.error("GET /api/meeting/chat error:", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to load chat history" },
      { status }
    );
  }
}

// POST /api/meeting/chat
export async function POST(req) {
  await connectDB();

  try {
    const decoded = await authenticateRequest(req);
    const userId = decoded.userId || decoded.id;

    const body = await req.json();
    const { meetingId, message } = body;

    if (!meetingId) {
      return NextResponse.json(
        { success: false, message: "Meeting identifier is required" },
        { status: 400 }
      );
    }

    const trimmed = (message || "").trim();
    if (!trimmed || trimmed.length === 0) {
      return NextResponse.json(
        { success: false, message: "Message cannot be empty" },
        { status: 400 }
      );
    }

    if (trimmed.length > 1000) {
      return NextResponse.json(
        { success: false, message: "Message cannot exceed 1000 characters" },
        { status: 400 }
      );
    }

    // Verify user
    const user = await User.findById(userId);
    if (!user) {
      return NextResponse.json(
        { success: false, message: "User not found" },
        { status: 404 }
      );
    }

    // Locate meeting
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

    // Verify membership
    const isHost = meeting.admin.toString() === user._id.toString();
    const isMember = Array.isArray(meeting.members) && meeting.members.some(
      (m) => m.toString() === user._id.toString()
    );

    if (!isHost && !isMember) {
      return NextResponse.json(
        { success: false, message: "You are not a member of this meeting" },
        { status: 403 }
      );
    }

    const senderRole = isHost ? "teacher" : (user.role === "teacher" ? "teacher" : "student");

    const createdMsg = await ChatMessage.create({
      meetingId: meeting._id,
      senderId: user._id,
      senderName: user.name || decoded.username || "Participant",
      senderRole,
      message: trimmed,
    });

    const chatMessage = {
      _id: createdMsg._id.toString(),
      meetingId: meeting.url || meeting._id.toString(),
      senderId: createdMsg.senderId.toString(),
      senderName: createdMsg.senderName,
      senderRole: createdMsg.senderRole,
      message: createdMsg.message,
      createdAt: createdMsg.createdAt,
    };

    return NextResponse.json({
      success: true,
      chatMessage,
    });
  } catch (error) {
    console.error("POST /api/meeting/chat error:", error);
    const status = error.statusCode || error.status || 500;
    return NextResponse.json(
      { success: false, message: error.message || "Failed to save chat message" },
      { status }
    );
  }
}
