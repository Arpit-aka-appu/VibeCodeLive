"use client";
import React, { useState, useEffect, useRef, useMemo } from "react";
import Split from "react-split";
import Editor from "@monaco-editor/react";
import { useSelector } from "react-redux";
import { useParams } from "next/navigation";
import { beforeMount } from "@/utils/Editor_Customization";
import { BsFileCode } from "react-icons/bs";
import { LuCrown } from "react-icons/lu";
import { HiOutlineClipboardCopy, HiCheck } from "react-icons/hi";
import {
  onReceiveAdminCode,
  onReceiveAdminOutput,
  onSyncAdminState,
  requestAdminState,
  getSocketInstance,
} from "@/lib/socketService";
import { fetchMeetingDetails } from "@/lib/meetingApi";
import { getLanguageConfig, DEFAULT_LANGUAGE } from "@/lib/languageConfig";

const AdminLiveCodeViewer = () => {
  const params = useParams();
  const meetingIdFromState = useSelector((state) => state.meeting.meetingId);
  const adminNameFromState = useSelector(
    (state) => state.meeting.adminName || state.meeting.meetingInfo?.adminName
  );
  const meetingInfo = useSelector((state) => state.meeting.meetingInfo);
  const connectionStatus = useSelector(
    (state) => state.meeting.connectionStatus
  );

  const meetingId = meetingIdFromState || params?.id;
  const isConnected = connectionStatus === "connected";

  const [localAdminCode, setLocalAdminCode] = useState(null);
  const [localAdminLanguage, setLocalAdminLanguage] = useState(null);
  const [localAdminOutput, setLocalAdminOutput] = useState(null);
  const [copied, setCopied] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  const adminLanguage =
    localAdminLanguage ||
    meetingInfo?.language ||
    DEFAULT_LANGUAGE;
  const adminLangConfig = getLanguageConfig(adminLanguage);

  const adminCode =
    localAdminCode !== null
      ? localAdminCode
      : (typeof meetingInfo?.code === "string" ? meetingInfo.code : adminLangConfig.defaultCode);

  const adminOutput = useMemo(() => {
    if (localAdminOutput !== null) return localAdminOutput;
    if (Array.isArray(meetingInfo?.output) && meetingInfo.output.length > 0) {
      return meetingInfo.output;
    }
    return [
      {
        Data: "Hello from Instructor!",
        time: new Date().toLocaleTimeString(),
        type: "success",
      },
    ];
  }, [localAdminOutput, meetingInfo?.output]);

  const outputRef = useRef(null);
  const editorRef = useRef(null);
  const hasReceivedLiveCode = useRef(false);

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
    if (typeof adminCode === "string" && editor.getValue() !== adminCode) {
      editor.setValue(adminCode);
    }
  };

  // Explicitly update Monaco editor model when adminCode changes (necessary for readOnly editors)
  useEffect(() => {
    if (editorRef.current && typeof adminCode === "string") {
      const currentVal = editorRef.current.getValue();
      if (currentVal !== adminCode) {
        editorRef.current.setValue(adminCode);
      }
    }
  }, [adminCode]);

  // Fetch meeting code and language from DB on mount as initial fallback
  useEffect(() => {
    if (meetingId) {
      fetchMeetingDetails(meetingId).then((m) => {
        if (!hasReceivedLiveCode.current) {
          if (typeof m?.code === "string") setLocalAdminCode(m.code);
          if (typeof m?.language === "string") setLocalAdminLanguage(m.language);
          if (Array.isArray(m?.output) && m.output.length > 0) setLocalAdminOutput(m.output);
        }
      });
    }
  }, [meetingId]);

  // Set up socket listeners for live instructor code, language, and output
  useEffect(() => {
    if (!meetingId) return;

    // 1. Initial request to fetch cached admin code & output
    requestAdminState(meetingId);

    const socket = getSocketInstance();
    const handleConnect = () => {
      requestAdminState(meetingId);
    };

    if (socket) {
      socket.on("connect", handleConnect);
      if (socket.connected) {
        requestAdminState(meetingId);
      }
    }

    // 2. Real-time code and language updates from instructor
    const unsubCode = onReceiveAdminCode(({ code, language }) => {
      if (typeof code === "string") {
        hasReceivedLiveCode.current = true;
        setLocalAdminCode(code);
        if (typeof language === "string") {
          setLocalAdminLanguage(language);
        }
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    });

    // 3. Real-time output updates when instructor runs code
    const unsubOutput = onReceiveAdminOutput(({ output }) => {
      if (Array.isArray(output)) {
        setLocalAdminOutput(output);
      }
    });

    // 4. Initial state sync on room join
    const unsubSync = onSyncAdminState((state) => {
      if (state) {
        if (typeof state.code === "string" && state.code) {
          hasReceivedLiveCode.current = true;
          setLocalAdminCode(state.code);
        }
        if (typeof state.language === "string" && state.language) {
          setLocalAdminLanguage(state.language);
        }
        if (Array.isArray(state.output)) {
          setLocalAdminOutput(state.output);
        }
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    });

    return () => {
      socket?.off("connect", handleConnect);
      unsubCode?.();
      unsubOutput?.();
      unsubSync?.();
    };
  }, [meetingId]);

  // Auto-scroll output container
  useEffect(() => {
    outputRef.current?.scrollTo({
      top: outputRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [adminOutput]);

  const handleCopyCode = async () => {
    if (!adminCode) return;
    try {
      await navigator.clipboard.writeText(adminCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn("Failed to copy code:", err);
    }
  };

  const hostName = adminNameFromState || "Instructor";

  return (
    <Split
      className="flex flex-col h-full w-full overflow-hidden"
      sizes={[70, 30]}
      minSize={[200, 40]}
      expandToMin={false}
      gutterSize={10}
      gutterAlign="center"
      snapOffset={30}
      dragInterval={1}
      direction="vertical"
      cursor="row-resize"
    >
      {/* Top Half: Read-only Monaco Editor of Instructor's Live Code */}
      <div className="bg-[#262626] h-full rounded-b-lg border-x-[0.5px] border-b-[0.5px] border-zinc-600 flex flex-col overflow-hidden">
        {/* Sub-header Bar */}
        <div className="border-b-[0.5px] border-zinc-600 w-full h-8 flex items-center justify-between px-2 bg-[#2a2a2a]">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1 text-xs font-semibold text-zinc-200">
              <LuCrown className="text-amber-400 text-sm shrink-0" />
              <span className="truncate">{hostName}&apos;s Screen</span>
            </div>

            {/* Live Indicator Pill */}
            <div
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                isConnected
                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
              }`}
            >
              <span className="relative flex h-1.5 w-1.5">
                {isConnected && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-1.5 w-1.5 ${
                    isConnected ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                ></span>
              </span>
              <span>{isConnected ? "Live Sync" : "Syncing"}</span>
            </div>

            {/* Instructor Active Language Badge */}
            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-zinc-800/80 border border-zinc-700/60 text-zinc-300">
              <span className="text-[9px] uppercase tracking-wider text-blue-400 font-bold">
                {adminLangConfig.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lastSyncTime && (
              <span className="text-[10px] text-zinc-400 hidden sm:inline">
                Updated {lastSyncTime}
              </span>
            )}

            <button
              type="button"
              onClick={handleCopyCode}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-700/70 hover:bg-zinc-700 text-zinc-200 hover:text-white"
              }`}
              title="Copy Instructor's Code to your clipboard"
            >
              {copied ? (
                <>
                  <HiCheck className="text-xs" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <HiOutlineClipboardCopy className="text-xs" />
                  <span>Copy Code</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Monaco Editor (Read-Only) */}
        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={adminLangConfig.monacoLanguage}
            theme="custom-bg"
            beforeMount={beforeMount}
            onMount={handleEditorMount}
            value={adminCode}
            options={{
              readOnly: true,
              domReadOnly: true,
              fontSize: 14,
              fontFamily: "JetBrains Mono, monospace",
              lineHeight: 22,
              minimap: { enabled: false },
              wordWrap: "on",
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: "none",
              cursorStyle: "line-thin",
              scrollbar: {
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
              },
            }}
          />
        </div>
      </div>

      {/* Bottom Half: Instructor's Live Console Output */}
      <div className="bg-[#262626] rounded-lg border-[0.5px] border-zinc-600 flex flex-col h-full min-h-10 overflow-hidden">
        <div className="w-full h-9 shrink-0 bg-[#333333] px-2 flex items-center justify-between border-b-[0.5px] border-zinc-600 text-zinc-400">
          <div className="flex items-center gap-2 text-xs font-semibold text-zinc-200">
            <BsFileCode className="text-blue-400 text-sm" />
            <span>Instructor Console Output</span>
          </div>
          <span className="text-[10px] text-zinc-400 font-mono">
            {adminOutput.length} {adminOutput.length === 1 ? "entry" : "entries"}
          </span>
        </div>

        <div
          ref={outputRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 py-3 text-sm leading-relaxed font-mono text-zinc-200 selection:bg-blue-500/30 whitespace-pre-wrap"
        >
          {adminOutput.length > 0 ? (
            adminOutput.map((item, index) => (
              <div key={index} className="py-1.5 border-b border-zinc-800/80">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-0.5">
                  <span
                    className={
                      item.type === "error" ? "text-red-400" : "text-emerald-400"
                    }
                  >
                    ● {item.type === "error" ? "Runtime Error" : "Output"}
                  </span>
                  <span>{item.time}</span>
                </div>
                <pre
                  className={`${
                    item.type === "error" ? "text-red-400" : "text-zinc-200"
                  } whitespace-pre-wrap font-mono text-xs`}
                >
                  {item.Data}
                </pre>
              </div>
            ))
          ) : (
            <div className="text-xs text-zinc-500 italic py-2">
              Waiting for instructor to execute code... Output will appear here automatically.
            </div>
          )}
        </div>
      </div>
    </Split>
  );
};

export default AdminLiveCodeViewer;
