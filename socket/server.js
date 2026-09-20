import express from "express";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { monitorEventLoopDelay } from "perf_hooks";
import dotenv from "dotenv";

dotenv.config();
// import { connectDB } from "../lib/db.js";
// import Meeting from "../models/Meeting.js";
// import User from "../models/User.model.js";

const app = express();
const httpServer = http.createServer(app);

// Lightweight Event Loop & Performance Monitoring
const eventLoopHistogram = monitorEventLoopDelay({ resolution: 20 });
eventLoopHistogram.enable();

let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

app.get("/metrics", (req, res) => {
  const currentCpuUsage = process.cpuUsage(lastCpuUsage);
  const currentTime = Date.now();
  const timeDiffMs = Math.max(1, currentTime - lastCpuTime);
  const totalCpuMicroSec = currentCpuUsage.user + currentCpuUsage.system;
  const cpuPercent = Math.min(100, Math.round((totalCpuMicroSec / (timeDiffMs * 1000 * 100)) * 100) / 100);
  lastCpuUsage = process.cpuUsage();
  lastCpuTime = currentTime;

  const mem = process.memoryUsage();
  const activeSockets = io.engine?.clientsCount || io.sockets?.sockets?.size || 0;
  const activeRooms = io.sockets?.adapter?.rooms?.size || 0;

  res.json({
    status: "ok",
    timestamp: Date.now(),
    cpu: {
      percent: cpuPercent,
    },
    memory: {
      rssMb: Math.round((mem.rss / 1024 / 1024) * 100) / 100,
      heapUsedMb: Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100,
      heapTotalMb: Math.round((mem.heapTotal / 1024 / 1024) * 100) / 100,
    },
    sockets: {
      activeSockets,
      activeRooms,
    },
    eventLoopLag: {
      minMs: Math.round((eventLoopHistogram.min / 1e6) * 100) / 100,
      maxMs: Math.round((eventLoopHistogram.max / 1e6) * 100) / 100,
      meanMs: Math.round((eventLoopHistogram.mean / 1e6) * 100) / 100,
      p50Ms: Math.round((eventLoopHistogram.percentile(50) / 1e6) * 100) / 100,
      p95Ms: Math.round((eventLoopHistogram.percentile(95) / 1e6) * 100) / 100,
      p99Ms: Math.round((eventLoopHistogram.percentile(99) / 1e6) * 100) / 100,
    },
  });
});

const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:3000" , process.env.CLIENT_URL],
    credentials: true,
  },
});

// AUTH MIDDLEWARE
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  console.log("Authenticating socket with token:", token);
  if (!token) return next(new Error("No token"));

  try {
    const decoded = jwt.verify(token, process.env.SOCKET_JWT_SECRET || "");
    if (!decoded) {
      console.log("❌ Invalid token");
      return next(new Error("Invalid token"));
    }
    console.log("Socket authenticated for user ID:", decoded);
    socket.data.userId = decoded.id;
    socket.data.username = decoded.username;
    socket.data.isHost = decoded.isHost;
    socket.data.role = decoded.role;
    socket.data.meetingId = decoded.meetingId;
    socket.data.meetingUrl = decoded.meetingUrl;
    next();
  } catch (e) {
    console.log("❌ Token verification error:", e);
    next(new Error(e.message));
  }
});

// In-memory room state for live admin code and execution output
const roomAdminState = new Map();
// In-memory room state for latest student snapshots: meetingId -> Map(studentId -> { snapshot, from, studentId, username })
const roomStudentSnapshots = new Map();
// In-memory cache for recent chat messages: meetingId -> Array of ChatMessage objects (max 50)
const roomChatMessages = new Map();

