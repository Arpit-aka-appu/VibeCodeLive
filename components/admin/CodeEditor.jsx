"use client";
import Split from "react-split";
import { BsFileCode } from "react-icons/bs";
import Editor from "@monaco-editor/react";
import { useState, useRef, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { useSelector } from "react-redux";
import { beforeMount } from "@/utils/Editor_Customization";
import { LuTriangle } from "react-icons/lu";
import { AiOutlineAlignLeft } from "react-icons/ai";
import { IoBookmarkOutline, IoReload } from "react-icons/io5";
import { sendAdminCode, sendAdminOutput, getSocketInstance } from "@/lib/socketService";
import { saveMeetingCode } from "@/lib/meetingApi";

const Code = () => {
  const [Code, setCode] = useState("// Write JavaScript code here\nconsole.log('Hello from Instructor!');\n");
  const [Output, setOutput] = useState([]);
  const [CodeCompiling, setCodeCompiling] = useState(false);

  const outputRef = useRef(null);
  const debounceTimerRef = useRef(null);
  const editorRef = useRef(null);

  const params = useParams();
  const meetingIdFromState = useSelector((state) => state.meeting.meetingId);
  const meetingId = meetingIdFromState || params?.id;

  // Debounced real-time broadcast and DB persist of admin code as they type
  const broadcastCode = useCallback(
    (newCode) => {
      if (!meetingId) return;
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      debounceTimerRef.current = setTimeout(() => {
        sendAdminCode(meetingId, newCode);
        saveMeetingCode(meetingId, newCode, Output);
      }, 150);
    },
    [meetingId, Output]
  );

  // Send and save initial code when meetingId or socket connection is established
  useEffect(() => {
    if (!meetingId) return;
    sendAdminCode(meetingId, Code);
    saveMeetingCode(meetingId, Code, Output);

    const socket = getSocketInstance();
    if (socket) {
      const onConnect = () => {
        sendAdminCode(meetingId, Code);
      };
      socket.on("connect", onConnect);
      return () => socket.off("connect", onConnect);
    }
  }, [meetingId]);

  // Auto-scroll output console
  useEffect(() => {
    outputRef.current?.scrollTo({
      top: outputRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [Output, CodeCompiling]);

  // Execute Code via /api/run and broadcast output to students in real-time
  const runCode = async () => {
    if (CodeCompiling) return;
    setCodeCompiling(true);

    try {
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: Code,
          language_id: 63, // JavaScript
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

      setOutput((prev) => {
        const updated = [...prev, outputItem];
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
      setOutput((prev) => {
        const updated = [...prev, errorItem];
        if (meetingId) {
          sendAdminOutput(meetingId, updated);
        }
        return updated;
      });
    }
  };

  const handleClearOutput = () => {
    setOutput([]);
    if (meetingId) {
      sendAdminOutput(meetingId, []);
    }
  };

  const handleEditorMount = (editor) => {
    editorRef.current = editor;
  };

  const handleFormatCode = () => {
    editorRef.current?.getAction("editor.action.formatDocument")?.run();
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

          <div className="flex items-center gap-1">
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
            <div
              onClick={handleFormatCode}
              className="group relative p-1.5 rounded-sm hover:bg-[#333333] cursor-pointer text-zinc-300"
              title="Format Code"
            >
              <AiOutlineAlignLeft />
            </div>
            <div
              className="group relative p-1.5 rounded-sm hover:bg-[#333333] cursor-pointer text-zinc-300"
              title="Save Code"
            >
              <IoBookmarkOutline />
            </div>
          </div>
        </div>

        <div className="flex-1 min-h-0">
          <Editor
            height="100%"
            defaultLanguage="javascript"
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
              setCode(updated);
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