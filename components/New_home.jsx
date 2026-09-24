"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar.jsx";
import Footer from "@/components/Footer.jsx";
import {
  Terminal,
  Play,
  Users,
  Activity,
  Sparkles,
  ArrowRight,
  Code2,
  Cpu,
  Layers,
  CheckCircle2,
  AlertTriangle,
  MonitorCheck,
  Zap,
  Radio,
  FileCode,
  Volume2,
  SkipBack,
  SkipForward,
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState("instructor");
  const [hasExecutedCode, setHasExecutedCode] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(true);

  const handleRunCode = () => {
    setExecuting(true);
    setTimeout(() => {
      setExecuting(false);
      setHasExecutedCode(true);
    }, 450);
  };

  // Sticker ticker items matching User's Image 1
  const tickerItems = [
    { text: "CODING", bg: "bg-[#EDE6D6]" },
    { text: "AI", bg: "bg-white" },
    { text: "CODE", bg: "bg-[#EDE6D6]" },
    { text: "IDEAS", bg: "bg-white" },
    { text: "TELEMETRY", bg: "bg-[#EDE6D6]" },
    { text: "MONACO", bg: "bg-white" },
    { text: "GAMES", bg: "bg-[#EDE6D6]" },
    { text: "APPS", bg: "bg-white" },
    { text: "VIBE CODING", bg: "bg-[#EDE6D6]" },
    { text: "REALTIME", bg: "bg-white" },
  ];

  return (
    <main className="w-full graph-grid-bg text-zinc-900 selection:bg-[#1C7262]/20 selection:text-[#1C7262] overflow-x-hidden">
      <Navbar />

      {/* ========================================================================= */}
      {/* 1. HERO SECTION WITH NEO-RETRO STICKERS & GRAPH GRID */}
      {/* ========================================================================= */}
      <section className="relative pt-10 pb-16 md:pt-16 md:pb-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto relative">
          {/* ------------------------------------------------------------- */}
          {/* STICKERS: LEFT DESKTOP CLUSTER (From User Image 2) */}
          {/* ------------------------------------------------------------- */}
          <div className="hidden 2xl:flex flex-col gap-4 absolute -left-28 top-8 z-20 pointer-events-auto">
            {/* Pill 1 */}
            <motion.div
              initial={{ rotate: -8, scale: 0.9, opacity: 0 }}
              animate={{ rotate: -5, scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              whileHover={{ rotate: 0, scale: 1.05 }}
              className="bg-[#EDE6D6] border-2 border-black px-4 py-1.5 rounded-xl font-mono font-black text-xs tracking-wider uppercase text-black sticker-shadow self-start cursor-pointer"
            >
              CODING
            </motion.div>

            {/* Pill 2 */}
            <motion.div
              initial={{ rotate: 4, scale: 0.9, opacity: 0 }}
              animate={{ rotate: 3, scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              whileHover={{ rotate: 0, scale: 1.05 }}
              className="bg-white border-2 border-black px-4 py-1.5 rounded-xl font-mono font-black text-xs tracking-wider uppercase text-black sticker-shadow self-end cursor-pointer"
            >
              AI + TELEMETRY
            </motion.div>

            {/* Retro Cassette Tape Player Sticker (From User Image 2) */}
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative w-68 bg-[#EDE6D6] border-2 border-black rounded-2xl p-3.5 sticker-shadow-lg text-black mt-2"
            >
              {/* Tape Tab Top Left */}
              <div className="absolute -top-3 left-4 bg-[#FBBF24] border-2 border-black px-2 py-0.5 rounded-md text-[10px] font-mono font-black tracking-wider uppercase sticker-shadow-sm">
                TAPE • 01
              </div>

              {/* Stereo Sound Top Right */}
              <div className="absolute -top-3.5 right-3 bg-black text-white px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase">
                STEREO SOUND
              </div>

              {/* Player Screen */}
              <div className="bg-zinc-950 rounded-xl p-2.5 mt-2 border border-zinc-800 text-yellow-400 font-mono text-[11px]">
                <div className="flex items-center justify-between text-[10px] tracking-wider mb-2 border-b border-zinc-800/80 pb-1">
                  <span className="truncate pr-1">TEACHVIEW LIVE...</span>
                  <span className="text-rose-500 font-bold flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-ping"></span>
                    {isPlayingAudio ? "LIVE" : "PAUSED"}
                  </span>
                </div>

                {/* Cassette Spinning Reels & Mascot */}
                <div className="flex items-center justify-between py-1 px-2">
                  <div className="flex items-center gap-3">
                    {/* Reel 1 */}
                    <div className="w-7 h-7 rounded-full border-2 border-yellow-500/80 flex items-center justify-center relative">
                      <div
                        className={`w-5 h-5 rounded-full border border-yellow-400/60 flex items-center justify-center ${
                          isPlayingAudio ? "animate-spin-reel" : ""
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                      </div>
                    </div>
                    {/* Reel 2 */}
                    <div className="w-7 h-7 rounded-full border-2 border-yellow-500/80 flex items-center justify-center relative">
                      <div
                        className={`w-5 h-5 rounded-full border border-yellow-400/60 flex items-center justify-center ${
                          isPlayingAudio ? "animate-spin-reel" : ""
                        }`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-yellow-400"></div>
                      </div>
                    </div>
                  </div>

                  {/* Cute mascot / cat */}
                  <div className="flex items-center gap-1 text-[13px]">
                    <span>🐱</span>
                    <span className="text-[9px] text-yellow-300">♫</span>
                  </div>
                </div>
              </div>

              {/* Player Control Buttons Deck */}
              <div className="flex items-center justify-between gap-1.5 mt-2.5">
                <button
                  type="button"
                  aria-label="Previous track"
                  className="p-1.5 bg-white border-2 border-black rounded-lg sticker-shadow-sm hover:bg-zinc-100 transition active:scale-95"
                >
                  <SkipBack className="w-3 h-3 text-black fill-black" />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  className="flex-1 py-1.5 px-2 bg-black text-white rounded-lg text-[10px] font-mono font-bold flex items-center justify-center gap-1 transition active:scale-95 hover:bg-zinc-800"
                >
                  <Play className="w-3 h-3 fill-white" />
                  <span>{isPlayingAudio ? "SYNCING" : "PAUSED"}</span>
                </button>
                <button
                  type="button"
                  aria-label="Next track"
                  className="p-1.5 bg-white border-2 border-black rounded-lg sticker-shadow-sm hover:bg-zinc-100 transition active:scale-95"
                >
                  <SkipForward className="w-3 h-3 text-black fill-black" />
                </button>
                <button
                  type="button"
                  aria-label="Volume status"
                  className="p-1.5 bg-white border-2 border-black rounded-lg sticker-shadow-sm"
                >
                  <Volume2 className="w-3 h-3 text-black" />
                </button>
                <div className="px-1.5 py-1 bg-white border-2 border-black rounded-lg text-[9px] font-mono font-bold sticker-shadow-sm">
                  100%
                </div>
              </div>
            </motion.div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* STICKERS: RIGHT DESKTOP CLUSTER (From User Image 2) */}
          {/* ------------------------------------------------------------- */}
          <div className="hidden 2xl:flex flex-col items-end gap-5 absolute -right-28 top-8 z-20 pointer-events-auto">
            {/* Circular Stamp Sticker (From User Image 2) */}
            <motion.div
              initial={{ rotate: 12, scale: 0.9, opacity: 0 }}
              animate={{ rotate: 8, scale: 1, opacity: 1 }}
              transition={{ duration: 0.6 }}
              whileHover={{ rotate: 0, scale: 1.08 }}
              className="relative w-30 h-30 rounded-full bg-white border-2 border-dashed border-black p-1 flex items-center justify-center sticker-shadow cursor-pointer"
            >
              {/* Circular border inner */}
              <div className="w-full h-full rounded-full border border-black flex items-center justify-center relative p-2 text-center">
                {/* Smiley Face Center */}
                <div className="w-14 h-14 rounded-full bg-[#FBBF24] border-2 border-black flex items-center justify-center text-2xl shadow-inner">
                  😊
                </div>
                {/* Circular Stamp Label */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-[8px] font-mono font-black uppercase tracking-widest text-black text-center">
                    TEACH • CODE • LIVE
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Pill 1 */}
            <motion.div
              initial={{ rotate: -5, scale: 0.9, opacity: 0 }}
              animate={{ rotate: 4, scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              whileHover={{ rotate: 0, scale: 1.05 }}
              className="bg-[#EDE6D6] border-2 border-black px-4 py-1.5 rounded-xl font-mono font-black text-xs tracking-wider uppercase text-black sticker-shadow cursor-pointer"
            >
              VIBE CODING
            </motion.div>

            {/* Pill 2 */}
            <motion.div
              initial={{ rotate: -3, scale: 0.9, opacity: 0 }}
              animate={{ rotate: -4, scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              whileHover={{ rotate: 0, scale: 1.05 }}
              className="bg-white border-2 border-black px-4 py-1.5 rounded-xl font-mono font-black text-xs tracking-wider uppercase text-black sticker-shadow cursor-pointer"
            >
              MONACO ENGINE
            </motion.div>

            {/* Retro Flower / Star Badge */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="w-12 h-12 bg-[#EDE6D6] border-2 border-black rounded-2xl flex items-center justify-center text-xl sticker-shadow-sm"
            >
              🌸
            </motion.div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* HERO CENTER HEADLINE & ACTIONS */}
          {/* ------------------------------------------------------------- */}
          <div className="max-w-3xl mx-auto text-center mb-10 md:mb-14">
            {/* Live Indicator Badge */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1C7262]/10 border border-[#1C7262]/25 text-[#1C7262] text-xs font-semibold tracking-wide uppercase mb-6"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Real-Time Coding & Classroom Telemetry
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-zinc-950 leading-[1.12] mb-6"
            >
              Teach code interactively.
              <br />
              <span className="text-[#1C7262]">
                Monitor student progress in real time.
              </span>
            </motion.h1>

            {/* Supporting Description */}
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-base sm:text-lg text-zinc-700 font-normal leading-relaxed max-w-2xl mx-auto mb-8"
            >
              A purpose-built collaborative classroom platform bridging instructors and students
              with live Monaco editor synchronization, sandboxed cloud execution, and
              heuristic AI telemetry to catch struggles before anyone falls behind.
            </motion.p>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-8"
            >
              <Link
                href="/meeting/create"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-bold text-white bg-[#1C7262] hover:bg-[#155b4e] rounded-xl shadow-md hover:shadow-lg transition-all duration-150 active:scale-95"
              >
                <span>Start a Live Classroom</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/meeting/join"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 text-base font-bold text-zinc-900 bg-white hover:bg-zinc-50 border-2 border-black rounded-xl sticker-shadow transition-all duration-150 active:scale-95"
              >
                <Terminal className="w-4 h-4 text-[#1C7262]" />
                <span>Join with Session Code</span>
              </Link>
            </motion.div>

            {/* Responsive Sticker Strip on Mobile / Tablet */}
            <div className="flex 2xl:hidden flex-wrap items-center justify-center gap-2.5 pt-2">
              <span className="bg-[#EDE6D6] border-2 border-black px-3 py-1 rounded-lg font-mono font-bold text-xs uppercase sticker-shadow-sm -rotate-2">
                CODING
              </span>
              <span className="bg-white border-2 border-black px-3 py-1 rounded-lg font-mono font-bold text-xs uppercase sticker-shadow-sm rotate-1">
                AI + TELEMETRY
              </span>
              <span className="bg-[#EDE6D6] border-2 border-black px-3 py-1 rounded-lg font-mono font-bold text-xs uppercase sticker-shadow-sm rotate-2">
                VIBE CODING
              </span>
              <span className="bg-[#FBBF24] border-2 border-black px-2.5 py-1 rounded-lg font-mono font-bold text-xs uppercase sticker-shadow-sm">
                😊 LIVE
              </span>
            </div>
          </div>

          {/* ------------------------------------------------------------- */}
          {/* HERO BESPOKE INTERACTIVE PRODUCT PREVIEW */}
          {/* ------------------------------------------------------------- */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="w-full max-w-5xl mx-auto rounded-2xl border-2 border-black bg-[#121816] sticker-shadow-lg overflow-hidden"
          >
            {/* Window Chrome / Header */}
            <div className="h-12 bg-[#18221e] px-4 flex items-center justify-between border-b border-zinc-800/80">
              {/* Window Controls & Room Pill */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                </div>
                <div className="hidden sm:flex items-center gap-2 px-2.5 py-0.5 rounded bg-zinc-800/80 border border-zinc-700/60 text-[11px] text-zinc-300 font-mono">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
                  <span>SESSION #492-817</span>
                  <span className="text-zinc-500">|</span>
                  <span className="text-emerald-400 font-semibold">LIVE</span>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="flex items-center p-0.5 bg-[#0e1412] rounded-lg border border-zinc-800 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("instructor")}
                  className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                    activeTab === "instructor"
                      ? "bg-[#1C7262] text-white shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Activity className="w-3.5 h-3.5" />
                  <span>Teacher Telemetry</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("student")}
                  className={`px-3 py-1 rounded-md transition-all font-medium flex items-center gap-1.5 ${
                    activeTab === "student"
                      ? "bg-[#1C7262] text-white shadow-xs"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <Code2 className="w-3.5 h-3.5" />
                  <span>Student View</span>
                </button>
              </div>

              {/* Status Badge */}
              <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                <span>Socket.IO Sync</span>
              </div>
            </div>

            {/* Window Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[380px]">
              {/* Left Column: Monaco Code Editor Area (7 Cols) */}
              <div className="lg:col-span-7 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800/80 bg-[#111715]">
                {/* Editor Bar */}
                <div className="h-10 bg-[#161f1c] px-3.5 flex items-center justify-between border-b border-zinc-800/60 text-xs">
                  <div className="flex items-center gap-2 text-zinc-300 font-mono">
                    <FileCode className="w-4 h-4 text-emerald-400" />
                    <span>solution.py</span>
                    <span className="px-1.5 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-400">
                      Python 3.10
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleRunCode}
                    disabled={executing}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-600/90 hover:bg-emerald-600 text-white rounded text-xs font-medium transition active:scale-95 disabled:opacity-50"
                  >
                    <Play className="w-3 h-3 fill-white" />
                    <span>{executing ? "Compiling..." : "Run Code"}</span>
                  </button>
                </div>

                {/* Editor Code Buffer */}
                <div className="p-4 font-mono text-[13px] leading-relaxed text-zinc-300 overflow-x-auto select-none space-y-0.5">
                  <div className="flex gap-4">
                    <span className="text-zinc-600 w-4 text-right select-none">1</span>
                    <span>
                      <span className="text-purple-400">def</span>{" "}
                      <span className="text-blue-400">two_sum</span>(nums:{" "}
                      <span className="text-yellow-300">list</span>[
                      <span className="text-yellow-300">int</span>], target:{" "}
                      <span className="text-yellow-300">int</span>):
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-zinc-600 w-4 text-right select-none">2</span>
                    <span className="text-zinc-500 italic pl-4">
                      # Hash map to track visited compliments
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-zinc-600 w-4 text-right select-none">3</span>
                    <span className="pl-4">seen = {"{}"}</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-zinc-600 w-4 text-right select-none">4</span>
                    <span className="pl-4">
                      <span className="text-purple-400">for</span> i, n{" "}
                      <span className="text-purple-400">in</span>{" "}
                      <span className="text-blue-400">enumerate</span>(nums):
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-zinc-600 w-4 text-right select-none">5</span>
                    <span className="pl-8">diff = target - n</span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-zinc-600 w-4 text-right select-none">6</span>
                    <span className="pl-8">
                      <span className="text-purple-400">if</span> diff{" "}
                      <span className="text-purple-400">in</span> seen:
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-zinc-600 w-4 text-right select-none">7</span>
                    <span className="pl-12">
                      <span className="text-purple-400">return</span> [seen[diff], i]
                    </span>
                  </div>
                  <div className="flex gap-4">
                    <span className="text-zinc-600 w-4 text-right select-none">8</span>
                    <span className="pl-8">seen[n] = i</span>
                  </div>
                </div>

                {/* Simulated Terminal Output */}
                <div className="mt-auto border-t border-zinc-800/80 bg-[#0d1311] p-3 text-xs font-mono">
                  <div className="flex items-center justify-between text-zinc-500 mb-1 text-[11px]">
                    <span>TERMINAL / JUDGE0 OUTPUT</span>
                    <span className="text-emerald-400">exit code: 0</span>
                  </div>
                  {hasExecutedCode ? (
                    <div className="space-y-1 text-zinc-300">
                      <div className="text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>All test cases passed (2/2)</span>
                      </div>
                      <div className="text-zinc-400 text-[11px]">
                        Test 1: two_sum([2, 7, 11, 15], 9) ➔ [0, 1]
                      </div>
                      <div className="text-zinc-400 text-[11px]">
                        Execution Time: 114ms | Memory: 7.4 MB
                      </div>
                    </div>
                  ) : (
                    <div className="text-zinc-500 flex items-center justify-between">
                      <span>Ready. Press &quot;Run Code&quot; to compile and execute via Judge0 sandbox.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Live Telemetry & Student Diagnostics (5 Cols) */}
              <div className="lg:col-span-5 flex flex-col bg-[#141b18] p-4">
                {activeTab === "instructor" ? (
                  <div className="flex flex-col h-full justify-between space-y-3">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white tracking-wide uppercase">
                          Student Telemetry
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        3 Active Learners
                      </span>
                    </div>

                    {/* Student Telemetry Cards (Matching UserCard.jsx) */}
                    <div className="space-y-2.5">
                      {/* Student 1: Active */}
                      <div className="rounded-xl p-3 bg-zinc-900/90 border border-emerald-500/30 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-[#1C7262] text-white text-[11px] font-bold flex items-center justify-center">
                              AN
                            </div>
                            <span className="text-xs font-semibold text-white">Aman Nagar</span>
                          </div>
                          <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                            94% Score
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span className="flex items-center gap-1 text-emerald-400">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Active Typing
                          </span>
                          <span>Last compile: 12s ago</span>
                        </div>
                      </div>

                      {/* Student 2: Struggle Warning */}
                      <div className="rounded-xl p-3 bg-zinc-900/90 border border-amber-500/40 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-amber-600 text-white text-[11px] font-bold flex items-center justify-center">
                              SC
                            </div>
                            <span className="text-xs font-semibold text-white">Sarah Chen</span>
                          </div>
                          <span className="text-[11px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Struggle Detected
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-300 bg-amber-500/10 p-1.5 rounded border border-amber-500/20">
                          <span className="text-amber-300 font-semibold">AI Diagnostic:</span> 4 failed compilation loops on index error (Line 7).
                        </div>
                      </div>

                      {/* Student 3: Idle */}
                      <div className="rounded-xl p-3 bg-zinc-900/90 border border-zinc-800 flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-md bg-zinc-700 text-white text-[11px] font-bold flex items-center justify-center">
                              DM
                            </div>
                            <span className="text-xs font-semibold text-zinc-300">David Miller</span>
                          </div>
                          <span className="text-[11px] text-zinc-400">Idle (2m 14s)</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-zinc-500">
                          <span>Keystrokes: 42</span>
                          <span>Paste Events: 0</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Assessment Footer */}
                    <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
                      <span className="flex items-center gap-1.5 text-emerald-400">
                        <Sparkles className="w-3.5 h-3.5" />
                        Claude AI Heuristics Active
                      </span>
                      <span className="text-zinc-500 font-mono">Snapshot #18</span>
                    </div>
                  </div>
                ) : (
                  /* Student View Mode */
                  <div className="flex flex-col h-full justify-between space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
                      <div className="flex items-center gap-2">
                        <Code2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-xs font-bold text-white tracking-wide uppercase">
                          Instructor Broadcast
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-400 font-mono">SYNCED</span>
                    </div>

                    <div className="p-3 rounded-xl bg-zinc-900/90 border border-zinc-800 text-xs text-zinc-300 space-y-2">
                      <p className="font-semibold text-white">Problem 3: Two Sum Target</p>
                      <p className="text-zinc-400 text-[11px] leading-relaxed">
                        Given an array of integers <code className="text-emerald-400 font-mono">nums</code> and an integer <code className="text-emerald-400 font-mono">target</code>, return indices of the two numbers such that they add up to target.
                      </p>
                      <div className="p-2 bg-black/40 rounded text-[11px] text-zinc-400 font-mono">
                        Time Limit: 2.0s · Memory: 256MB
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#1C7262]/10 border border-[#1C7262]/30 text-xs text-emerald-300 space-y-1">
                      <p className="font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Telemetry Connected
                      </p>
                      <p className="text-zinc-400 text-[11px]">
                        Your typing cadences and executions are streamed in real time to the teacher for direct assistance.
                      </p>
                    </div>

                    <div className="text-[11px] text-zinc-500 font-mono text-center">
                      Monaco Editor v0.55.1 Connected
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 2. HORIZONTAL STICKER STRIP (Directly from User Image 1) */}
      {/* ========================================================================= */}
      <section className="w-full dot-grid-pattern py-8 border-y-2 border-black bg-[#f2ede4] overflow-hidden">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-3 md:gap-4 select-none">
            {tickerItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 md:gap-4">
                <div
                  className={`${item.bg} border-2 border-black px-4 py-2 rounded-xl font-mono font-black text-xs md:text-sm tracking-wider uppercase text-black sticker-shadow hover:-translate-y-0.5 transition-transform cursor-default`}
                >
                  {item.text}
                </div>
                {idx < tickerItems.length - 1 && (
                  <span className="font-mono font-black text-black text-lg select-none">
                    +
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. HOW TEACHVIEW LIVE WORKS (4-STEP WORKFLOW) */}
      {/* ========================================================================= */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1C7262] mb-3">
            Classroom Architecture
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight mb-4">
            How TeachView Live Works
          </h2>
          <p className="text-zinc-600 text-base sm:text-lg">
            A continuous loop of live coding, automated telemetry collection,
            and AI diagnostic feedback designed specifically for technical education.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7">
          {/* Step 1 */}
          <div className="relative bg-white rounded-2xl p-7 border-2 border-black sticker-shadow hover:sticker-shadow-lg transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <span className="text-3xl font-black text-black/20 group-hover:text-black transition-colors font-mono">
                  01
                </span>
                <div className="w-10 h-10 rounded-xl bg-[#EDE6D6] border-2 border-black text-black flex items-center justify-center sticker-shadow-sm">
                  <Zap className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">
                Instant Session Launch
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Instructor creates a live session in one click. Students join with a 6-digit room code with zero local SDK, Python, or node installations.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-200 text-xs font-mono font-bold text-[#1C7262]">
              No configuration required
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative bg-white rounded-2xl p-7 border-2 border-black sticker-shadow hover:sticker-shadow-lg transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <span className="text-3xl font-black text-black/20 group-hover:text-black transition-colors font-mono">
                  02
                </span>
                <div className="w-10 h-10 rounded-xl bg-[#EDE6D6] border-2 border-black text-black flex items-center justify-center sticker-shadow-sm">
                  <Code2 className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">
                Monaco Editor & Execution
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Full-featured VS Code core in the browser. Run code instantly via Judge0 CE sandboxes across Python, JavaScript, C++, and Java.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-200 text-xs font-mono font-bold text-[#1C7262]">
              Multi-language sandboxed runner
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative bg-white rounded-2xl p-7 border-2 border-black sticker-shadow hover:sticker-shadow-lg transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <span className="text-3xl font-black text-black/20 group-hover:text-black transition-colors font-mono">
                  03
                </span>
                <div className="w-10 h-10 rounded-xl bg-[#EDE6D6] border-2 border-black text-black flex items-center justify-center sticker-shadow-sm">
                  <Activity className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">
                Real-Time Telemetry Stream
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                WebSocket event pipeline captures typing rhythms, paste bursts, repeated compilation errors, and idle gaps with sub-100ms latency.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-200 text-xs font-mono font-bold text-[#1C7262]">
              Zero editor lag or interruption
            </div>
          </div>

          {/* Step 4 */}
          <div className="relative bg-white rounded-2xl p-7 border-2 border-black sticker-shadow hover:sticker-shadow-lg transition-all group flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-5">
                <span className="text-3xl font-black text-black/20 group-hover:text-black transition-colors font-mono">
                  04
                </span>
                <div className="w-10 h-10 rounded-xl bg-[#EDE6D6] border-2 border-black text-black flex items-center justify-center sticker-shadow-sm">
                  <Sparkles className="w-5 h-5" />
                </div>
              </div>
              <h3 className="text-lg font-bold text-zinc-950 mb-2">
                AI Struggle Detection
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Anthropic Claude 3.5 Sonnet analyzes telemetry snapshots to flag conceptual roadblocks, code divergence, and generate actionable teacher recommendations.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-zinc-200 text-xs font-mono font-bold text-[#1C7262]">
              Instant pedagogical diagnostics
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CORE CAPABILITIES MATRIX */}
      {/* ========================================================================= */}
      <section id="capabilities" className="py-24 bg-[#ede8dc]/40 border-y-2 border-black">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1C7262] mb-3">
              Core Platform Capabilities
            </p>
            <h2 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight mb-4">
              Engineered for Real Classroom Impact
            </h2>
            <p className="text-zinc-600 text-base sm:text-lg">
              Every feature in TeachView Live solves the pain point of teaching code to dozens of learners at once.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {/* Capability 1 */}
            <div className="bg-white rounded-2xl p-7 border-2 border-black sticker-shadow hover:sticker-shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-[#EDE6D6] border-2 border-black text-black flex items-center justify-center mb-5 sticker-shadow-sm">
                <Code2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">
                VS Code / Monaco Core
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Students and teachers write code with bracket colorization, autocomplete, custom theme support, and line numbering natively in the browser.
              </p>
            </div>

            {/* Capability 2 */}
            <div className="bg-white rounded-2xl p-7 border-2 border-black sticker-shadow hover:sticker-shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-[#EDE6D6] border-2 border-black text-black flex items-center justify-center mb-5 sticker-shadow-sm">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">
                Sandboxed Multi-Language Runner
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Judge0 CE compilation pipeline executes Python, JavaScript, C++, and Java in isolated environments with stdout, stderr, and execution time reporting.
              </p>
            </div>

            {/* Capability 3 */}
            <div className="bg-white rounded-2xl p-7 border-2 border-black sticker-shadow hover:sticker-shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-[#EDE6D6] border-2 border-black text-black flex items-center justify-center mb-5 sticker-shadow-sm">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">
                Heuristic Telemetry Engine
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Background observers monitor keystroke patterns, paste volumes, repeated errors, and inactive timers to assess live learner engagement.
              </p>
            </div>

            {/* Capability 4 */}
            <div className="bg-white rounded-2xl p-7 border-2 border-black sticker-shadow hover:sticker-shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-[#EDE6D6] border-2 border-black text-black flex items-center justify-center mb-5 sticker-shadow-sm">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">
                Teacher Student-Tabs Workspace
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Instructors can open parallel tabs for any student with the &quot;See Code&quot; feature to review, guide, or debug their buffer live without interrupting others.
              </p>
            </div>

            {/* Capability 5 */}
            <div className="bg-white rounded-2xl p-7 border-2 border-black sticker-shadow hover:sticker-shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-[#EDE6D6] border-2 border-black text-black flex items-center justify-center mb-5 sticker-shadow-sm">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">
                Automated AI Diagnostics
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Telemetry snapshots are sent to Claude 3.5 Sonnet to score code quality, detect persistent error patterns, and draft customized student suggestions.
              </p>
            </div>

            {/* Capability 6 */}
            <div className="bg-white rounded-2xl p-7 border-2 border-black sticker-shadow hover:sticker-shadow-lg transition-all">
              <div className="w-11 h-11 rounded-xl bg-[#EDE6D6] border-2 border-black text-black flex items-center justify-center mb-5 sticker-shadow-sm">
                <Radio className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 mb-2">
                Sub-100ms Socket Synchronization
              </h3>
              <p className="text-sm text-zinc-600 leading-relaxed">
                Dedicated Socket.IO server daemon handles real-time code synchronization, broadcast classroom chat, and participant presence tracking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. CLASSROOM PERSPECTIVES & ARCHITECTURE TRANSPARENCY */}
      {/* ========================================================================= */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#1C7262] mb-3">
            Pedagogy In Practice
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-zinc-950 tracking-tight mb-4">
            Designed for Both Sides of the Classroom
          </h2>
          <p className="text-zinc-600 text-base sm:text-lg">
            How TeachView Live delivers a tailored experience for instructors and students alike.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {/* For Instructors */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-black sticker-shadow relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#1C7262] text-white flex items-center justify-center">
                <MonitorCheck className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#EDE6D6] border border-black text-black sticker-shadow-sm">
                For Instructors
              </span>
            </div>

            <h3 className="text-2xl font-bold text-zinc-950 mb-4">
              Real-Time Oversight Without Micromanagement
            </h3>
            <p className="text-zinc-600 text-sm leading-relaxed mb-6">
              Instead of asking 30 students to share their screens or raise hands, the telemetry matrix shows who is on track, who is compiling, and who is stuck.
            </p>

            <ul className="space-y-3.5 text-sm text-zinc-700">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#1C7262] shrink-0 mt-0.5" />
                <span><strong>Live Telemetry Matrix:</strong> Instant visibility into all participant scores, compile status, and struggle flags.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#1C7262] shrink-0 mt-0.5" />
                <span><strong>On-Demand Student Inspection:</strong> Open any student&apos;s buffer in a tab without alerting or distracting the rest of the room.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#1C7262] shrink-0 mt-0.5" />
                <span><strong>Broadcast Master Code:</strong> Stream starter templates, live demonstrations, and prompt instructions directly to student screens.</span>
              </li>
            </ul>
          </div>

          {/* For Students */}
          <div className="bg-white rounded-3xl p-8 sm:p-10 border-2 border-black sticker-shadow relative overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#005461] text-white flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-[#EDE6D6] border border-black text-black sticker-shadow-sm">
                For Students
              </span>
            </div>

            <h3 className="text-2xl font-bold text-zinc-950 mb-4">
              Zero-Friction Coding with Proactive Mentorship
            </h3>
            <p className="text-zinc-600 text-sm leading-relaxed mb-6">
              Students focus purely on understanding concepts and writing code without wrestling with environment setup, compilers, or feeling embarrassed to ask for help.
            </p>

            <ul className="space-y-3.5 text-sm text-zinc-700">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#005461] shrink-0 mt-0.5" />
                <span><strong>Split-Screen Workspace:</strong> View teacher broadcast guidelines and instructions on the left while editing and testing code on the right.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#005461] shrink-0 mt-0.5" />
                <span><strong>Instant Cloud Execution:</strong> Run Python, JS, C++, and Java programs in milliseconds without configuring local build chains.</span>
              </li>
              <li className="flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-[#005461] shrink-0 mt-0.5" />
                <span><strong>Proactive Support:</strong> Instructors detect syntax roadblocks automatically, providing timely assistance before discouragement sets in.</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Technical Architecture Strip */}
        <div className="rounded-2xl bg-zinc-950 text-white p-8 md:p-10 border-2 border-black sticker-shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-zinc-800">
            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 mb-1">
                Verified Engineering Stack
              </p>
              <h4 className="text-xl font-bold text-white">
                Under the Hood: High-Performance Real-Time Architecture
              </h4>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs text-zinc-400">
              <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-emerald-400">
                Next.js 16.1.4
              </span>
              <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-emerald-400">
                Socket.IO 4.8.1
              </span>
              <span className="px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-emerald-400">
                Judge0 CE
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6 text-sm">
            <div>
              <div className="text-zinc-400 text-xs mb-1">Frontend Core</div>
              <div className="font-semibold text-white">React 19 & Monaco</div>
              <div className="text-zinc-500 text-xs mt-1">Split-views via React-Split</div>
            </div>
            <div>
              <div className="text-zinc-400 text-xs mb-1">Real-Time Daemon</div>
              <div className="font-semibold text-white">Node / Express Socket</div>
              <div className="text-zinc-500 text-xs mt-1">Low-latency event streams</div>
            </div>
            <div>
              <div className="text-zinc-400 text-xs mb-1">State & Storage</div>
              <div className="font-semibold text-white">Redux & MongoDB</div>
              <div className="text-zinc-500 text-xs mt-1">Session telemetry persistence</div>
            </div>
            <div>
              <div className="text-zinc-400 text-xs mb-1">Security & Limits</div>
              <div className="font-semibold text-white">Upstash Redis</div>
              <div className="text-zinc-500 text-xs mt-1">Sliding-window rate limiter</div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. CALL TO ACTION SECTION */}
      {/* ========================================================================= */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="rounded-3xl bg-gradient-to-br from-[#1C7262] via-[#165a4e] to-[#0f4339] text-white p-8 sm:p-14 text-center border-2 border-black sticker-shadow-lg relative overflow-hidden">
          <div className="relative max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Ready to elevate your live coding classroom?
            </h2>

            <p className="text-zinc-200 text-base sm:text-lg leading-relaxed">
              Launch an interactive session now or join an ongoing class with your meeting code.
              No complex setup required.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link
                href="/meeting/create"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-white text-[#1C7262] hover:bg-zinc-100 font-bold rounded-xl border-2 border-black sticker-shadow transition-all active:scale-95"
              >
                <span>Create a Live Classroom</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <Link
                href="/meeting/join"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 bg-black hover:bg-zinc-900 text-white font-bold rounded-xl border-2 border-white sticker-shadow transition-all active:scale-95"
              >
                <Terminal className="w-4 h-4 text-emerald-300" />
                <span>Join with Session Code</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
