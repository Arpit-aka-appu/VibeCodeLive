import Express from "express";
import { createServer } from "http";
import dotenv from "dotenv";
import initSocket from "./socket/index.js";

import { monitorEventLoopDelay } from "perf_hooks";

dotenv.config();

const app = Express();
app.use(Express.json());

const httpServer = createServer(app);

// Lightweight Event Loop & Performance Monitoring
const eventLoopHistogram = monitorEventLoopDelay({ resolution: 20 });
eventLoopHistogram.enable();

let lastCpuUsage = process.cpuUsage();
let lastCpuTime = Date.now();

// 🔥 Socket setup moved out
const io = initSocket(httpServer);

app.get("/health", (req, res) => {
  res.json({ status: "Socket server running 🚀" });
});

app.get("/metrics", (req, res) => {
  const currentCpuUsage = process.cpuUsage(lastCpuUsage);
  const currentTime = Date.now();
  const timeDiffMs = Math.max(1, currentTime - lastCpuTime);
  const totalCpuMicroSec = currentCpuUsage.user + currentCpuUsage.system;
  const cpuPercent = Math.min(100, Math.round((totalCpuMicroSec / (timeDiffMs * 1000 * 100)) * 100) / 100);
  lastCpuUsage = process.cpuUsage();
  lastCpuTime = currentTime;

  const mem = process.memoryUsage();
  const activeSockets = io?.engine?.clientsCount || io?.sockets?.sockets?.size || 0;
  const activeRooms = io?.sockets?.adapter?.rooms?.size || 0;

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

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, "0.0.0.0",() => {
  console.log(`Socket server is running on port ${PORT}`);
});

