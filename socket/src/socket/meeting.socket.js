// In-memory room state for live admin code and execution output
const roomAdminState = new Map();
// In-memory room state for latest student snapshots
const roomStudentSnapshots = new Map();

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
    const cachedState = roomAdminState.get(meetingId) || (socket.user?.meetingUrl ? roomAdminState.get(socket.user.meetingUrl) : null);
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

  socket.on("send-code", ({ code, meetingId, eventId, clientTimestamp }) => {
    if (meetingId) {
      const prev = roomAdminState.get(meetingId) || {};
      roomAdminState.set(meetingId, {
        ...prev,
        code,
        adminName: socket.user?.username || socket.user?.id,
        timestamp: Date.now(),
      });
    }

    io.to(meetingId).emit("receive-code", {
      code,
      from: socket.user?.username || socket.user?.id,
      eventId,
      clientTimestamp,
    });
  });

  socket.on("send-admin-output", ({ output, meetingId, eventId, clientTimestamp }) => {
    if (meetingId) {
      const prev = roomAdminState.get(meetingId) || {};
      roomAdminState.set(meetingId, {
        ...prev,
        output,
        timestamp: Date.now(),
      });
    }

    io.to(meetingId).emit("receive-admin-output", {
      output,
      from: socket.user?.username || socket.user?.id,
      eventId,
      clientTimestamp,
    });
  });

  socket.on("get-admin-state", ({ meetingId }) => {
    const cached = roomAdminState.get(meetingId);
    if (cached) {
      socket.emit("sync-admin-state", cached);
    }
  });

  socket.on("send-message", ({ text, meetingId, eventId, clientTimestamp }) => {
    io.to(meetingId).emit("receive-message", {
      text,
      from: socket.user?.username || socket.user?.id,
      eventId,
      clientTimestamp,
    });
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
}
