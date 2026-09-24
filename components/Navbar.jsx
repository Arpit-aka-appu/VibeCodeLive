"use client";

import { useState } from "react";
import Link from "next/link";
import { useSelector } from "react-redux";
import Profile from "./Profile";
import { Terminal, Menu, X, Video } from "lucide-react";

export default function Navbar() {
  const user = useSelector((state) => state.user?.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full bg-[#f6f3eb]/90 backdrop-blur-md border-b border-zinc-900/10 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo */}
        <Link
          href="/"
          className="flex items-center gap-2.5 group transition-transform active:scale-95"
        >
          <div className="w-10 h-10 rounded-xl bg-[#1C7262] text-white flex items-center justify-center shadow-sm group-hover:bg-[#155b4e] transition-colors">
            <Terminal className="w-5 h-5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-bold tracking-tight text-zinc-900">
                TeachView
              </span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-[#1C7262]/15 text-[#1C7262] uppercase tracking-wider">
                Live
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <div className="hidden md:flex items-center gap-8 text-[15px] font-medium text-zinc-700">
          <Link
            href="/"
            className="hover:text-[#1C7262] transition-colors"
          >
            Home
          </Link>
          <Link
            href="/#how-it-works"
            className="hover:text-[#1C7262] transition-colors"
          >
            How It Works
          </Link>
          <Link
            href="/#capabilities"
            className="hover:text-[#1C7262] transition-colors"
          >
            Platform
          </Link>
          <Link
            href="/about"
            className="hover:text-[#1C7262] transition-colors"
          >
            About
          </Link>
          <Link
            href="/contact"
            className="hover:text-[#1C7262] transition-colors"
          >
            Contact
          </Link>
        </div>

        {/* Desktop Actions */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/meeting/join"
            className="px-4 py-2 text-sm font-medium text-zinc-800 hover:text-[#1C7262] rounded-lg hover:bg-[#1C7262]/10 transition-colors"
          >
            Join with Code
          </Link>

          <Link
            href="/meeting/create"
            className="inline-flex items-center gap-1.5 px-4.5 py-2 text-sm font-semibold text-white bg-[#1C7262] hover:bg-[#155b4e] rounded-lg shadow-sm transition-all duration-150 active:scale-95"
          >
            <Video className="w-4 h-4" />
            <span>Create Session</span>
          </Link>

          {!user ? (
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium text-zinc-700 hover:text-zinc-950 transition-colors"
            >
              Sign In
            </Link>
          ) : (
            <div className="ml-1 pl-2 border-l border-zinc-300">
              <Profile user={user} />
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="flex md:hidden items-center gap-2">
          {user && <Profile user={user} />}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-zinc-700 hover:text-[#1C7262] hover:bg-[#1C7262]/10 transition-colors"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#1C7262]/10 bg-[#eef2e6] px-4 pt-3 pb-6 space-y-3 shadow-xl animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col space-y-2 text-[15px] font-medium text-zinc-800">
            <Link
              href="/"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#1C7262]/10 transition-colors"
            >
              Home
            </Link>
            <Link
              href="/#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#1C7262]/10 transition-colors"
            >
              How It Works
            </Link>
            <Link
              href="/#capabilities"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#1C7262]/10 transition-colors"
            >
              Platform Capabilities
            </Link>
            <Link
              href="/about"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#1C7262]/10 transition-colors"
            >
              About
            </Link>
            <Link
              href="/contact"
              onClick={() => setMobileMenuOpen(false)}
              className="px-3 py-2 rounded-lg hover:bg-[#1C7262]/10 transition-colors"
            >
              Contact
            </Link>
          </div>

          <div className="pt-3 border-t border-[#1C7262]/15 flex flex-col gap-2.5">
            <Link
              href="/meeting/join"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold rounded-lg border border-[#1C7262]/30 text-[#1C7262] hover:bg-[#1C7262]/10 transition-colors"
            >
              Join with Room Code
            </Link>
            <Link
              href="/meeting/create"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full text-center py-2.5 text-sm font-semibold rounded-lg bg-[#1C7262] text-white hover:bg-[#155b4e] shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Video className="w-4 h-4" />
              <span>Create Session</span>
            </Link>

            {!user && (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 text-sm font-medium text-zinc-600 hover:text-zinc-900"
              >
                Sign In to Account
              </Link>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
