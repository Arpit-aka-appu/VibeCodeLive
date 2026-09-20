// In-memory room state for live admin code and execution output
const roomAdminState = new Map();
// In-memory room state for latest student snapshots
const roomStudentSnapshots = new Map();
// In-memory cache for recent chat messages: meetingId -> Array of ChatMessage objects (max 50)
const roomChatMessages = new Map();

export default function registerMeetingHandlers({ io, socket }) {
  socket.on("join-meeting", ({ meetingId }) => {
    socket.join(meetingId);
    if (socket.user?.meetingUrl) {
      socket.join(socket.user.meetingUrl);
    }
    if (socket.user?.meetingId) {
      socket.join(String(socket.user.meetingId));
    }
    console.log("user join meeting room : ", meetingId);

    const isHost = socket.user?.isHost;
    const role = socket.user?.role;

    if (isHost || role === "teacher") {
      socket.join(`${meetingId}:admin`);
      if (socket.user?.meetingUrl) socket.join(`${socket.user.meetingUrl}:admin`);
      if (socket.user?.meetingId) socket.join(`${String(socket.user.meetingId)}:admin`);

      // Sync cached student snapshots to joining/reconnecting admin
      const cachedMap =
        roomStudentSnapshots.get(meetingId) ||
        (socket.user?.meetingUrl ? roomStudentSnapshots.get(socket.user.meetingUrl) : null) ||
        (socket.user?.meetingId ? roomStudentSnapshots.get(String(socket.user.meetingId)) : null);

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
        if (s?.user) {
          members.push({
            id: s.user.id,
            username: s.user.username,
            role: s.user.role,
            isHost: s.user.isHost,
          });
        }
      }
    }

    // 🔥 Send updated members to everyone in the room (including the admin dashboard)
    io.to(meetingId).emit("meeting-members", members);
    if (socket.user?.meetingUrl && socket.user.meetingUrl !== meetingId) {
      io.to(socket.user.meetingUrl).emit("meeting-members", members);
    }

    // ⚡ Send cached admin code and output to joining user immediately
    const cachedState =
      roomAdminState.get(meetingId) ||
      (socket.user?.meetingUrl ? roomAdminState.get(socket.user.meetingUrl) : null) ||
      (socket.user?.meetingId ? roomAdminState.get(String(socket.user.meetingId)) : null);
    if (cachedState) {
      socket.emit("sync-admin-state", cachedState);
    }

    console.log("user joined meeting room : ", socket.user);
    socket.to(meetingId).emit("user-joined", {
      user: socket.user,
      socketId: socket.id,
    });
    if (socket.user?.meetingUrl && socket.user.meetingUrl !== meetingId) {
      socket.to(socket.user.meetingUrl).emit("user-joined", {
        user: socket.user,
        socketId: socket.id,
      });
    }
  });

  socket.on("code-snapshot", ({ meetingId, snapshot }) => {
    const isHost = socket.user?.isHost;
    const role = socket.user?.role;
    if (isHost || role === "teacher") {
      console.warn(`[Snapshot] Blocked host/teacher ${socket.user?.id || socket.user?.username} from sending student snapshot.`);
      return;
    }

    if (!snapshot) return;

    const studentUserId = socket.user?.id || socket.user?.userId;
    const studentUsername = socket.user?.username;

    const snapshotPayload = {
      snapshot,
      from: studentUserId,
      studentId: studentUserId,
      username: studentUsername,
    };

    if (meetingId) {
      if (!roomStudentSnapshots.has(meetingId)) {
        roomStudentSnapshots.set(meetingId, new Map());
      }
      roomStudentSnapshots.get(meetingId).set(studentUserId, snapshotPayload);
    }
    if (socket.user?.meetingUrl && socket.user.meetingUrl !== meetingId) {
      if (!roomStudentSnapshots.has(socket.user.meetingUrl)) {
        roomStudentSnapshots.set(socket.user.meetingUrl, new Map());
      }
      roomStudentSnapshots.get(socket.user.meetingUrl).set(studentUserId, snapshotPayload);
    }

    io.to(`${meetingId}:admin`).emit("receive-code-snapshot", snapshotPayload);
    if (socket.user?.meetingUrl && socket.user.meetingUrl !== meetingId) {
      io.to(`${socket.user.meetingUrl}:admin`).emit("receive-code-snapshot", snapshotPayload);
    }
    if (socket.user?.meetingId && String(socket.user.meetingId) !== meetingId) {
      io.to(`${String(socket.user.meetingId)}:admin`).emit("receive-code-snapshot", snapshotPayload);
    }
  });

  socket.on("send-code", ({ code, language, meetingId, eventId, clientTimestamp }) => {
    const targetRooms = new Set();
    if (meetingId) targetRooms.add(meetingId);
    if (socket.user?.meetingUrl) targetRooms.add(socket.user.meetingUrl);
    if (socket.user?.meetingId) targetRooms.add(String(socket.user.meetingId));

    for (const roomKey of targetRooms) {
      const prev = roomAdminState.get(roomKey) || {};
      roomAdminState.set(roomKey, {
        ...prev,
        code,
        language: language || prev.language || "javascript",
        adminName: socket.user?.username || socket.user?.id,
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
      from: socket.user?.username || socket.user?.id,
      eventId,
      clientTimestamp,
    });
  });

  socket.on("send-admin-output", ({ output, meetingId, eventId, clientTimestamp }) => {
    const targetRooms = new Set();
    if (meetingId) targetRooms.add(meetingId);
    if (socket.user?.meetingUrl) targetRooms.add(socket.user.meetingUrl);
    if (socket.user?.meetingId) targetRooms.add(String(socket.user.meetingId));

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
      from: socket.user?.username || socket.user?.id,
      eventId,
      clientTimestamp,
    });
  });

  socket.on("get-admin-state", ({ meetingId }) => {
    const cached =
      roomAdminState.get(meetingId) ||
      (socket.user?.meetingUrl ? roomAdminState.get(socket.user.meetingUrl) : null) ||
      (socket.user?.meetingId ? roomAdminState.get(String(socket.user.meetingId)) : null);
    if (cached) {
      socket.emit("sync-admin-state", cached);
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
    if (socket.user?.meetingUrl) targetRooms.add(socket.user.meetingUrl);
    if (socket.user?.meetingId) targetRooms.add(String(socket.user.meetingId));

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
    socket.emit("send-chat-message", payload, ack);
  });

  // 🔹 Request Student Code (Teacher -> Student via Server)
  socket.on("request-student-code", ({ requestId, meetingId, studentId }) => {
    console.log(`Teacher ${socket.user?.id} requesting code of student ${studentId} in meeting ${meetingId}`);

    // Authorization checks:
    // 1. Authenticated socket
    if (!socket.user) {
      return socket.emit("student-code-error", {
        requestId,
        studentId,
        error: "UNAUTHORIZED",
        message: "You are not authenticated.",
      });
    }

    // 2. Teacher privileges: reject if explicitly marked as student
    if (socket.user.isHost === false || socket.user.role === "student") {
      return socket.emit("student-code-error", {
        requestId,
        studentId,
        error: "FORBIDDEN",
        message: "Only teachers can request student code.",
      });
    }

    // 3. Belongs to this meeting:
    // If token has both meetingId and meetingUrl, verify at least one matches meetingId
    if (socket.user.meetingId && socket.user.meetingUrl) {
      const matches =
        String(socket.user.meetingId) === String(meetingId) ||
        String(socket.user.meetingUrl) === String(meetingId);
      if (!matches) {
        return socket.emit("student-code-error", {
          requestId,
          studentId,
          error: "FORBIDDEN",
          message: "You do not belong to this meeting.",
        });
      }
    }

    // Ensure teacher socket is in the meeting room
    if (!socket.rooms.has(meetingId)) {
      socket.join(meetingId);
    }

    // 4. Requested student must not be the teacher themselves
    if (String(socket.user.id) === String(studentId)) {
      return socket.emit("student-code-error", {
        requestId,
        studentId,
        error: "INVALID_REQUEST",
        message: "Cannot request your own code as a student.",
      });
    }

    // 5. Locate requested student (first check room, fallback to all connected sockets)
    let targetSocket = null;
    const room = io.sockets.adapter.rooms.get(meetingId);

    if (room) {
      for (const socketId of room) {
        const s = io.sockets.sockets.get(socketId);
        const sUserId = s?.user?.id || s?.data?.userId;
        if (sUserId && String(sUserId) === String(studentId)) {
          targetSocket = s;
          break;
        }
      }
    }

    // Fallback: search all sockets if student reconnected and lost room membership
    if (!targetSocket) {
      for (const [socketId, s] of io.sockets.sockets) {
        const sUserId = s?.user?.id || s?.data?.userId;
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

    // 6. Forward request to the student socket
    targetSocket.emit("get-current-code", {
      requestId,
      meetingId,
      teacherId: socket.user.id,
    });
  });

  // 🔹 Student Code Response (Student -> Server -> Teacher)
  socket.on("student-code-response", ({ requestId, meetingId, code, language }) => {
    if (!socket.user) return;

    console.log(`Received code response from student ${socket.user.id} for request ${requestId}`);

    io.to(meetingId).emit("receive-student-code", {
      requestId,
      studentId: socket.user.id,
      studentName: socket.user.username,
      code: typeof code === "string" ? code : "",
      language: language || "javascript",
      timestamp: Date.now(),
    });
  });

  socket.on("leave-meeting", ({ meetingId }, ack) => {
    const userId = socket.user?.id || socket.user?.userId;
    const username = socket.user?.username;

    console.log(`User ${username} (${userId}) leaving meeting ${meetingId}`);

    const targetRooms = new Set();
    if (meetingId) targetRooms.add(meetingId);
    if (socket.user?.meetingUrl) targetRooms.add(socket.user.meetingUrl);
    if (socket.user?.meetingId) targetRooms.add(String(socket.user.meetingId));

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
          if (s?.user) {
            members.push({
              id: s.user.id,
              username: s.user.username,
              role: s.user.role,
              isHost: s.user.isHost,
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
    const userId = socket.user?.id || socket.user?.userId;
    const username = socket.user?.username;

    for (const roomKey of socket.rooms) {
      if (roomKey !== socket.id) {
        socket.to(roomKey).emit("user-left", { userId, username });
      }
    }
  });
}
