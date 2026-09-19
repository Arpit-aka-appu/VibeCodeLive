import { io } from "socket.io-client";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 1. ENVIRONMENT & CONFIGURATION LOADING
// ============================================================================
function loadEnv() {
  const envFiles = [
    path.resolve(__dirname, "../socket/.env"),
    path.resolve(__dirname, "../.env.local"),
    path.resolve(__dirname, "../.env"),
  ];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [k, ...v] = trimmed.split("=");
          const key = k.trim();
          const val = v.join("=").trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

const JWT_SECRET = process.env.SOCKET_JWT_SECRET || "AMANNAGAR_SOCKET";

// ============================================================================
// 2. CLI ARGUMENT PARSING
// ============================================================================
const args = process.argv.slice(2);
let targetUsers = 10;
let testDurationSec = 60;
let meetingQuery = "";
let meetingsArg = ""; // e.g. --meetings=5 or --meetings=slug1,slug2
let baseUrl = "http://localhost:3000";
let socketUrl = "http://localhost:4000";
// let baseUrl = "http://vibecodelive.vercel.app";
// let socketUrl = "https://industrious-unity-production.up.railway.app";
let rampIntervalMs = 60; // stagger start of users to simulate realistic ramp-up

for (const arg of args) {
  if (/^\d+$/.test(arg)) {
    targetUsers = parseInt(arg, 10);
  } else if (arg.startsWith("--users=")) {
    targetUsers = parseInt(arg.split("=")[1], 10);
  } else if (arg.startsWith("--duration=")) {
    testDurationSec = parseInt(arg.split("=")[1], 10);
  } else if (arg.startsWith("--meeting=")) {
    meetingQuery = arg.split("=")[1].replace(/^["']|["']$/g, "");
  } else if (arg.startsWith("--meetings=")) {
    meetingsArg = arg.split("=")[1].replace(/^["']|["']$/g, "");
  } else if (arg.startsWith("--base=")) {
    baseUrl = arg.split("=")[1];
  } else if (arg.startsWith("--socket=")) {
    socketUrl = arg.split("=")[1];
  } else if (arg.startsWith("--ramp=")) {
    rampIntervalMs = parseInt(arg.split("=")[1], 10);
  }
}

// Load test users from users.json
const usersFilePath = path.resolve(__dirname, "users.json");
let allUsers = [];
if (fs.existsSync(usersFilePath)) {
  allUsers = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));
}

// ============================================================================
// 3. STATISTICAL & PERCENTILE CALCULATION ENGINE
// ============================================================================
export function calculatePercentile(sortedValues, percentile) {
  if (!sortedValues || sortedValues.length === 0) return 0;
  if (percentile <= 0) return sortedValues[0];
  if (percentile >= 100) return sortedValues[sortedValues.length - 1];

  const index = Math.ceil((percentile / 100) * sortedValues.length) - 1;
  return sortedValues[Math.max(0, Math.min(sortedValues.length - 1, index))];
}

export function calculateLatencyStats(values) {
  if (!values || values.length === 0) {
    return { count: 0, min: 0, max: 0, avg: 0, p50: 0, p90: 0, p95: 0, p99: 0 };
  }
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);
  return {
    count: sorted.length,
    min: sorted[0],
    max: sorted[sorted.length - 1],
    avg: Math.round((sum / sorted.length) * 100) / 100,
    p50: calculatePercentile(sorted, 50),
    p90: calculatePercentile(sorted, 90),
    p95: calculatePercentile(sorted, 95),
    p99: calculatePercentile(sorted, 99),
  };
}

class OperationTracker {
  constructor(name) {
    this.name = name;
    this.total = 0;
    this.success = 0;
    this.failed = 0;
    this.errors = 0;
    this.latencies = [];
  }

  record(isSuccess, latencyMs, isError = false) {
    this.total++;
    if (isSuccess) {
      this.success++;
    } else {
      this.failed++;
    }
    if (isError) {
      this.errors++;
    }
    if (typeof latencyMs === "number" && !isNaN(latencyMs) && latencyMs >= 0) {
      this.latencies.push(latencyMs);
    }
  }

  getStats() {
    return {
      name: this.name,
      total: this.total,
      success: this.success,
      failed: this.failed,
      errors: this.errors,
      ...calculateLatencyStats(this.latencies),
    };
  }
}

// ============================================================================
// 4. METRICS STATE
// ============================================================================
const metrics = {
  http: {
    login: new OperationTracker("LOGIN"),
    search: new OperationTracker("MEETING SEARCH"),
    join: new OperationTracker("JOIN MEETING"),
    refresh: new OperationTracker("REFRESH TOKEN"),
  },
  socket: {
    attempts: 0,
    connected: 0,
    failed: 0,
    connectLatencies: [],
    disconnects: 0,
    unexpectedDisconnects: 0,
    reconnectAttempts: 0,
    reconnectSuccess: 0,
    reconnectFailed: 0,
    reconnectLatencies: [],
    errors: 0,
  },
  events: {
    code: {
      sent: 0,
      expected: 0,
      actual: 0,
      missing: 0,
      duplicates: 0,
      latencies: [],
    },
    snapshot: {
      sent: 0,
      expected: 0,
      actual: 0,
      missing: 0,
      duplicates: 0,
      latencies: [],
    },
    message: {
      sent: 0,
      expected: 0,
      actual: 0,
      missing: 0,
      duplicates: 0,
      latencies: [],
    },
    teacherInspection: {
      requests: 0,
      success: 0,
      failed: 0,
      timeouts: 0,
      latencies: [],
    },
  },
  auth: {
    sessionExpired: 0,
    refreshAttempts: 0,
    refreshSuccess: 0,
    refreshFailed: 0,
    successfulRetries: 0,
  },
  errors: {
    httpErrors: 0,
    socketErrors: 0,
    timeouts: 0,
    unexpectedDisconnects: 0,
  },
  roomDistribution: {}, // { [meetingSlug]: count }
};

// ============================================================================
// ROOM SOCKET REGISTRY & MULTI-RECIPIENT BROADCAST TRACKING
// ============================================================================
const roomSockets = new Map(); // targetRoom -> Map<socketId, { isStudent, isTeacher }>

function registerSocketInRoom(room, socketId, metadata) {
  if (!roomSockets.has(room)) roomSockets.set(room, new Map());
  roomSockets.get(room).set(socketId, metadata);
}

function unregisterSocketFromRoom(room, socketId) {
  if (roomSockets.has(room)) {
    roomSockets.get(room).delete(socketId);
  }
}

function getExpectedRecipientSocketIds(room) {
  if (!roomSockets.has(room)) return [];
  return Array.from(roomSockets.get(room).keys());
}

// Tracked broadcast events: eventId -> { type, room, senderSocketId, clientTimestamp, expectedRecipients: Set, receivedRecipients: Set, duplicates }
const trackedEvents = new Map();

function registerSentEvent(type, eventId, room, senderSocketId, clientTimestamp) {
  if (metrics.events[type]) {
    metrics.events[type].sent++;
  }
  const expectedSockets = getExpectedRecipientSocketIds(room);
  trackedEvents.set(eventId, {
    type,
    eventId,
    room,
    senderSocketId,
    clientTimestamp,
    sentAt: Date.now(),
    expectedRecipients: new Set(expectedSockets),
    receivedRecipients: new Set(),
    duplicates: 0,
  });
}

function registerReceivedEvent(type, eventId, clientTimestamp, receiverSocketId) {
  const record = trackedEvents.get(eventId);
  if (!record) {
    if (metrics.events[type]) {
      metrics.events[type].actual++;
      const latency = clientTimestamp ? Date.now() - clientTimestamp : null;
      if (latency !== null && latency >= 0) metrics.events[type].latencies.push(latency);
    }
    return;
  }

  if (record.receivedRecipients.has(receiverSocketId)) {
    record.duplicates++;
    if (metrics.events[type]) metrics.events[type].duplicates++;
  } else {
    record.receivedRecipients.add(receiverSocketId);
    if (metrics.events[type]) metrics.events[type].actual++;
    const latency = clientTimestamp ? Date.now() - clientTimestamp : null;
    if (latency !== null && latency >= 0) {
      metrics.events[type].latencies.push(latency);
    }
  }
}

function finalizeEventMetrics() {
  for (const type of ["code", "snapshot", "message"]) {
    metrics.events[type].expected = 0;
  }
  for (const [eventId, record] of trackedEvents.entries()) {
    if (metrics.events[record.type]) {
      metrics.events[record.type].expected += record.expectedRecipients.size;
    }
  }
  for (const type of ["code", "snapshot", "message"]) {
    const m = metrics.events[type];
    m.missing = Math.max(0, m.expected - m.actual);
    m.deliveryRate = m.expected > 0 ? ((m.actual / m.expected) * 100).toFixed(2) : (m.sent === 0 ? "100.00" : "0.00");
  }
}

// ============================================================================
// RESOURCE UTILIZATION MONITORING
// ============================================================================
const resourceMetrics = {
  socketServer: {
    available: false,
    start: null,
    peak: {
      cpuPercent: 0,
      rssMb: 0,
      heapUsedMb: 0,
      heapTotalMb: 0,
      activeSockets: 0,
      eventLoopLagP95: 0,
      eventLoopLagMax: 0,
    },
    end: null,
  },
  runner: {
    start: null,
    peak: {
      cpuPercent: 0,
      rssMb: 0,
      heapUsedMb: 0,
    },
    end: null,
  },
};

let lastRunnerCpu = process.cpuUsage();
let lastRunnerTime = Date.now();

function sampleRunnerMetrics() {
  const diffCpu = process.cpuUsage(lastRunnerCpu);
  const diffTime = Math.max(1, Date.now() - lastRunnerTime);
  lastRunnerCpu = process.cpuUsage();
  lastRunnerTime = Date.now();

  const totalMicro = diffCpu.user + diffCpu.system;
  const cpuPercent = Math.min(100, Math.round((totalMicro / (diffTime * 1000 * 100)) * 100) / 100);
  const mem = process.memoryUsage();
  const rssMb = Math.round((mem.rss / 1024 / 1024) * 100) / 100;
  const heapUsedMb = Math.round((mem.heapUsed / 1024 / 1024) * 100) / 100;

  const current = { cpuPercent, rssMb, heapUsedMb };
  if (!resourceMetrics.runner.start) resourceMetrics.runner.start = current;
  resourceMetrics.runner.end = current;

  const p = resourceMetrics.runner.peak;
  if (cpuPercent > p.cpuPercent) p.cpuPercent = cpuPercent;
  if (rssMb > p.rssMb) p.rssMb = rssMb;
  if (heapUsedMb > p.heapUsedMb) p.heapUsedMb = heapUsedMb;
  return current;
}

async function sampleSocketMetrics() {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const res = await fetch(`${socketUrl}/metrics`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      resourceMetrics.socketServer.available = true;
      if (!resourceMetrics.socketServer.start) resourceMetrics.socketServer.start = data;
      resourceMetrics.socketServer.end = data;

      const p = resourceMetrics.socketServer.peak;
      if (data.cpu?.percent > p.cpuPercent) p.cpuPercent = data.cpu.percent;
      if (data.memory?.rssMb > p.rssMb) p.rssMb = data.memory.rssMb;
      if (data.memory?.heapUsedMb > p.heapUsedMb) p.heapUsedMb = data.memory.heapUsedMb;
      if (data.memory?.heapTotalMb > p.heapTotalMb) p.heapTotalMb = data.memory.heapTotalMb;
      if (data.sockets?.activeSockets > p.activeSockets) p.activeSockets = data.sockets.activeSockets;
      if (data.eventLoopLag?.p95Ms > p.eventLoopLagP95) p.eventLoopLagP95 = data.eventLoopLag.p95Ms;
      if (data.eventLoopLag?.maxMs > p.eventLoopLagMax) p.eventLoopLagMax = data.eventLoopLag.maxMs;
      return data;
    }
  } catch {}
  return null;
}

// Student code snippets
const codeSnippets = [
  `function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const diff = target - nums[i];\n    if (map.has(diff)) return [map.get(diff), i];\n    map.set(nums[i], i);\n  }\n  return [];\n}`,
  `function isPalindrome(s) {\n  const clean = s.toLowerCase().replace(/[^a-z0-9]/g, '');\n  return clean === clean.split('').reverse().join('');\n}`,
  `function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n - 1) + fibonacci(n - 2);\n}`,
  `function mergeSorted(a, b) {\n  return [...a, ...b].sort((x, y) => x - y);\n}`,
];

// ============================================================================
// 5. HTTP LAYER WITH CONCURRENT REFRESH & SESSION STATE
// ============================================================================
async function httpRequest(url, options = {}, tracker = null) {
  const startTime = Date.now();
  const timeoutMs = options.timeout || 10000;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    const duration = Date.now() - startTime;

    let data = {};
    const text = await res.text();
    try {
      data = JSON.parse(text);
    } catch {
      data = { rawText: text };
    }

    if (tracker) {
      tracker.record(res.ok, duration, !res.ok);
    }
    if (!res.ok) {
      metrics.errors.httpErrors++;
    }

    return {
      ok: res.ok,
      status: res.status,
      headers: res.headers,
      data,
      duration,
    };
  } catch (err) {
    clearTimeout(timer);
    const duration = Date.now() - startTime;
    if (tracker) {
      tracker.record(false, duration, true);
    }
    metrics.errors.httpErrors++;
    if (err.name === "AbortError") {
      metrics.errors.timeouts++;
    }
    return {
      ok: false,
      status: 0,
      headers: new Headers(),
      data: { error: err.message },
      duration,
      isTimeout: err.name === "AbortError",
    };
  }
}

