import { io } from "socket.io-client";
import jwt from "jsonwebtoken";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper: load socket/.env manually to avoid dependency issues
function loadEnv() {
  const envPaths = [
    path.resolve(__dirname, "../socket/.env"),
    path.resolve(__dirname, "../.env"),
  ];
  for (const p of envPaths) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [k, ...v] = trimmed.split("=");
          const val = v.join("=").trim().replace(/^["']|["']$/g, "");
          if (!process.env[k.trim()]) {
            process.env[k.trim()] = val;
          }
        }
      }
    }
  }
}
loadEnv();

// Parse CLI arguments: node socket-load-test.js [users] [--duration=sec] [--url=url]
const args = process.argv.slice(2);
let targetUsers = 10;
let testDurationSec = 30;
let socketUrl = process.env.SOCKET_URL || `http://localhost:${process.env.PORT || 4000}`;
let meetingId = "load-test-meeting-101";

for (const arg of args) {
  if (/^\d+$/.test(arg)) {
    targetUsers = parseInt(arg, 10);
  } else if (arg.startsWith("--users=")) {
    targetUsers = parseInt(arg.split("=")[1], 10);
  } else if (arg.startsWith("--duration=")) {
    testDurationSec = parseInt(arg.split("=")[1], 10);
  } else if (arg.startsWith("--url=")) {
    socketUrl = arg.split("=")[1];
  } else if (arg.startsWith("--meeting=")) {
    meetingId = arg.split("=")[1];
  }
}

const JWT_SECRET = process.env.SOCKET_JWT_SECRET || "AMANNAGAR_SOCKET";
const RAMP_DELAY_MS = 50; // Delay between client connections to stagger traffic

// Metrics
const stats = {
  attempted: 0,
  connected: 0,
  failed: 0,
  disconnected: 0,
  messagesSent: 0,
  messagesReceived: 0,
  connectTimes: [],
  msgLatencies: [],
};

function generateToken(userId, isHost = false) {
  return jwt.sign(
    {
      id: `user-${userId}`,
      username: isHost ? "Teacher_Host" : `Student_${userId}`,
      isHost,
      role: isHost ? "teacher" : "student",
      meetingId,
      meetingUrl: meetingId,
    },
    JWT_SECRET,
    { expiresIn: "2h" }
  );
}

