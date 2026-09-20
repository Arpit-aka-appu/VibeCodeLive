import { io, Socket } from "socket.io-client";
import { store } from "@/store";
import {
  userJoined,
  userLeft,
  setConnectionStatus,
  setParticipants,
  updateSnapshot,
  setCurrentUser,
  receiveStudentCodeSuccess,
  receiveStudentCodeError,
  setAdminName,
  setMeetingInfo,
} from "@/store/meetingSlice";

export function parseTokenPayload(token: string) {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

let socket: Socket | null = null;

export type OutputEntry = {
  Data: string;
  time: string;
  type: string;
};

// Persistent listener sets that survive component mount ordering and reconnections
const adminCodeListeners = new Set<(data: { code: string; from: string }) => void>();
const adminOutputListeners = new Set<(data: { output: OutputEntry[]; from: string }) => void>();
const adminStateSyncListeners = new Set<
  (data: { code?: string; output?: OutputEntry[]; adminName?: string }) => void
>();

let pendingMeetingIdStateRequest: string | null = null;
let pendingAdminCodeEmit: { meetingId: string; code: string } | null = null;
let pendingAdminOutputEmit: { meetingId: string; output: OutputEntry[] } | null = null;

export function connectSocket(token: string) {
  if (token) {
    const payload = parseTokenPayload(token);
    if (payload) {
      if (payload.adminName) {
        store.dispatch(setAdminName(payload.adminName));
      }
      store.dispatch(
        setMeetingInfo({
          name: payload.meetingName || undefined,
          adminName: payload.adminName || undefined,
          url: payload.meetingUrl || undefined,
        })
      );
      store.dispatch(
        setCurrentUser({
          id: payload.id,
          username: payload.username,
          isHost: payload.isHost,
          role: payload.role,
        })
      );
    }
  }

  if (socket) return socket; // prevent duplicate connections

  socket = io(process.env.NEXT_PUBLIC_SOCKET_URL!, {
    transports: ["websocket"],
    auth: { token },
  });

  socket.on("connect", () => {
    store.dispatch(setConnectionStatus("connected"));
    if (pendingMeetingIdStateRequest) {
      socket?.emit("get-admin-state", { meetingId: pendingMeetingIdStateRequest });
    }
    if (pendingAdminCodeEmit) {
      sendAdminCode(pendingAdminCodeEmit.meetingId, pendingAdminCodeEmit.code);
      pendingAdminCodeEmit = null;
    }
    if (pendingAdminOutputEmit) {
      sendAdminOutput(pendingAdminOutputEmit.meetingId, pendingAdminOutputEmit.output);
      pendingAdminOutputEmit = null;
    }
  });

  socket.on("disconnect", () => {
    store.dispatch(setConnectionStatus("disconnected"));
  });

  socket.on("meeting-members", (members) => {
    console.log("Received meeting members:", members);
    store.dispatch(setParticipants(members));
  });

  socket.on("user-joined", (data) => {
    store.dispatch(userJoined(data.user));
  });

  socket.on("user-left", (data) => {
    store.dispatch(userLeft(data.userId));
  });

  socket.on("receive-code-snapshot", ({ snapshot, from, studentId, username }) => {
    const targetUserId = studentId || from;
    console.log("Received code snapshot from user", targetUserId, "(", username, "):", snapshot);
    if (targetUserId) {
      store.dispatch(updateSnapshot({ userId: targetUserId, snapshot }));
    }
  });

  // 🔄 Live Instructor Code Broadcasting (synchronizes to Redux + all registered component callbacks)
  socket.on("receive-code", (data: { code: string; from: string }) => {
    console.log("Socket received live code update:", data?.code?.length, "chars from", data?.from);
    if (typeof data?.code === "string") {
      store.dispatch(setMeetingInfo({ code: data.code }));
    }
    adminCodeListeners.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error("[socketService] error in adminCodeListener:", err);
      }
    });
  });

  socket.on("receive-admin-output", (data: { output: OutputEntry[]; from: string }) => {
    console.log("Socket received live output update:", data?.output?.length, "entries from", data?.from);
    if (Array.isArray(data?.output)) {
      store.dispatch(setMeetingInfo({ output: data.output }));
    }
    adminOutputListeners.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error("[socketService] error in adminOutputListener:", err);
      }
    });
  });

  socket.on(
    "sync-admin-state",
    (data: { code?: string; output?: OutputEntry[]; adminName?: string }) => {
      console.log("Socket received sync-admin-state:", data);
      if (data?.code || data?.output) {
        store.dispatch(
          setMeetingInfo({
            code: data.code,
            output: data.output,
            adminName: data.adminName,
          })
        );
      }
      adminStateSyncListeners.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error("[socketService] error in adminStateSyncListener:", err);
        }
      });
    }
  );

  socket.on("receive-student-code", ({ requestId, studentId, studentName, code, language, timestamp }) => {
    console.log("Received student code snapshot:", studentId, requestId);
    store.dispatch(
      receiveStudentCodeSuccess({
        studentId,
        studentName,
        code,
        language,
        timestamp,
      })
    );
  });

  socket.on("student-code-error", ({ studentId, error, message }) => {
    console.warn("Student code error:", studentId, error, message);
    store.dispatch(
      receiveStudentCodeError({
        studentId,
        error: message || error || "Failed to retrieve student code.",
      })
    );
  });

  return socket;
}

