import http from "http";
import { createRequire } from "module";

const require = createRequire("c:/Users/AmanNagar/teachview-live/package.json");
const { Server } = require("socket.io");
const { io: Client } = require("socket.io-client");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "test_chat_secret_key_889911";
const PORT = 4053;

// 1. Setup Mock Server matching socket/server.js
const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end("ok");
});

const io = new Server(server, { cors: { origin: "*" } });

const roomChatMessages = new Map();

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error("No token"));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.data.userId = decoded.id;
    socket.data.username = decoded.username;
    socket.data.isHost = decoded.isHost;
    socket.data.role = decoded.role;
    socket.data.meetingId = decoded.meetingId;
    socket.data.meetingUrl = decoded.meetingUrl;
    next();
  } catch (err) {
    next(err);
  }
});

io.on("connection", (socket) => {
  socket.on("join-meeting", ({ meetingId }, ack) => {
    socket.join(meetingId);
    if (socket.data?.meetingUrl) socket.join(socket.data.meetingUrl);
    if (socket.data?.meetingId) socket.join(String(socket.data.meetingId));

    if (typeof ack === "function") ack({ ok: true });
  });

  socket.on("leave-meeting", ({ meetingId }, ack) => {
    const targetRooms = new Set();
    if (meetingId) targetRooms.add(meetingId);
    if (socket.data?.meetingUrl) targetRooms.add(socket.data.meetingUrl);
    if (socket.data?.meetingId) targetRooms.add(String(socket.data.meetingId));

    for (const roomKey of targetRooms) {
      socket.leave(roomKey);
      socket.leave(`${roomKey}:admin`);
    }

    if (typeof ack === "function") ack({ ok: true });
  });

  socket.on("send-chat-message", (payload, ack) => {
    const userId = socket.data?.userId;
    const username = socket.data?.username || "Participant";
    const role = socket.data?.role || "student";
    const isHost = socket.data?.isHost || false;

    if (!userId) {
      if (typeof ack === "function") ack({ ok: false, error: "UNAUTHORIZED" });
      return;
    }

    const meetingId = payload?.meetingId;
    if (!meetingId) {
      if (typeof ack === "function") ack({ ok: false, error: "MISSING_MEETING_ID" });
      return;
    }

    // Security: verify meeting belongs to user session
    const tokenMeetingId = socket.data?.meetingId;
    const tokenMeetingUrl = socket.data?.meetingUrl;
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

    if (typeof ack === "function") {
      ack({ ok: true, message: chatMessage });
    }
  });
});

function makeToken(payload) {
  return jwt.sign(payload, JWT_SECRET);
}