// Student session handling with automatic token refresh
class StudentSession {
  constructor(index, credentials) {
    this.index = index;
    this.credentials = credentials;
    this.accessToken = null;
    this.refreshToken = null;
    this.user = null;
    this.socket = null;
  }

  async login() {
    const res = await httpRequest(
      `${baseUrl}/api/login`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: this.credentials.email,
          password: this.credentials.password,
        }),
      },
      metrics.http.login
    );

    if (res.ok && res.data?.accessToken) {
      this.accessToken = res.data.accessToken;
      this.user = res.data.user;

      // Extract refreshToken from Set-Cookie header if present
      const setCookie = res.headers.get("set-cookie") || "";
      const match = setCookie.match(/refreshToken=([^;]+)/);
      if (match) {
        this.refreshToken = match[1];
      }
      return true;
    }
    return false;
  }

  async refreshAuth() {
    metrics.auth.refreshAttempts++;
    if (!this.refreshToken) {
      metrics.auth.refreshFailed++;
      return false;
    }

    const res = await httpRequest(
      `${baseUrl}/api/login/refresh`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: `refreshToken=${this.refreshToken}`,
        },
      },
      metrics.http.refresh
    );

    if (res.ok && res.data?.accessToken) {
      this.accessToken = res.data.accessToken;
      metrics.auth.refreshSuccess++;

      const setCookie = res.headers.get("set-cookie") || "";
      const match = setCookie.match(/refreshToken=([^;]+)/);
      if (match) {
        this.refreshToken = match[1];
      }
      return true;
    }

    metrics.auth.refreshFailed++;
    return false;
  }

  async authenticatedPost(url, body, tracker) {
    let res = await httpRequest(
      url,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.accessToken}`,
        },
        body: JSON.stringify(body),
      },
      tracker
    );

    // If session expired (401), attempt refresh and retry request
    if (res.status === 401) {
      metrics.auth.sessionExpired++;
      const refreshed = await this.refreshAuth();
      if (refreshed) {
        // Retry the original request
        res = await httpRequest(
          url,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${this.accessToken}`,
            },
            body: JSON.stringify(body),
          },
          tracker
        );
        if (res.ok) {
          metrics.auth.successfulRetries++;
        }
      }
    }

    return res;
  }
}

