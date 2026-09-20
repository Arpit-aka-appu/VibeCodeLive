"use client";

import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Code2 } from "lucide-react";
import {
  SUPPORTED_LANGUAGES,
  getLanguageConfig,
  type LanguageConfig,
} from "@/lib/languageConfig";

// Distinctive color-coded badges for quick visual identification
const LANGUAGE_BADGES: Record<string, { bg: string; text: string; label: string }> = {
  javascript: { bg: "bg-amber-400/20", text: "text-amber-300", label: "JS" },
  typescript: { bg: "bg-blue-500/20", text: "text-blue-400", label: "TS" },
  python: { bg: "bg-emerald-500/20", text: "text-emerald-300", label: "PY" },
  java: { bg: "bg-orange-500/20", text: "text-orange-300", label: "JV" },
  cpp: { bg: "bg-cyan-500/20", text: "text-cyan-300", label: "C++" },
  c: { bg: "bg-slate-500/20", text: "text-slate-300", label: "C" },
  go: { bg: "bg-teal-400/20", text: "text-teal-300", label: "GO" },
  rust: { bg: "bg-red-500/20", text: "text-red-300", label: "RS" },
};

interface LanguageSelectorProps {
  value: string;
  onChange: (languageId: string) => void;
  disabled?: boolean;
  align?: "left" | "right";
  className?: string;
}

export default function LanguageSelector({
  value,
  onChange,
  disabled = false,
  align = "left",
  className = "",
}: LanguageSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentConfig = getLanguageConfig(value);
  const currentBadge = LANGUAGE_BADGES[currentConfig.id] || {
    bg: "bg-zinc-700/40",
    text: "text-zinc-300",
    label: currentConfig.id.slice(0, 2).toUpperCase(),
  };

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (lang: LanguageConfig) => {
    if (lang.id !== currentConfig.id) {
      onChange(lang.id);
    }
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative inline-block text-left ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border transition-all select-none
          ${
            disabled
              ? "opacity-50 cursor-not-allowed bg-zinc-800/40 border-zinc-700/50 text-zinc-400"
              : "bg-[#252526] hover:bg-[#2d2d2d] active:bg-[#333333] border-zinc-700/70 hover:border-zinc-600 text-zinc-200 cursor-pointer shadow-sm"
          }`}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={`Select language (currently ${currentConfig.label})`}
        title={`Language: ${currentConfig.label}`}
      >
        <span
          className={`inline-flex items-center justify-center text-[10px] font-bold px-1 py-0.2 rounded border border-white/10 ${currentBadge.bg} ${currentBadge.text}`}
        >
          {currentBadge.label}
        </span>
        <span className="font-medium text-zinc-200 tracking-wide">
          {currentConfig.label}
        </span>
        <ChevronDown
          size={13}
          className={`text-zinc-400 transition-transform duration-150 ${
            isOpen ? "rotate-180 text-zinc-200" : ""
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          role="listbox"
          className={`absolute ${
            align === "right" ? "right-0" : "left-0"
          } top-full mt-1.5 w-48 rounded-lg bg-[#1e1e1e] border border-zinc-700/80 shadow-2xl py-1 z-50 animate-in fade-in-0 zoom-in-95 duration-100 overflow-hidden backdrop-blur-md`}
        >
          <div className="px-2.5 py-1 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase border-b border-zinc-800/80 flex items-center gap-1">
            <Code2 size={11} />
            <span>Select Language</span>
          </div>

          <div className="max-h-60 overflow-y-auto py-0.5 divide-y divide-zinc-800/30">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.id === currentConfig.id;
              const badge = LANGUAGE_BADGES[lang.id] || {
                bg: "bg-zinc-700/40",
                text: "text-zinc-300",
                label: lang.id.slice(0, 2).toUpperCase(),
              };

              return (
                <button
                  key={lang.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(lang)}
                  className={`w-full text-left px-2.5 py-1.5 flex items-center justify-between text-xs transition-colors cursor-pointer
                    ${
                      isSelected
                        ? "bg-blue-600/15 text-blue-300 font-semibold"
                        : "text-zinc-300 hover:bg-zinc-800/90 hover:text-white font-normal"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center justify-center text-[10px] font-bold px-1.5 py-0.2 rounded border border-white/10 ${badge.bg} ${badge.text}`}
                    >
                      {badge.label}
                    </span>
                    <span>{lang.label}</span>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      {lang.extension}
                    </span>
                  </div>

                  {isSelected && (
                    <Check size={14} className="text-blue-400 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