// 2. Execute Tests
server.listen(PORT, async () => {
  console.log(`Live Chat Test Server running on port ${PORT}`);

  const meetingId = "cs101-live-class";

  const teacherToken = makeToken({
    id: "teacher_prof_smith",
    username: "Prof. Smith",
    isHost: true,
    role: "teacher",
    meetingId,
    meetingUrl: meetingId,
  });

  const studentAToken = makeToken({
    id: "student_alice",
    username: "Alice",
    isHost: false,
    role: "student",
    meetingId,
    meetingUrl: meetingId,
  });

  const studentBToken = makeToken({
    id: "student_bob",
    username: "Bob",
    isHost: false,
    role: "student",
    meetingId,
    meetingUrl: meetingId,
  });

  const connectClient = (token) => {
    return new Promise((resolve, reject) => {
      const s = Client(`http://localhost:${PORT}`, {
        transports: ["websocket"],
        auth: { token },
      });
      s.on("connect", () => resolve(s));
      s.on("connect_error", reject);
    });
  };

  try {
    const teacherSocket = await connectClient(teacherToken);
    const studentASocket = await connectClient(studentAToken);
    const studentBSocket = await connectClient(studentBToken);

    await new Promise((r) => teacherSocket.emit("join-meeting", { meetingId }, r));
    await new Promise((r) => studentASocket.emit("join-meeting", { meetingId }, r));
    await new Promise((r) => studentBSocket.emit("join-meeting", { meetingId }, r));

    // Test 1: Student A asks a question
    const t1TeacherPromise = new Promise((resolve) => {
      teacherSocket.once("receive-chat-message", (msg) => resolve(msg));
    });
    const t1BobPromise = new Promise((resolve) => {
      studentBSocket.once("receive-chat-message", (msg) => resolve(msg));
    });

    const questionText = "Prof, why do we use useEffect with a dependency array here?";
    const ack1 = await new Promise((resolve) => {
      studentASocket.emit("send-chat-message", { meetingId, message: questionText }, resolve);
    });

    if (!ack1?.ok || ack1?.message?.message !== questionText) {
      throw new Error(`Test 1 Failed: send-chat-message ack failed: ${JSON.stringify(ack1)}`);
    }

    const [teacherReceived1, bobReceived1] = await Promise.all([t1TeacherPromise, t1BobPromise]);

    if (
      teacherReceived1.senderId !== "student_alice" ||
      teacherReceived1.senderRole !== "student" ||
      teacherReceived1.message !== questionText
    ) {
      throw new Error(`Test 1 Failed: Teacher received incorrect message payload: ${JSON.stringify(teacherReceived1)}`);
    }
    if (bobReceived1.senderId !== "student_alice" || bobReceived1.message !== questionText) {
      throw new Error(`Test 1 Failed: Bob received incorrect message: ${JSON.stringify(bobReceived1)}`);
    }
    console.log("✅ PASS: Test 1 - Student A sent question; Teacher and Student B received it in real time!");

    // Test 2: Teacher answers question
    const t2AlicePromise = new Promise((resolve) => {
      studentASocket.once("receive-chat-message", (msg) => resolve(msg));
    });
    const t2BobPromise = new Promise((resolve) => {
      studentBSocket.once("receive-chat-message", (msg) => resolve(msg));
    });

    const teacherAnswer = "Because we only want to synchronize when those specific dependencies change.";
    const ack2 = await new Promise((resolve) => {
      teacherSocket.emit("send-chat-message", { meetingId, message: teacherAnswer }, resolve);
    });

    if (!ack2?.ok || ack2?.message?.senderRole !== "teacher") {
      throw new Error(`Test 2 Failed: Teacher message ack failed: ${JSON.stringify(ack2)}`);
    }

    const [aliceReceived2, bobReceived2] = await Promise.all([t2AlicePromise, t2BobPromise]);

    if (aliceReceived2.senderRole !== "teacher" || aliceReceived2.senderId !== "teacher_prof_smith") {
      throw new Error(`Test 2 Failed: Alice received invalid teacher message: ${JSON.stringify(aliceReceived2)}`);
    }
    if (bobReceived2.senderRole !== "teacher" || bobReceived2.message !== teacherAnswer) {
      throw new Error(`Test 2 Failed: Bob received invalid teacher message: ${JSON.stringify(bobReceived2)}`);
    }
    console.log("✅ PASS: Test 2 - Teacher replied; both students received message with senderRole='teacher'!");

    // Test 3: Departure Isolation: Student A leaves meeting; should not receive subsequent messages
    await new Promise((r) => studentASocket.emit("leave-meeting", { meetingId }, r));

    let aliceReceivedAfterLeave = false;
    studentASocket.on("receive-chat-message", () => {
      aliceReceivedAfterLeave = true;
    });

    const t3BobPromise = new Promise((resolve) => {
      studentBSocket.once("receive-chat-message", (msg) => resolve(msg));
    });

    await new Promise((resolve) => {
      teacherSocket.emit("send-chat-message", { meetingId, message: "Class, notice how Alice has left." }, resolve);
    });

    await t3BobPromise;
    // Allow brief time to ensure no event reached Alice
    await new Promise((r) => setTimeout(r, 100));

    if (aliceReceivedAfterLeave) {
      throw new Error("Test 3 Failed: Student A received chat message after leaving meeting!");
    }
    console.log("✅ PASS: Test 3 - Departure isolation: Left participant stopped receiving chat events!");

    // Test 4: Cross-meeting Security: Attempt to send to an unauthorized meeting
    const crossMeetingAck = await new Promise((resolve) => {
      studentBSocket.emit("send-chat-message", { meetingId: "unauthorized_meeting_999", message: "Hacking room" }, resolve);
    });

    if (crossMeetingAck?.ok !== false || crossMeetingAck?.error !== "FORBIDDEN") {
      throw new Error(`Test 4 Failed: Cross-meeting spoofing was not rejected: ${JSON.stringify(crossMeetingAck)}`);
    }
    console.log("✅ PASS: Test 4 - Security: Server rejected cross-meeting message attempt with FORBIDDEN!");

    // Test 5: Validation: Empty message and excessive length
    const emptyAck = await new Promise((resolve) => {
      studentBSocket.emit("send-chat-message", { meetingId, message: "    " }, resolve);
    });
    if (emptyAck?.ok !== false || emptyAck?.error !== "INVALID_LENGTH") {
      throw new Error(`Test 5 Failed: Empty message was not rejected: ${JSON.stringify(emptyAck)}`);
    }

    const hugeAck = await new Promise((resolve) => {
      studentBSocket.emit("send-chat-message", { meetingId, message: "x".repeat(1005) }, resolve);
    });
    if (hugeAck?.ok !== false || hugeAck?.error !== "INVALID_LENGTH") {
      throw new Error(`Test 5 Failed: Overlength message was not rejected: ${JSON.stringify(hugeAck)}`);
    }
    console.log("✅ PASS: Test 5 - Validation: Empty messages and >1000 length messages properly rejected!");

    // Cleanup
    teacherSocket.disconnect();
    studentASocket.disconnect();
    studentBSocket.disconnect();
    server.close();

    console.log("\n🎉 ALL 5 REAL-TIME CHAT INTEGRATION TESTS PASSED SUCCESSFULLY!\n");
    process.exit(0);
  } catch (err) {
    console.error("❌ Test failed:", err);
    server.close();
    process.exit(1);
  }
});