// ============================================================================
// 6. MEETING SEARCH & MULTI-ROOM DISTRIBUTION
// ============================================================================
async function resolveMeetings(primarySession, singleMeetingQuery, meetingsConfig) {
  console.log("Resolving target meetings...");

  // 1. If explicit comma-separated list of meetings is provided
  if (meetingsConfig && meetingsConfig.includes(",")) {
    const list = meetingsConfig.split(",").map((s) => s.trim()).filter(Boolean);
    const resolved = [];
    for (const item of list) {
      const res = await primarySession.authenticatedPost(
        `${baseUrl}/api/meeting/getCurrentMeeting`,
        { query: item },
        metrics.http.search
      );
      if (res.ok && res.data?.result?.length > 0) {
        resolved.push(res.data.result[0]);
      }
    }
    if (resolved.length > 0) return resolved;
  }

  // 2. Query search
  const query = singleMeetingQuery || (meetingsConfig && !/^\d+$/.test(meetingsConfig) ? meetingsConfig : "");
  if (!query) {
    console.error("❌ Error: No meeting specified. Please specify --meeting=<slug> or --meetings=<slug1,slug2>");
    process.exit(1);
  }

  const res = await primarySession.authenticatedPost(
    `${baseUrl}/api/meeting/getCurrentMeeting`,
    { query },
    metrics.http.search
  );

  if (res.ok && res.data?.result?.length > 0) {
    const found = res.data.result;
    const requestedCount = parseInt(meetingsConfig, 10);
    if (!isNaN(requestedCount) && requestedCount > 1) {
      return found.slice(0, requestedCount);
    }
    return found;
  }

  return [];
}