export function joinMeeting(meetingId: string) {
  socket?.emit("join-meeting", { meetingId });
}

export function sendCodeSnapshot(meetingId: string, snapshot: unknown) {
  console.log("Sending code snapshot for meeting", meetingId, ":", snapshot);
  socket?.emit("code-snapshot", { meetingId, snapshot });
}

export function requestStudentCode(meetingId: string, studentId: string, requestId: string) {
  console.log("Requesting student code:", { meetingId, studentId, requestId });
  socket?.emit("request-student-code", { requestId, meetingId, studentId });
}

export function sendStudentCodeResponse(payload: {
  requestId: string;
  meetingId: string;
  code: string;
  language: string;
}) {
  console.log("Sending student code response for request:", payload.requestId);
  socket?.emit("student-code-response", payload);
}

export function onGetStudentCode(
  callback: (data: { requestId: string; meetingId: string; teacherId?: string }) => void
) {
  socket?.on("get-current-code", callback);
  return () => {
    socket?.off("get-current-code", callback);
  };
}

export function getSocketInstance(): Socket | null {
  return socket;
}

export function sendAdminCode(meetingId: string, code: string) {
  if (!socket?.connected) {
    pendingAdminCodeEmit = { meetingId, code };
    return;
  }
  const eventId = `code_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  socket.emit("send-code", {
    code,
    meetingId,
    eventId,
    clientTimestamp: Date.now(),
  });
}

export function sendAdminOutput(meetingId: string, output: OutputEntry[]) {
  if (!socket?.connected) {
    pendingAdminOutputEmit = { meetingId, output };
    return;
  }
  const eventId = `out_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  socket.emit("send-admin-output", {
    output,
    meetingId,
    eventId,
    clientTimestamp: Date.now(),
  });
}

export function requestAdminState(meetingId: string) {
  pendingMeetingIdStateRequest = meetingId;
  if (socket?.connected) {
    socket.emit("get-admin-state", { meetingId });
  }
}

export function onReceiveAdminCode(callback: (data: { code: string; from: string }) => void) {
  adminCodeListeners.add(callback);
  return () => {
    adminCodeListeners.delete(callback);
  };
}

export function onReceiveAdminOutput(callback: (data: { output: OutputEntry[]; from: string }) => void) {
  adminOutputListeners.add(callback);
  return () => {
    adminOutputListeners.delete(callback);
  };
}

export function onSyncAdminState(
  callback: (data: { code?: string; output?: OutputEntry[]; adminName?: string }) => void
) {
  adminStateSyncListeners.add(callback);
  return () => {
    adminStateSyncListeners.delete(callback);
  };
}

export function emitLeaveMeeting(meetingId: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!socket || !socket.connected) {
      disconnectSocket();
      resolve(true);
      return;
    }

    const timer = setTimeout(() => {
      disconnectSocket();
      resolve(true);
    }, 1500);

    socket.emit("leave-meeting", { meetingId }, () => {
      clearTimeout(timer);
      disconnectSocket();
      resolve(true);
    });
  });
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

