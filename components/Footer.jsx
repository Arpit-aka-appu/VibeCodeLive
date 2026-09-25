import React from "react";
import Link from "next/link";
import { Terminal, Github, ArrowUpRight } from "lucide-react";

const Footer = () => {
  return (
    <footer className="w-full bg-[#0a231e] text-zinc-300 border-t border-[#1C7262]/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Top Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-14">
          {/* Brand Col */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#1C7262] text-white flex items-center justify-center">
                <Terminal className="w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight text-white">
                TeachView Live
              </span>
            </div>

            <p className="text-zinc-400 text-sm leading-relaxed max-w-md">
              A real-time collaborative coding classroom and telemetry platform.
              Bridge instructors and students with live Monaco code editor synchronization,
              cloud execution via Judge0, and heuristic AI struggle detection.
            </p>

            <div className="flex items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-[#1C7262]/20 text-emerald-300 border border-[#1C7262]/40">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Socket.IO Telemetry Active
              </span>
              <span className="text-xs text-zinc-500">
                Next.js 16 App Router
              </span>
            </div>
          </div>

          {/* Platform Navigation */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Classroom & Tools
            </h3>
            <ul className="space-y-2.5 text-sm text-zinc-400">
              <li>
                <Link
                  href="/meeting/join"
                  className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                >
                  Join with Room Code
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </li>
              <li>
                <Link
                  href="/meeting/create"
                  className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1"
                >
                  Host Live Session
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </li>
              <li>
                <Link
                  href="/#how-it-works"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Classroom Workflow
                </Link>
              </li>
              <li>
                <Link
                  href="/#capabilities"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Platform Capabilities
                </Link>
              </li>
            </ul>
          </div>

          {/* Resources & Support */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white mb-4">
              Project & Support
            </h3>
            <ul className="space-y-2.5 text-sm text-zinc-400">
              <li>
                <Link
                  href="/about"
                  className="hover:text-emerald-400 transition-colors"
                >
                  About TeachView
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Contact Support
                </Link>
              </li>
              <li>
                <Link
                  href="/login"
                  className="hover:text-emerald-400 transition-colors"
                >
                  Instructor Sign In
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com/aman-nagar-8/VibeCodeLive"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-emerald-400 transition-colors inline-flex items-center gap-1.5"
                >
                  <Github className="w-4 h-4" />
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-white/10 mb-8"></div>

        {/* Bottom Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-400">
          <p>© {new Date().getFullYear()} TeachView Live. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="text-zinc-500">
              Powered by Monaco Editor, Judge0 & Anthropic Claude
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