function percentile(arr, p) {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

function createClient(userId) {
  const isHost = userId === 1;
  const token = generateToken(userId, isHost);
  const connectStart = Date.now();
  stats.attempted++;

  const socket = io(socketUrl, {
    transports: ["websocket"],
    auth: { token },
    reconnection: false,
    timeout: 10000,
  });

  socket.on("connect", () => {
    stats.connected++;
    const handshakeDuration = Date.now() - connectStart;
    stats.connectTimes.push(handshakeDuration);

    // 1. Join the meeting
    socket.emit("join-meeting", { meetingId });

    // 2. Periodic snapshot / message broadcast (every 3 seconds)
    const interval = setInterval(() => {
      if (!socket.connected) {
        clearInterval(interval);
        return;
      }

      const clientTimestamp = Date.now();
      socket.emit("code-snapshot", {
        meetingId,
        snapshot: {
          code: `// Snapshot from user ${userId} at ${new Date().toISOString()}`,
          clientTimestamp,
        },
      });
      stats.messagesSent++;
    }, 3000);

    socket._interval = interval;
  });

  socket.on("receive-code-snapshot", (data) => {
    stats.messagesReceived++;
    if (data?.snapshot?.clientTimestamp) {
      const rtt = Date.now() - data.snapshot.clientTimestamp;
      if (rtt >= 0 && rtt < 60000) {
        stats.msgLatencies.push(rtt);
      }
    }
  });

  socket.on("connect_error", (err) => {
    stats.failed++;
  });

  socket.on("disconnect", () => {
    stats.disconnected++;
    if (socket._interval) clearInterval(socket._interval);
  });

  return socket;
}

async function run() {
  console.log("===============================================================");
  console.log("             🔥 SOCKET.IO LOAD TEST RUNNER 🔥                  ");
  console.log("===============================================================");
  console.log(` Target Server : ${socketUrl}`);
  console.log(` Meeting Room  : ${meetingId}`);
  console.log(` Target Users  : ${targetUsers} concurrent connections`);
  console.log(` Duration      : ${testDurationSec} seconds`);
  console.log(` JWT Secret    : ${JWT_SECRET ? "Loaded (Valid)" : "MISSING!"}`);
  console.log("---------------------------------------------------------------");
  console.log(`Connecting ${targetUsers} clients (staggered by ${RAMP_DELAY_MS}ms)...`);

  const sockets = [];
  const testStartTime = Date.now();

  // Staggered connection
  for (let i = 1; i <= targetUsers; i++) {
    sockets.push(createClient(i));
    await new Promise((r) => setTimeout(r, RAMP_DELAY_MS));
  }

  // Real-time live status ticker
  const ticker = setInterval(() => {
    const elapsed = Math.round((Date.now() - testStartTime) / 1000);
    const avgConnect = stats.connectTimes.length
      ? (stats.connectTimes.reduce((a, b) => a + b, 0) / stats.connectTimes.length).toFixed(1)
      : "0";
    const avgLatency = stats.msgLatencies.length
      ? (stats.msgLatencies.reduce((a, b) => a + b, 0) / stats.msgLatencies.length).toFixed(1)
      : "0";

    process.stdout.write(
      `\r⏱️  [${elapsed}s/${testDurationSec}s] Active: ${stats.connected - stats.disconnected}/${targetUsers} | ` +
      `Failed: ${stats.failed} | Sent: ${stats.messagesSent} | Recv: ${stats.messagesReceived} | ` +
      `Avg RTT: ${avgLatency}ms   `
    );
  }, 1000);

  // Wait for test duration
  await new Promise((resolve) => setTimeout(resolve, testDurationSec * 1000));

  clearInterval(ticker);
  console.log("\n\n🛑 Test duration reached. Disconnecting all sockets...");

  for (const s of sockets) {
    if (s._interval) clearInterval(s._interval);
    s.disconnect();
  }

  // Allow 1 second for disconnects to finalize
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // Print Final Report
  const avgConnect = stats.connectTimes.length
    ? (stats.connectTimes.reduce((a, b) => a + b, 0) / stats.connectTimes.length).toFixed(2)
    : 0;
  const avgMsgLatency = stats.msgLatencies.length
    ? (stats.msgLatencies.reduce((a, b) => a + b, 0) / stats.msgLatencies.length).toFixed(2)
    : 0;

  console.log("\n===============================================================");
  console.log("                     📊 LOAD TEST SUMMARY                      ");
  console.log("===============================================================");
  console.log(` Target Users Simulated  : ${targetUsers}`);
  console.log(` Successful Connections  : ${stats.connected} / ${targetUsers} (${((stats.connected / targetUsers) * 100).toFixed(1)}%)`);
  console.log(` Connection Failures     : ${stats.failed}`);
  console.log(` Disconnects During Run  : ${stats.disconnected}`);
  console.log("---------------------------------------------------------------");
  console.log(` Total Messages Sent     : ${stats.messagesSent}`);
  console.log(` Total Messages Received : ${stats.messagesReceived}`);
  console.log("---------------------------------------------------------------");
  console.log(" Connection Latency (Handshake):");
  console.log(`   - Min: ${stats.connectTimes.length ? Math.min(...stats.connectTimes) : 0} ms`);
  console.log(`   - Avg: ${avgConnect} ms`);
  console.log(`   - P50: ${percentile(stats.connectTimes, 50)} ms`);
  console.log(`   - P95: ${percentile(stats.connectTimes, 95)} ms`);
  console.log(`   - Max: ${stats.connectTimes.length ? Math.max(...stats.connectTimes) : 0} ms`);
  console.log(" Message Round-Trip Latency (RTT):");
  console.log(`   - Min: ${stats.msgLatencies.length ? Math.min(...stats.msgLatencies) : 0} ms`);
  console.log(`   - Avg: ${avgMsgLatency} ms`);
  console.log(`   - P50: ${percentile(stats.msgLatencies, 50)} ms`);
  console.log(`   - P95: ${percentile(stats.msgLatencies, 95)} ms`);
  console.log(`   - Max: ${stats.msgLatencies.length ? Math.max(...stats.msgLatencies) : 0} ms`);
  console.log("===============================================================\n");

  process.exit(stats.failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