// CONNECTION
io.on("connection", (socket) => {
  console.log("User connected:", socket.data.userId);

  socket.on("join-meeting", async ({ meetingId }, ack) => {

    socket.join(meetingId);
    if (socket.data?.meetingUrl) socket.join(socket.data.meetingUrl);
    if (socket.data?.meetingId) socket.join(String(socket.data.meetingId));

    const isHost = socket.data?.isHost ?? socket.user?.isHost;
    const role = socket.data?.role ?? socket.user?.role;

    if (isHost || role === "teacher") {
      socket.join(`${meetingId}:admin`);
      if (socket.data?.meetingUrl) socket.join(`${socket.data.meetingUrl}:admin`);
      if (socket.data?.meetingId) socket.join(`${String(socket.data.meetingId)}:admin`);

      // Immediately sync all cached student snapshots to this admin
      const cachedMap =
        roomStudentSnapshots.get(meetingId) ||
        (socket.data?.meetingUrl ? roomStudentSnapshots.get(socket.data.meetingUrl) : null) ||
        (socket.data?.meetingId ? roomStudentSnapshots.get(String(socket.data.meetingId)) : null);

      if (cachedMap) {
        for (const snapData of cachedMap.values()) {
          socket.emit("receive-code-snapshot", snapData);
        }
      }
    }

    const room = io.sockets.adapter.rooms.get(meetingId);
    const members = [];
    if (room) {
      for (const socketId of room) {
        const s = io.sockets.sockets.get(socketId);
        const u = s?.data || s?.user;
        if (u) {
          members.push({
            id: u.userId || u.id,
            username: u.username,
            role: u.role,
            isHost: u.isHost,
          });
        }
      }
    }

    // Emit meeting-members to everyone in room (including admin frontend)
    io.to(meetingId).emit("meeting-members", members);
    if (socket.data?.meetingUrl && socket.data.meetingUrl !== meetingId) {
      io.to(socket.data.meetingUrl).emit("meeting-members", members);
    }

    // ⚡ Send cached admin code and output to joining user immediately
    const cachedState =
      roomAdminState.get(meetingId) ||
      (socket.data?.meetingUrl ? roomAdminState.get(socket.data.meetingUrl) : null) ||
      (socket.data?.meetingId ? roomAdminState.get(String(socket.data.meetingId)) : null);
    if (cachedState) {
      socket.emit("sync-admin-state", cachedState);
    }

    socket.to(meetingId).emit("user-joined", {
      user: {
        id: socket.data.userId,
        username: socket.data.username,
        role: socket.data.role,
        isHost: socket.data.isHost,
      },
      socketId: socket.id,
    });
    console.log(`User ${socket.data.userId} joined meeting ${meetingId}`);

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  // 💬 Real-Time Classroom Chat Handler
  socket.on("send-chat-message", (payload, ack) => {
    const userId = socket.data?.userId || socket.user?.id;
    const username = socket.data?.username || socket.user?.username || "Participant";
    const role = socket.data?.role || socket.user?.role || "student";
    const isHost = socket.data?.isHost ?? socket.user?.isHost ?? false;

    if (!userId) {
      if (typeof ack === "function") ack({ ok: false, error: "UNAUTHORIZED" });
      return;
    }

    const meetingId = payload?.meetingId;
    if (!meetingId) {
      if (typeof ack === "function") ack({ ok: false, error: "MISSING_MEETING_ID" });
      return;
    }

    // Authorization: ensure user belongs to this meeting
    const tokenMeetingId = socket.data?.meetingId || socket.user?.meetingId;
    const tokenMeetingUrl = socket.data?.meetingUrl || socket.user?.meetingUrl;

    if (tokenMeetingId && tokenMeetingUrl) {
      const matches =
        String(tokenMeetingId) === String(meetingId) ||
        String(tokenMeetingUrl) === String(meetingId);
      if (!matches) {
        if (typeof ack === "function") ack({ ok: false, error: "FORBIDDEN" });
        return;
      }
    }

    const messageText = (payload?.message || payload?.text || "").trim();
    if (!messageText || messageText.length > 1000) {
      if (typeof ack === "function") ack({ ok: false, error: "INVALID_LENGTH" });
      return;
    }

    const senderRole = isHost ? "teacher" : (role === "teacher" ? "teacher" : "student");

    const chatMessage = {
      _id: payload?._id || `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      meetingId: String(meetingId),
      senderId: String(userId),
      senderName: username,
      senderRole,
      message: messageText,
      createdAt: payload?.createdAt || new Date().toISOString(),
    };

    // Cache in room chat history (max 50)
    const targetRooms = new Set();
    if (meetingId) targetRooms.add(meetingId);
    if (socket.data?.meetingUrl) targetRooms.add(socket.data.meetingUrl);
    if (socket.data?.meetingId) targetRooms.add(String(socket.data.meetingId));

    for (const roomKey of targetRooms) {
      const history = roomChatMessages.get(roomKey) || [];
      history.push(chatMessage);
      if (history.length > 50) history.shift();
      roomChatMessages.set(roomKey, history);
    }

    let broadcast = io;
    for (const roomKey of targetRooms) {
      broadcast = broadcast.to(roomKey);
    }

    broadcast.emit("receive-chat-message", chatMessage);

    // Legacy broadcast for backward compatibility
    broadcast.emit("receive-message", {
      text: messageText,
      from: username,
      ...chatMessage,
    });

    if (typeof ack === "function") {
      ack({ ok: true, message: chatMessage });
    }
  });

  socket.on("send-message", (payload, ack) => {
    // Forward legacy send-message through send-chat-message
    socket.emit("send-chat-message", payload, ack);
  });

  socket.on("send-code", ({ code, language, meetingId, eventId, clientTimestamp }) => {
    console.log(`Code update in : ${code?.length} chars (${language}) from ${socket.data.username} and meetingId: ${meetingId}`);

    const targetRooms = new Set();
    if (meetingId) targetRooms.add(meetingId);
    if (socket.data?.meetingUrl) targetRooms.add(socket.data.meetingUrl);
    if (socket.data?.meetingId) targetRooms.add(String(socket.data.meetingId));

    for (const roomKey of targetRooms) {
      const prev = roomAdminState.get(roomKey) || {};
      roomAdminState.set(roomKey, {
        ...prev,
        code,
        language: language || prev.language || "javascript",
        adminName: socket.data?.username || socket.data?.userId,
        timestamp: Date.now(),
      });
    }

    let broadcast = io;
    for (const roomKey of targetRooms) {
      broadcast = broadcast.to(roomKey);
    }
    broadcast.emit("receive-code", {
      code,
      language: language || "javascript",
      from: socket.data?.username || socket.data?.userId,
      eventId,
      clientTimestamp,
    });
  });

  socket.on("send-admin-output", ({ output, meetingId, eventId, clientTimestamp }) => {
    const targetRooms = new Set();
    if (meetingId) targetRooms.add(meetingId);
    if (socket.data?.meetingUrl) targetRooms.add(socket.data.meetingUrl);
    if (socket.data?.meetingId) targetRooms.add(String(socket.data.meetingId));

    for (const roomKey of targetRooms) {
      const prev = roomAdminState.get(roomKey) || {};
      roomAdminState.set(roomKey, {
        ...prev,
        output,
        timestamp: Date.now(),
      });
    }

    let broadcast = io;
    for (const roomKey of targetRooms) {
      broadcast = broadcast.to(roomKey);
    }
    broadcast.emit("receive-admin-output", {
      output,
      from: socket.data?.username || socket.data?.userId,
      eventId,
      clientTimestamp,
    });
  });

  socket.on("get-admin-state", ({ meetingId }) => {
    const cached =
      roomAdminState.get(meetingId) ||
      (socket.data?.meetingUrl ? roomAdminState.get(socket.data.meetingUrl) : null) ||
      (socket.data?.meetingId ? roomAdminState.get(String(socket.data.meetingId)) : null);
    if (cached) {
      socket.emit("sync-admin-state", cached);
    }
  });

  socket.on("code-snapshot", ({ meetingId, snapshot }) => {
    const isHost = socket.data?.isHost ?? socket.user?.isHost;
    const role = socket.data?.role ?? socket.user?.role;
    if (isHost || role === "teacher") {
      console.warn(`[Snapshot] Blocked host/teacher ${socket.data?.userId || socket.data?.username} from sending student snapshot.`);
      return;
    }

    if (!snapshot) return;

    const studentUserId = socket.data?.userId || socket.user?.id;
    const studentUsername = socket.data?.username || socket.user?.username;

    const snapshotPayload = {
      snapshot,
      from: studentUserId,
      studentId: studentUserId,
      username: studentUsername,
    };

    // Cache latest snapshot in memory for this meeting
    if (meetingId) {
      if (!roomStudentSnapshots.has(meetingId)) {
        roomStudentSnapshots.set(meetingId, new Map());
      }
      roomStudentSnapshots.get(meetingId).set(studentUserId, snapshotPayload);
    }
    if (socket.data?.meetingUrl && socket.data.meetingUrl !== meetingId) {
      if (!roomStudentSnapshots.has(socket.data.meetingUrl)) {
        roomStudentSnapshots.set(socket.data.meetingUrl, new Map());
      }
      roomStudentSnapshots.get(socket.data.meetingUrl).set(studentUserId, snapshotPayload);
    }

    console.log(`Code snapshot for meeting ${meetingId} from student ${studentUsername} (${studentUserId})`);

    // Route snapshot EXCLUSIVELY to admin dashboard room, not all students
    io.to(`${meetingId}:admin`).emit("receive-code-snapshot", snapshotPayload);
    if (socket.data?.meetingUrl && socket.data.meetingUrl !== meetingId) {
      io.to(`${socket.data.meetingUrl}:admin`).emit("receive-code-snapshot", snapshotPayload);
    }
    if (socket.data?.meetingId && String(socket.data.meetingId) !== meetingId) {
      io.to(`${String(socket.data.meetingId)}:admin`).emit("receive-code-snapshot", snapshotPayload);
    }
  });

  // Request student code handler
  socket.on("request-student-code", ({ requestId, meetingId, studentId }) => {
    const userId = socket.data?.userId || socket.user?.id;
    if (!userId) {
      return socket.emit("student-code-error", {
        requestId,
        studentId,
        error: "UNAUTHORIZED",
        message: "You are not authenticated.",
      });
    }

    const isHost = socket.data?.isHost ?? socket.user?.isHost;
    const role = socket.data?.role ?? socket.user?.role;
    if (isHost === false || role === "student") {
      return socket.emit("student-code-error", {
        requestId,
        studentId,
        error: "FORBIDDEN",
        message: "Only teachers can request student code.",
      });
    }

    const tokenMeetingId = socket.data?.meetingId || socket.user?.meetingId;
    const tokenMeetingUrl = socket.data?.meetingUrl || socket.user?.meetingUrl;

    if (tokenMeetingId && tokenMeetingUrl) {
      const matches =
        String(tokenMeetingId) === String(meetingId) ||
        String(tokenMeetingUrl) === String(meetingId);
      if (!matches) {
        return socket.emit("student-code-error", {
          requestId,
          studentId,
          error: "FORBIDDEN",
          message: "You do not belong to this meeting.",
        });
      }
    }

    if (!socket.rooms.has(meetingId)) {
      socket.join(meetingId);
    }

    if (String(userId) === String(studentId)) {
      return socket.emit("student-code-error", {
        requestId,
        studentId,
        error: "INVALID_REQUEST",
        message: "Cannot request your own code as a student.",
      });
    }

    let targetSocket = null;
    const room = io.sockets.adapter.rooms.get(meetingId);

    if (room) {
      for (const socketId of room) {
        const s = io.sockets.sockets.get(socketId);
        const sUserId = s?.data?.userId || s?.user?.id;
        if (sUserId && String(sUserId) === String(studentId)) {
          targetSocket = s;
          break;
        }
      }
    }

    if (!targetSocket) {
      for (const [socketId, s] of io.sockets.sockets) {
        const sUserId = s?.data?.userId || s?.user?.id;
        if (sUserId && String(sUserId) === String(studentId)) {
          targetSocket = s;
          s.join(meetingId);
          break;
        }
      }
    }

    if (!targetSocket) {
      return socket.emit("student-code-error", {
        requestId,
        studentId,
        error: "STUDENT_OFFLINE",
        message: "Student is offline. We cannot connect to the student.",
      });
    }

    targetSocket.emit("get-current-code", {
      requestId,
      meetingId,
      teacherId: socket.data.userId,
    });
  });

  socket.on("student-code-response", ({ requestId, meetingId, code, language }) => {
    io.to(meetingId).emit("receive-student-code", {
      requestId,
      studentId: socket.data.userId,
      studentName: socket.data.username,
      code: typeof code === "string" ? code : "",
      language: language || "javascript",
      timestamp: Date.now(),
    });
  });


  socket.on("leave-meeting", ({ meetingId }, ack) => {
    const userId = socket.data?.userId || socket.user?.id;
    const username = socket.data?.username || socket.user?.username;

    console.log(`User ${username} (${userId}) leaving meeting ${meetingId}`);

    const targetRooms = new Set();
    if (meetingId) targetRooms.add(meetingId);
    if (socket.data?.meetingUrl) targetRooms.add(socket.data.meetingUrl);
    if (socket.data?.meetingId) targetRooms.add(String(socket.data.meetingId));

    for (const roomKey of targetRooms) {
      socket.leave(roomKey);
      socket.leave(`${roomKey}:admin`);
    }

    for (const roomKey of targetRooms) {
      io.to(roomKey).emit("user-left", { userId, username });
    }

    for (const roomKey of targetRooms) {
      const room = io.sockets.adapter.rooms.get(roomKey);
      const members = [];
      if (room) {
        for (const socketId of room) {
          const s = io.sockets.sockets.get(socketId);
          const u = s?.data || s?.user;
          if (u) {
            members.push({
              id: u.userId || u.id,
              username: u.username,
              role: u.role,
              isHost: u.isHost,
            });
          }
        }
      }
      io.to(roomKey).emit("meeting-members", members);
    }

    if (typeof ack === "function") {
      ack({ ok: true });
    }
  });

  socket.on("disconnecting", () => {
    const userId = socket.data?.userId || socket.user?.id;
    const username = socket.data?.username || socket.user?.username;

    for (const roomKey of socket.rooms) {
      if (roomKey !== socket.id) {
        socket.to(roomKey).emit("user-left", { userId, username });
      }
    }
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.data.userId);
  });

});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket server running on port ${PORT}`);
});
