"use client";
import Split from "react-split";
import { BsFileCode } from "react-icons/bs";
import Editor from "@monaco-editor/react";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { beforeMount } from "@/utils/Editor_Customization";
import { LuTriangle } from "react-icons/lu";
import { AiOutlineAlignLeft } from "react-icons/ai";
import { IoBookmarkOutline, IoReload } from "react-icons/io5";
import { sendAdminCode, sendAdminOutput, getSocketInstance } from "@/lib/socketService";
import { saveMeetingCode } from "@/lib/meetingApi";
import LanguageSelector from "@/components/common/LanguageSelector";
import { getLanguageConfig, DEFAULT_LANGUAGE } from "@/lib/languageConfig";

const Code = () => {
  const params = useParams();
  const meetingInfo = useSelector((state) => state.meeting.meetingInfo);
  const meetingIdFromState = useSelector((state) => state.meeting.meetingId);
  const meetingId = meetingIdFromState || params?.id;

  const [selectedLanguage, setSelectedLanguage] = useState(
    () => meetingInfo?.language || DEFAULT_LANGUAGE
  );
  const [formatNotice, setFormatNotice] = useState(null);
  const selectedLangConfig = getLanguageConfig(selectedLanguage);

  const [editedCode, setEditedCode] = useState(null);
  const Code =
    editedCode !== null
      ? editedCode
      : (typeof meetingInfo?.code === "string"
          ? meetingInfo.code
          : selectedLangConfig.defaultCode);

  const [localOutput, setLocalOutput] = useState(null);
  const Output = useMemo(() => {
    if (localOutput !== null) return localOutput;
    if (Array.isArray(meetingInfo?.output)) return meetingInfo.output;
    return [];
  }, [localOutput, meetingInfo?.output]);

  const [CodeCompiling, setCodeCompiling] = useState(false);

  const outputRef = useRef(null);
  const outputHistoryRef = useRef(Output);
  const codeRef = useRef(Code);
  const selectedLanguageRef = useRef(selectedLanguage);
  const codeByLanguageRef = useRef({
    [selectedLanguage]: Code,
  });
  const hasUserEdited = useRef(false);
  const syncTimerRef = useRef(null);
  const dbSaveTimerRef = useRef(null);
  const editorRef = useRef(null);

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  useEffect(() => {
    outputHistoryRef.current = Output;
  }, [Output]);

  useEffect(() => {
    codeRef.current = Code;
    codeByLanguageRef.current[selectedLanguage] = Code;
  }, [Code, selectedLanguage]);

  // Synchronize Monaco editor instance if DB meeting code/language arrives before instructor started typing
  useEffect(() => {
    if (meetingInfo?.language && meetingInfo.language !== selectedLanguage && !hasUserEdited.current) {
      setSelectedLanguage(meetingInfo.language);
    }
  }, [meetingInfo?.language, selectedLanguage]);

  useEffect(() => {
    if (editedCode === null && typeof meetingInfo?.code === "string") {
      codeRef.current = meetingInfo.code;
      codeByLanguageRef.current[selectedLanguage] = meetingInfo.code;
      if (editorRef.current && editorRef.current.getValue() !== meetingInfo.code) {
        editorRef.current.setValue(meetingInfo.code);
      }
    }
  }, [meetingInfo?.code, editedCode, selectedLanguage]);

  // Fast socket broadcast (60ms) decoupled from slower DB persistence (1500ms)
  const broadcastCode = useCallback(
    (newCode, langId = selectedLanguageRef.current) => {
      if (!meetingId) return;

      // 1. Fast socket broadcast to classroom with language metadata
      if (syncTimerRef.current) {
        clearTimeout(syncTimerRef.current);
      }
      syncTimerRef.current = setTimeout(() => {
        sendAdminCode(meetingId, newCode, langId);
      }, 60);

      // 2. Throttled DB persist (saves code + language to MongoDB)
      if (dbSaveTimerRef.current) {
        clearTimeout(dbSaveTimerRef.current);
      }
      dbSaveTimerRef.current = setTimeout(() => {
        saveMeetingCode(meetingId, newCode, outputHistoryRef.current, langId);
      }, 1500);
    },
    [meetingId]
  );

  // Send initial code and language when meetingId or socket connection is established
  useEffect(() => {
    if (!meetingId) return;
    sendAdminCode(meetingId, codeRef.current, selectedLanguage);

    const socket = getSocketInstance();
    if (socket) {
      const onConnect = () => {
        sendAdminCode(meetingId, codeRef.current, selectedLanguage);
        if (outputHistoryRef.current?.length > 0) {
          sendAdminOutput(meetingId, outputHistoryRef.current);
        }
      };
      socket.on("connect", onConnect);
      return () => socket.off("connect", onConnect);
    }
  }, [meetingId, selectedLanguage]);

  // Auto-scroll output console
  useEffect(() => {
    outputRef.current?.scrollTo({
      top: outputRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [Output, CodeCompiling]);

  // Switch programming language while preserving code written across languages
  const handleLanguageChange = (newLangId) => {
    if (newLangId === selectedLanguage) return;

    // 1. Save currently written code to cache for the current language
    codeByLanguageRef.current[selectedLanguage] = Code;

    // 2. Look up config and existing code for selected language (or fallback to starter template)
    const nextConfig = getLanguageConfig(newLangId);
    const nextCode =
      codeByLanguageRef.current[newLangId] !== undefined
        ? codeByLanguageRef.current[newLangId]
        : nextConfig.defaultCode;

    hasUserEdited.current = true;
    setSelectedLanguage(newLangId);
    setEditedCode(nextCode);
    codeRef.current = nextCode;

    if (editorRef.current) {
      editorRef.current.setValue(nextCode);
    }

    // 3. Immediately broadcast new code and language to classroom and persist
    broadcastCode(nextCode, newLangId);
  };

  // Execute Code via /api/run with selected language and broadcast output to students in real-time
  const runCode = async () => {
    if (CodeCompiling) return;
    setCodeCompiling(true);

    const currentLangConfig = getLanguageConfig(selectedLanguage);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: Code,
          language: currentLangConfig.compilerLanguage,
          language_id: currentLangConfig.judge0Id,
          input: "",
        }),
      });

      const result = await res.json();
      setCodeCompiling(false);

      const outputItem = {
        Data:
          result.stdout ||
          result.stderr ||
          result.compile_output ||
          "No output",
        time: new Date().toLocaleTimeString(),
        type: result.stderr || result.compile_output ? "error" : "success",
      };

      setLocalOutput((prev) => {
        const base = prev ?? Output;
        const updated = [...base, outputItem];
        if (meetingId) {
          sendAdminOutput(meetingId, updated);
        }
        return updated;
      });
    } catch (err) {
      setCodeCompiling(false);
      const errorItem = {
        Data: "Execution error: " + (err.message || "Failed to execute"),
        time: new Date().toLocaleTimeString(),
        type: "error",
      };
      setLocalOutput((prev) => {
        const base = prev ?? Output;
        const updated = [...base, errorItem];
        if (meetingId) {
          sendAdminOutput(meetingId, updated);
        }
        return updated;
      });
    }
  };

  const handleClearOutput = () => {
    setLocalOutput([]);
    if (meetingId) {
      sendAdminOutput(meetingId, []);
    }
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const handleFormatCode = () => {
    const currentLangConfig = getLanguageConfig(selectedLanguage);
    if (!currentLangConfig.supportsFormat) {
      setFormatNotice(`Formatting is currently supported for JavaScript and TypeScript.`);
      setTimeout(() => setFormatNotice(null), 3000);
      return;
    }
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
  };

  const handleSaveCode = () => {
    if (meetingId) {
      saveMeetingCode(meetingId, Code, Output, selectedLanguage);
      sendAdminCode(meetingId, Code, selectedLanguage);
    }
  };

  return (
    <Split
      className="h-full w-full overflow-hidden"
      sizes={[75, 25]}
      minSize={[200, 38]}
      expandToMin={false}
      gutterSize={10}
      gutterAlign="center"
      snapOffset={30}
      dragInterval={1}
      direction="vertical"
      cursor="row-resize"
    >
      {/* Code section */}
      <div className="bg-[#262626] h-full rounded-b-lg border-x-[0.5px] border-b-[0.5px] border-zinc-600 flex flex-col">
        <div className="border-b-[0.5px] border-zinc-600 w-full h-8 flex items-center justify-between px-2">
          <span className="text-[11px] font-mono text-zinc-400">
            Instructor Workspace (Live Broadcasting)
          </span>

          <div className="flex items-center gap-1.5 relative">
            <button
              type="button"
              onClick={runCode}
              disabled={CodeCompiling}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition-colors cursor-pointer disabled:opacity-50"
              title="Run Code and broadcast output to classroom"
            >
              <LuTriangle className="rotate-90 text-[10px]" />
              <span>{CodeCompiling ? "Running..." : "Run"}</span>
            </button>
            <LanguageSelector
              value={selectedLanguage}
              onChange={handleLanguageChange}
              align="left"
            />
            <div
              onClick={handleFormatCode}
              className="group relative p-1.5 rounded-sm hover:bg-[#333333] cursor-pointer text-zinc-300"
              title="Format Code"
            >
              <AiOutlineAlignLeft />
            </div>
            <div
              onClick={handleSaveCode}
              className="group relative p-1.5 rounded-sm hover:bg-[#333333] cursor-pointer text-zinc-300"
              title="Save Code"
            >
              <IoBookmarkOutline />
            </div>

            {formatNotice && (
              <div className="absolute top-9 right-0 z-40 bg-zinc-800 border border-zinc-600/80 text-zinc-200 text-xs px-2.5 py-1 rounded shadow-xl whitespace-nowrap animate-in fade-in">
                {formatNotice}
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            language={selectedLangConfig.monacoLanguage}
            theme="custom-bg"
            beforeMount={beforeMount}
            value={Code}
            options={{
              fontSize: 14,
              fontFamily: "JetBrains Mono, monospace",
              lineHeight: 22,
              minimap: { enabled: false },
              wordWrap: "on",
              cursorBlinking: "smooth",
              cursorSmoothCaretAnimation: "on",
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              padding: { top: 12, bottom: 12 },
              renderLineHighlight: "all",
              scrollbar: {
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
              },
            }}
            onChange={(value) => {
              const updated = value || "";
              hasUserEdited.current = true;
              setEditedCode(updated);
              broadcastCode(updated);
            }}
            onMount={handleEditorMount}
          />
        </div>
      </div>

      {/* Output section */}
      <div className="bg-[#262626] rounded-lg border-[0.5px] border-zinc-600 flex flex-col h-full min-h-10">
        <div className="w-full h-9 shrink-0 bg-[#333333] justify-between rounded-t-lg p-1 px-2 flex items-center gap-1 overflow-x-scroll no-scrollbar text-zinc-400">
          <div className="flex gap-2 items-center text-xs font-semibold text-zinc-200">
            <BsFileCode className="text-blue-400 text-sm" />
            <span>Console Output (Broadcasting to Students)</span>
          </div>
          <div>
            <div
              onClick={handleClearOutput}
              className="flex justify-center items-center group relative p-1 rounded hover:bg-zinc-700 cursor-pointer"
              title="Clear output"
            >
              <IoReload className="text-zinc-400 group-hover:text-zinc-200 text-xs" />
            </div>
          </div>
        </div>

        <div
          ref={outputRef}
          className="flex-1 min-h-0 overflow-y-auto px-4 py-3 text-sm leading-relaxed font-mono text-zinc-200 selection:bg-blue-500/30 whitespace-pre-wrap"
        >
          {Output.length > 0 ? (
            Output.map((output, index) => (
              <div key={index} className="py-1.5 border-b border-zinc-800/80">
                <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-0.5">
                  <span
                    className={
                      output.type === "error" ? "text-red-400" : "text-emerald-400"
                    }
                  >
                    ● {output.type === "error" ? "Runtime Error" : "Output"}
                  </span>
                  <span>{output.time}</span>
                </div>
                <pre
                  className={`${
                    output.type === "error" ? "text-red-400" : "text-zinc-200"
                  } whitespace-pre-wrap font-mono text-xs`}
                >
                  {output.Data}
                </pre>
              </div>
            ))
          ) : (
            <div className="text-xs text-zinc-500 italic py-2">
              Run your code to see output here. It will automatically broadcast to all students.
            </div>
          )}

          {CodeCompiling && (
            <div className="flex items-center gap-1.5 py-2 text-xs text-zinc-400">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span>Executing code...</span>
            </div>
          )}
        </div>
      </div>
    </Split>
  );
};

export default Code;