// ============================================================================
// 7. SOCKET.IO CLIENT SETUP & EVENT METRICS
// ============================================================================
function setupStudentSocket(session, socketAuth, meeting, userIndex) {
  const targetRoom = meeting.url || meeting._id;
  const connectStartTime = Date.now();
  metrics.socket.attempts++;

  const socket = io(socketUrl, {
    transports: ["websocket"],
    auth: { token: socketAuth },
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  const studentCode = codeSnippets[userIndex % codeSnippets.length];
  let reconnectStartTime = null;

  // CONNECTION LIFECYCLE
  socket.on("connect", () => {
    const connectDuration = Date.now() - connectStartTime;
    metrics.socket.connected++;
    metrics.socket.connectLatencies.push(connectDuration);

    // Join the meeting room
    socket.emit("join-meeting", { meetingId: targetRoom });
    registerSocketInRoom(targetRoom, socket.id, { isStudent: true, sessionIndex: session.index });

    // Periodic Snapshots (every 6 seconds)
    const snapshotInterval = setInterval(() => {
      if (!socket.connected) return;
      const eventId = `snap_${session.index}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const clientTimestamp = Date.now();

      registerSentEvent("snapshot", eventId, targetRoom, socket.id, clientTimestamp);
      socket.emit("code-snapshot", {
        meetingId: targetRoom,
        snapshot: {
          eventId,
          code: studentCode,
          language: "javascript",
          clientTimestamp,
        },
      });
    }, 6000);

    // Periodic Code Events (every 12 seconds)
    const codeInterval = setInterval(() => {
      if (!socket.connected) return;
      const eventId = `code_${session.index}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const clientTimestamp = Date.now();

      registerSentEvent("code", eventId, targetRoom, socket.id, clientTimestamp);
      socket.emit("send-code", {
        eventId,
        code: studentCode,
        meetingId: targetRoom,
        clientTimestamp,
      });
    }, 12000);

    // Periodic Message Events (every 20 seconds)
    const messageInterval = setInterval(() => {
      if (!socket.connected) return;
      const eventId = `msg_${session.index}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const clientTimestamp = Date.now();

      registerSentEvent("message", eventId, targetRoom, socket.id, clientTimestamp);
      socket.emit("send-message", {
        eventId,
        text: `Student ${session.index + 1} check-in`,
        meetingId: targetRoom,
        clientTimestamp,
      });
    }, 20000);

    socket._intervals = [snapshotInterval, codeInterval, messageInterval];
  });

  socket.on("connect_error", (err) => {
    metrics.socket.failed++;
    metrics.socket.errors++;
    metrics.errors.socketErrors++;
  });

  // RECONNECTION METRICS
  socket.io.on("reconnect_attempt", () => {
    metrics.socket.reconnectAttempts++;
    reconnectStartTime = Date.now();
  });

  socket.on("reconnect", () => {
    metrics.socket.reconnectSuccess++;
    if (reconnectStartTime) {
      const recLatency = Date.now() - reconnectStartTime;
      metrics.socket.reconnectLatencies.push(recLatency);
      reconnectStartTime = null;
    }
  });

  socket.io.on("reconnect_failed", () => {
    metrics.socket.reconnectFailed++;
    metrics.errors.socketErrors++;
  });

  socket.on("disconnect", (reason) => {
    unregisterSocketFromRoom(targetRoom, socket.id);
    metrics.socket.disconnects++;
    if (reason !== "io client disconnect") {
      metrics.socket.unexpectedDisconnects++;
      metrics.errors.unexpectedDisconnects++;
    }
    if (socket._intervals) {
      socket._intervals.forEach((id) => clearInterval(id));
    }
  });

  // EVENT LISTENERS
  socket.on("receive-code-snapshot", (data) => {
    const snap = data?.snapshot;
    if (snap?.eventId) {
      registerReceivedEvent("snapshot", snap.eventId, snap.clientTimestamp, socket.id);
    }
  });

  socket.on("receive-code", (data) => {
    if (data?.eventId) {
      registerReceivedEvent("code", data.eventId, data.clientTimestamp, socket.id);
    }
  });

  socket.on("receive-message", (data) => {
    if (data?.eventId) {
      registerReceivedEvent("message", data.eventId, data.clientTimestamp, socket.id);
    }
  });

  // TEACHER CODE INSPECTION RESPONSE (Student side)
  socket.on("get-current-code", ({ requestId, meetingId: reqMeetingId }) => {
    socket.emit("student-code-response", {
      requestId,
      meetingId: reqMeetingId,
      code: studentCode,
      language: "javascript",
    });
  });

  session.socket = socket;
  return socket;
}

// ============================================================================
// 8. SIMULATED TEACHER WORKLOAD (Inspection round-trip)
// ============================================================================
function setupSimulatedTeacher(meeting, activeStudentSessions) {
  const targetRoom = meeting.url || meeting._id;
  const teacherId = meeting.admin || `teacher_${targetRoom}`;

  // Generate authentic teacher JWT
  const teacherToken = jwt.sign(
    {
      id: teacherId,
      username: meeting.adminName || "LoadTest_Teacher",
      isHost: true,
      role: "teacher",
      meetingId: meeting._id ? meeting._id.toString() : targetRoom,
      meetingUrl: meeting.url || targetRoom,
    },
    JWT_SECRET,
    { expiresIn: "2h" }
  );

  const teacherSocket = io(socketUrl, {
    transports: ["websocket"],
    auth: { token: teacherToken },
    reconnection: false,
    timeout: 10000,
  });

  const pendingTeacherRequests = new Map();

  teacherSocket.on("connect", () => {
    teacherSocket.emit("join-meeting", { meetingId: targetRoom });
    registerSocketInRoom(targetRoom, teacherSocket.id, { isTeacher: true });

    // Periodically inspect a student (every 5 seconds)
    const inspectionInterval = setInterval(() => {
      if (!teacherSocket.connected) return;

      const roomStudents = activeStudentSessions.filter(
        (s) => s.targetRoom === targetRoom && s.user?.id
      );
      if (roomStudents.length === 0) return;

      const targetStudent = roomStudents[Math.floor(Math.random() * roomStudents.length)];
      const studentId = targetStudent.user.id;
      const requestId = `insp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const requestStartTime = Date.now();

      metrics.events.teacherInspection.requests++;

      const timeoutTimer = setTimeout(() => {
        if (pendingTeacherRequests.has(requestId)) {
          pendingTeacherRequests.delete(requestId);
          metrics.events.teacherInspection.timeouts++;
          metrics.events.teacherInspection.failed++;
          metrics.errors.timeouts++;
        }
      }, 5000);

      pendingTeacherRequests.set(requestId, {
        requestStartTime,
        timeoutTimer,
      });

      teacherSocket.emit("request-student-code", {
        requestId,
        meetingId: targetRoom,
        studentId,
      });
    }, 5000);

    teacherSocket._interval = inspectionInterval;
  });

  teacherSocket.on("receive-code-snapshot", (data) => {
    const snap = data?.snapshot;
    if (snap?.eventId) {
      registerReceivedEvent("snapshot", snap.eventId, snap.clientTimestamp, teacherSocket.id);
    }
  });

  teacherSocket.on("receive-code", (data) => {
    if (data?.eventId) {
      registerReceivedEvent("code", data.eventId, data.clientTimestamp, teacherSocket.id);
    }
  });

  teacherSocket.on("receive-message", (data) => {
    if (data?.eventId) {
      registerReceivedEvent("message", data.eventId, data.clientTimestamp, teacherSocket.id);
    }
  });

  teacherSocket.on("receive-student-code", ({ requestId }) => {
    if (pendingTeacherRequests.has(requestId)) {
      const { requestStartTime, timeoutTimer } = pendingTeacherRequests.get(requestId);
      clearTimeout(timeoutTimer);
      pendingTeacherRequests.delete(requestId);

      const latency = Date.now() - requestStartTime;
      metrics.events.teacherInspection.success++;
      metrics.events.teacherInspection.latencies.push(latency);
    }
  });

  teacherSocket.on("student-code-error", ({ requestId }) => {
    if (pendingTeacherRequests.has(requestId)) {
      const { timeoutTimer } = pendingTeacherRequests.get(requestId);
      clearTimeout(timeoutTimer);
      pendingTeacherRequests.delete(requestId);
      metrics.events.teacherInspection.failed++;
    }
  });

  teacherSocket.on("disconnect", () => {
    unregisterSocketFromRoom(targetRoom, teacherSocket.id);
  });

  return teacherSocket;
}

// ============================================================================
// 9. FINAL STRUCTURED REPORT
// ============================================================================
function printFinalReport(targetUsers, targetMeetings, timing) {
  const loginStats = metrics.http.login.getStats();
  const searchStats = metrics.http.search.getStats();
  const joinStats = metrics.http.join.getStats();
  const refreshStats = metrics.http.refresh.getStats();
  const connStats = calculateLatencyStats(metrics.socket.connectLatencies);
  const teacherStats = calculateLatencyStats(metrics.events.teacherInspection.latencies);
  const snapStats = calculateLatencyStats(metrics.events.snapshot.latencies);
  const codeStats = calculateLatencyStats(metrics.events.code.latencies);
  const msgStats = calculateLatencyStats(metrics.events.message.latencies);

  console.log("\n=================================================================");
  console.log("            🎓 TEACHVIEW LIVE LOAD TEST FINAL REPORT 🎓           ");
  console.log("=================================================================");

  console.log("\n1. TEST CONFIGURATION & TIMING BREAKDOWN");
  console.log("-----------------------------------------------------------------");
  console.log(`Target Students          : ${targetUsers}`);
  console.log(`Configured Load Window   : ${testDurationSec}s`);
  console.log(`Target Meeting(s)        : ${targetMeetings.map((m) => m.url || m._id).join(", ")}`);
  console.log(`Web App URL              : ${baseUrl}`);
  console.log(`Socket Server URL        : ${socketUrl}`);
  console.log(`Ramp Interval            : ${rampIntervalMs} ms / student`);
  console.log(".................................................................");
  console.log(`Setup Duration           : ${timing.setupDurationSec}s (student 0 login & meeting discovery)`);
  console.log(`Ramp-Up Duration         : ${timing.rampUpDurationSec}s (staggered login & room join)`);
  console.log(`Active Load Duration     : ${timing.activeLoadDurationSec}s (sustained load testing phase)`);
  console.log(`Grace Period Duration    : ${timing.graceDurationSec}s (in-flight event flush)`);
  console.log(`Cleanup Duration         : ${timing.cleanupDurationSec}s (clean socket teardown)`);
  console.log(`TOTAL WALL-CLOCK TIME    : ${timing.totalWallClockSec}s`);

  console.log("\n2. RESOURCE UTILIZATION");
  console.log("-----------------------------------------------------------------");
  if (resourceMetrics.socketServer.available && resourceMetrics.socketServer.start) {
    const sStart = resourceMetrics.socketServer.start;
    const sPeak = resourceMetrics.socketServer.peak;
    const sEnd = resourceMetrics.socketServer.end || sStart;
    console.log(`Socket.IO Server (${socketUrl}):`);
    console.log(`  Metric                   Start          Peak           End`);
    console.log(`  CPU Usage                ${String((sStart.cpu?.percent || 0).toFixed(2) + "%").padEnd(14, " ")} ${String(sPeak.cpuPercent.toFixed(2) + "%").padEnd(14, " ")} ${(sEnd.cpu?.percent || 0).toFixed(2)}%`);
    console.log(`  Memory RSS               ${String((sStart.memory?.rssMb || 0).toFixed(2) + " MB").padEnd(14, " ")} ${String(sPeak.rssMb.toFixed(2) + " MB").padEnd(14, " ")} ${(sEnd.memory?.rssMb || 0).toFixed(2)} MB`);
    console.log(`  Heap Used                ${String((sStart.memory?.heapUsedMb || 0).toFixed(2) + " MB").padEnd(14, " ")} ${String(sPeak.heapUsedMb.toFixed(2) + " MB").padEnd(14, " ")} ${(sEnd.memory?.heapUsedMb || 0).toFixed(2)} MB`);
    console.log(`  Heap Total               ${String((sStart.memory?.heapTotalMb || 0).toFixed(2) + " MB").padEnd(14, " ")} ${String(sPeak.heapTotalMb.toFixed(2) + " MB").padEnd(14, " ")} ${(sEnd.memory?.heapTotalMb || 0).toFixed(2)} MB`);
    console.log(`  Active Sockets           ${String(sStart.sockets?.activeSockets ?? 0).padEnd(14, " ")} ${String(sPeak.activeSockets).padEnd(14, " ")} ${sEnd.sockets?.activeSockets ?? 0}`);
    if (sEnd.eventLoopLag) {
      console.log(`  Event Loop Lag (Server)  P50: ${sEnd.eventLoopLag.p50Ms} ms | P95: ${sPeak.eventLoopLagP95 || sEnd.eventLoopLag.p95Ms} ms | P99: ${sEnd.eventLoopLag.p99Ms} ms | Max: ${sPeak.eventLoopLagMax || sEnd.eventLoopLag.maxMs} ms`);
    }
  } else {
    console.log(`Socket.IO Server metrics not exposed via /metrics (using internal test metrics)`);
  }

  if (resourceMetrics.runner.start) {
    const rStart = resourceMetrics.runner.start;
    const rPeak = resourceMetrics.runner.peak;
    const rEnd = resourceMetrics.runner.end || rStart;
    console.log(`\nTest Runner Process:`);
    console.log(`  Metric                   Start          Peak           End`);
    console.log(`  CPU Usage                ${String(rStart.cpuPercent.toFixed(2) + "%").padEnd(14, " ")} ${String(rPeak.cpuPercent.toFixed(2) + "%").padEnd(14, " ")} ${rEnd.cpuPercent.toFixed(2)}%`);
    console.log(`  Memory RSS               ${String(rStart.rssMb.toFixed(2) + " MB").padEnd(14, " ")} ${String(rPeak.rssMb.toFixed(2) + " MB").padEnd(14, " ")} ${rEnd.rssMb.toFixed(2)} MB`);
    console.log(`  Heap Used                ${String(rStart.heapUsedMb.toFixed(2) + " MB").padEnd(14, " ")} ${String(rPeak.heapUsedMb.toFixed(2) + " MB").padEnd(14, " ")} ${rEnd.heapUsedMb.toFixed(2)} MB`);
  }

  console.log("\n3. HTTP PERFORMANCE");
  console.log("-----------------------------------------------------------------");
  console.log("LOGIN");
  console.log(`Requests                 : ${loginStats.total}`);
  console.log(`Successful               : ${loginStats.success}`);
  console.log(`Failed                   : ${loginStats.failed}`);
  console.log(`Min                      : ${loginStats.min} ms`);
  console.log(`Avg                      : ${loginStats.avg} ms`);
  console.log(`P50                      : ${loginStats.p50} ms`);
  console.log(`P90                      : ${loginStats.p90} ms`);
  console.log(`P95                      : ${loginStats.p95} ms`);
  console.log(`P99                      : ${loginStats.p99} ms`);
  console.log(`Max                      : ${loginStats.max} ms`);

  console.log("\nMEETING SEARCH");
  console.log(`Requests                 : ${searchStats.total}`);
  console.log(`Successful               : ${searchStats.success}`);
  console.log(`Failed                   : ${searchStats.failed}`);
  console.log(`Min                      : ${searchStats.min} ms`);
  console.log(`Avg                      : ${searchStats.avg} ms`);
  console.log(`P50                      : ${searchStats.p50} ms`);
  console.log(`P95                      : ${searchStats.p95} ms`);
  console.log(`Max                      : ${searchStats.max} ms`);

  console.log("\nJOIN MEETING");
  console.log(`Requests                 : ${joinStats.total}`);
  console.log(`Successful               : ${joinStats.success}`);
  console.log(`Failed                   : ${joinStats.failed}`);
  console.log(`Min                      : ${joinStats.min} ms`);
  console.log(`Avg                      : ${joinStats.avg} ms`);
  console.log(`P50                      : ${joinStats.p50} ms`);
  console.log(`P95                      : ${joinStats.p95} ms`);
  console.log(`Max                      : ${joinStats.max} ms`);

  if (refreshStats.total > 0) {
    console.log("\nREFRESH TOKEN");
    console.log(`Requests                 : ${refreshStats.total}`);
    console.log(`Successful               : ${refreshStats.success}`);
    console.log(`Failed                   : ${refreshStats.failed}`);
    console.log(`P95                      : ${refreshStats.p95} ms`);
  }

  console.log("\n4. SOCKET.IO CONNECTION PERFORMANCE");
  console.log("-----------------------------------------------------------------");
  console.log(`Attempts                 : ${metrics.socket.attempts}`);
  console.log(`Successful               : ${metrics.socket.connected}`);
  console.log(`Failed                   : ${metrics.socket.failed}`);
  console.log("\nConnect Latency");
  console.log(`Min                      : ${connStats.min} ms`);
  console.log(`Avg                      : ${connStats.avg} ms`);
  console.log(`P50                      : ${connStats.p50} ms`);
  console.log(`P90                      : ${connStats.p90} ms`);
  console.log(`P95                      : ${connStats.p95} ms`);
  console.log(`P99                      : ${connStats.p99} ms`);
  console.log(`Max                      : ${connStats.max} ms`);

  console.log("\nDisconnections & Reconnects");
  console.log(`Total Disconnects        : ${metrics.socket.disconnects}`);
  console.log(`Unexpected Disconnects   : ${metrics.socket.unexpectedDisconnects}`);
  console.log(`Reconnect Attempts       : ${metrics.socket.reconnectAttempts}`);
  console.log(`Reconnect Success        : ${metrics.socket.reconnectSuccess}`);
  console.log(`Reconnect Failed         : ${metrics.socket.reconnectFailed}`);

  console.log("\n5. REAL-TIME CODE EVENTS (send-code -> receive-code)");
  console.log("-----------------------------------------------------------------");
  console.log(`Sent                     : ${metrics.events.code.sent}`);
  console.log(`Expected Deliveries      : ${metrics.events.code.expected}`);
  console.log(`Actual Deliveries        : ${metrics.events.code.actual}`);
  console.log(`Missing Deliveries       : ${metrics.events.code.missing}`);
  console.log(`Duplicate Deliveries     : ${metrics.events.code.duplicates}`);
  console.log(`Delivery Rate            : ${metrics.events.code.deliveryRate}%`);
  console.log(`Min Latency              : ${codeStats.min} ms`);
  console.log(`Avg Latency              : ${codeStats.avg} ms`);
  console.log(`P50 Latency              : ${codeStats.p50} ms`);
  console.log(`P90 Latency              : ${codeStats.p90} ms`);
  console.log(`P95 Latency              : ${codeStats.p95} ms`);
  console.log(`P99 Latency              : ${codeStats.p99} ms`);
  console.log(`Max Latency              : ${codeStats.max} ms`);

  console.log("\n6. SNAPSHOT BROADCAST PERFORMANCE (code-snapshot -> receive-code-snapshot)");
  console.log("-----------------------------------------------------------------");
  console.log(`Sent                     : ${metrics.events.snapshot.sent}`);
  console.log(`Expected Deliveries      : ${metrics.events.snapshot.expected}`);
  console.log(`Actual Deliveries        : ${metrics.events.snapshot.actual}`);
  console.log(`Missing Deliveries       : ${metrics.events.snapshot.missing}`);
  console.log(`Duplicate Deliveries     : ${metrics.events.snapshot.duplicates}`);
  console.log(`Delivery Rate            : ${metrics.events.snapshot.deliveryRate}%`);
  console.log(`Min Latency              : ${snapStats.min} ms`);
  console.log(`Avg Latency              : ${snapStats.avg} ms`);
  console.log(`P50 Latency              : ${snapStats.p50} ms`);
  console.log(`P90 Latency              : ${snapStats.p90} ms`);
  console.log(`P95 Latency              : ${snapStats.p95} ms`);
  console.log(`P99 Latency              : ${snapStats.p99} ms`);
  console.log(`Max Latency              : ${snapStats.max} ms`);

  console.log("\n7. CHAT MESSAGE EVENTS (send-message -> receive-message)");
  console.log("-----------------------------------------------------------------");
  console.log(`Sent                     : ${metrics.events.message.sent}`);
  console.log(`Expected Deliveries      : ${metrics.events.message.expected}`);
  console.log(`Actual Deliveries        : ${metrics.events.message.actual}`);
  console.log(`Missing Deliveries       : ${metrics.events.message.missing}`);
  console.log(`Duplicate Deliveries     : ${metrics.events.message.duplicates}`);
  console.log(`Delivery Rate            : ${metrics.events.message.deliveryRate}%`);
  console.log(`Min Latency              : ${msgStats.min} ms`);
  console.log(`Avg Latency              : ${msgStats.avg} ms`);
  console.log(`P50 Latency              : ${msgStats.p50} ms`);
  console.log(`P95 Latency              : ${msgStats.p95} ms`);
  console.log(`P99 Latency              : ${msgStats.p99} ms`);
  console.log(`Max Latency              : ${msgStats.max} ms`);

  console.log("\n8. TEACHER CODE INSPECTION PERFORMANCE");
  console.log("-----------------------------------------------------------------");
  console.log(`Requests                 : ${metrics.events.teacherInspection.requests}`);
  console.log(`Successful               : ${metrics.events.teacherInspection.success}`);
  console.log(`Failed                   : ${metrics.events.teacherInspection.failed}`);
  console.log(`Timeouts                 : ${metrics.events.teacherInspection.timeouts}`);
  console.log(`Min Latency              : ${teacherStats.min} ms`);
  console.log(`Avg Latency              : ${teacherStats.avg} ms`);
  console.log(`P50 Latency              : ${teacherStats.p50} ms`);
  console.log(`P95 Latency              : ${teacherStats.p95} ms`);
  console.log(`P99 Latency              : ${teacherStats.p99} ms`);
  console.log(`Max Latency              : ${teacherStats.max} ms`);

  console.log("\n9. AUTHENTICATION, ROOM DISTRIBUTION & ERROR AUDIT");
  console.log("-----------------------------------------------------------------");
  console.log(`Session Expired          : ${metrics.auth.sessionExpired}`);
  console.log(`Refresh Attempts         : ${metrics.auth.refreshAttempts}`);
  console.log(`Refresh Success          : ${metrics.auth.refreshSuccess}`);
  console.log(`Refresh Failed           : ${metrics.auth.refreshFailed}`);
  console.log(`Successful Retries       : ${metrics.auth.successfulRetries}`);
  console.log("\nRoom Distribution:");
  const rooms = Object.keys(metrics.roomDistribution);
  if (rooms.length > 0) {
    rooms.forEach((room, idx) => {
      console.log(`  Meeting ${idx + 1} (${room.padEnd(25, " ")}) : ${metrics.roomDistribution[room]} students`);
    });
  } else {
    console.log("  None");
  }

  console.log("\nErrors & Timeouts:");
  console.log(`  HTTP Errors            : ${metrics.errors.httpErrors}`);
  console.log(`  Socket Errors          : ${metrics.errors.socketErrors}`);
  console.log(`  Timeouts               : ${metrics.errors.timeouts}`);
  console.log(`  Unexpected Disconnects : ${metrics.errors.unexpectedDisconnects}`);
  console.log("=================================================================\n");
}

// ============================================================================
// 10. MAIN TEST ORCHESTRATION
// ============================================================================
async function main() {
  const timing = {
    scriptStartTime: Date.now(),
    setupDurationSec: "0.00",
    rampUpDurationSec: "0.00",
    activeLoadDurationSec: "0.00",
    graceDurationSec: "0.00",
    cleanupDurationSec: "0.00",
    totalWallClockSec: "0.00",
  };

  console.log("=================================================================");
  console.log("     🎓 TEACHVIEW LIVE REAL-WORLD PERFORMANCE & RELIABILITY TEST 🎓");
  console.log("=================================================================");
  console.log(` Web App URL     : ${baseUrl}`);
  console.log(` Socket Server   : ${socketUrl}`);
  console.log(` Target Users    : ${targetUsers} students`);
  console.log(` Test Duration   : ${testDurationSec} seconds`);
  console.log(` Ramp Interval   : ${rampIntervalMs}ms`);
  console.log(` Meeting Query   : "${meetingQuery || meetingsArg}"`);
  console.log("-----------------------------------------------------------------\n");

  if (!meetingQuery && !meetingsArg) {
    console.error("❌ Error: Please specify a meeting with --meeting=<name> or --meetings=<name-or-count>");
    console.error("   Example: node k6-tests/full-flow-test.js 10 --meeting=load-test-meeting-101");
    process.exit(1);
  }

  // Initial resource sample
  await sampleSocketMetrics();
  sampleRunnerMetrics();

  // 1. Prepare User Sessions
  const sessions = [];
  for (let i = 0; i < targetUsers; i++) {
    let credentials = allUsers[i];
    if (!credentials) {
      credentials = {
        email: `loadtest_student_${String(i + 1).padStart(3, "0")}@example.com`,
        password: "LoadTest@2026",
      };
    }
    sessions.push(new StudentSession(i, credentials));
  }

  // 2. Setup Phase: Discover meetings & connect teacher
  const setupStart = Date.now();
  console.log(`[SETUP] Logging in student 1 (${sessions[0].credentials.email}) to discover meeting room(s)...`);
  const initialLoginOk = await sessions[0].login();
  if (!initialLoginOk) {
    console.error("❌ Fatal: Initial login failed. Please ensure your backend is running and 'node k6-tests/seed-users.js' was executed.");
    process.exit(1);
  }

  const targetMeetings = await resolveMeetings(sessions[0], meetingQuery, meetingsArg);
  if (!targetMeetings || targetMeetings.length === 0) {
    console.error(`❌ Fatal: No active meetings found matching query "${meetingQuery || meetingsArg}".`);
    console.error("   Tip: Create a meeting in your browser as teacher first, then pass its URL slug or name.");
    process.exit(1);
  }

  console.log(`✅ Found ${targetMeetings.length} target meeting(s):`);
  targetMeetings.forEach((m, idx) => console.log(`   [${idx + 1}] ID: ${m._id} | URL: ${m.url || "none"}`));

  const teacherSockets = [];
  targetMeetings.forEach((meeting) => {
    try {
      const ts = setupSimulatedTeacher(meeting, sessions);
      teacherSockets.push(ts);
    } catch (err) {
      console.warn("⚠️ Warning: Simulated teacher could not connect (JWT secret may not match):", err.message);
    }
  });

  timing.setupDurationSec = ((Date.now() - setupStart) / 1000).toFixed(2);

  // 3. Ramp-up Phase: Staggered user flow execution
  const rampUpStart = Date.now();
  console.log(`\n🚀 [RAMP-UP] Deploying ${targetUsers} students across ${targetMeetings.length} meeting(s)...`);

  for (let i = 0; i < targetUsers; i++) {
    const session = sessions[i];
    const meeting = targetMeetings[i % targetMeetings.length];
    const targetRoom = meeting.url || meeting._id;
    session.targetRoom = targetRoom;

    metrics.roomDistribution[targetRoom] = (metrics.roomDistribution[targetRoom] || 0) + 1;

    // Execute Login (student 0 already logged in above)
    if (i > 0) {
      const loginOk = await session.login();
      if (!loginOk) {
        console.log(`\n❌ [Student ${i + 1}] Login failed for ${session.credentials.email}`);
        continue;
      }
    }

    // Join Meeting via HTTP API
    const joinRes = await session.authenticatedPost(
      `${baseUrl}/api/joinmeeting`,
      { meetingId: meeting._id },
      metrics.http.join
    );

    if (!joinRes.ok || !joinRes.data?.socketAuth) {
      console.log(`\n❌ [Student ${i + 1}] Join meeting API failed`);
      continue;
    }

    // Connect Socket.IO
    setupStudentSocket(session, joinRes.data.socketAuth, meeting, i);

    const elapsedRamp = Math.round((Date.now() - rampUpStart) / 1000);
    process.stdout.write(
      `\r🚀 [RAMPING UP ${elapsedRamp}s] Students Online: ${metrics.socket.connected}/${targetUsers} | Logins: ${metrics.http.login.success}/${targetUsers}`
    );

    await new Promise((r) => setTimeout(r, rampIntervalMs));
  }

  timing.rampUpDurationSec = ((Date.now() - rampUpStart) / 1000).toFixed(2);
  console.log(`\n✅ Ramp-up complete in ${timing.rampUpDurationSec}s! All ${targetUsers} students deployed.`);
  console.log(`\n=================================================================`);
  console.log(`⚡ ACTIVE LOAD PHASE: Sustained ${testDurationSec}s load test running...`);
  console.log(`=================================================================`);

  // 4. Active Load Phase
  const activeLoadStart = Date.now();

  const metricSampler = setInterval(async () => {
    await sampleSocketMetrics();
    sampleRunnerMetrics();
  }, 2000);

  const ticker = setInterval(() => {
    const elapsed = Math.min(testDurationSec, Math.round((Date.now() - activeLoadStart) / 1000));
    const activeSockets = metrics.socket.connected - metrics.socket.disconnects;
    process.stdout.write(
      `\r⏱️  [ACTIVE LOAD ${elapsed}s/${testDurationSec}s] Active Sockets: ${activeSockets}/${targetUsers} | ` +
      `Code Events: ${metrics.events.code.actual} recv | Snapshots: ${metrics.events.snapshot.actual} recv | ` +
      `Inspections: ${metrics.events.teacherInspection.success} | HTTP Err: ${metrics.errors.httpErrors}   `
    );
  }, 1000);

  await new Promise((resolve) => setTimeout(resolve, testDurationSec * 1000));

  clearInterval(ticker);
  clearInterval(metricSampler);
  timing.activeLoadDurationSec = ((Date.now() - activeLoadStart) / 1000).toFixed(2);

  // 5. Grace Period
  console.log("\n\n🛑 Active load complete. Allowing 2s grace period for in-flight events...");
  const graceStart = Date.now();
  await new Promise((resolve) => setTimeout(resolve, 2000));
  timing.graceDurationSec = ((Date.now() - graceStart) / 1000).toFixed(2);

  // 6. Cleanup Phase
  console.log("Disconnecting all sockets cleanly...");
  const cleanupStart = Date.now();
  sessions.forEach((s) => {
    if (s.socket) {
      if (s.socket._intervals) s.socket._intervals.forEach((id) => clearInterval(id));
      s.socket.disconnect();
    }
  });
  teacherSockets.forEach((ts) => {
    if (ts._interval) clearInterval(ts._interval);
    ts.disconnect();
  });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  timing.cleanupDurationSec = ((Date.now() - cleanupStart) / 1000).toFixed(2);

  // Final metric samples & aggregation
  await sampleSocketMetrics();
  sampleRunnerMetrics();
  finalizeEventMetrics();

  timing.totalWallClockSec = ((Date.now() - timing.scriptStartTime) / 1000).toFixed(2);

  // Print Structured Final Report
  printFinalReport(targetUsers, targetMeetings, timing);
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error in load test runner:", err);
  process.exit(1);
});
