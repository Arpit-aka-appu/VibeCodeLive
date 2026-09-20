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

  socket.on("student-code-error", ({ requestId, studentId, error, message }) => {
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

export function sendCodeSnapshot(meetingId: string, snapshot: any) {
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
  const eventId = `code_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  socket?.emit("send-code", {
    code,
    meetingId,
    eventId,
    clientTimestamp: Date.now(),
  });
}

export function sendAdminOutput(meetingId: string, output: any[]) {
  const eventId = `out_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  socket?.emit("send-admin-output", {
    output,
    meetingId,
    eventId,
    clientTimestamp: Date.now(),
  });
}

export function requestAdminState(meetingId: string) {
  socket?.emit("get-admin-state", { meetingId });
}

export function onReceiveAdminCode(callback: (data: { code: string; from: string }) => void) {
  socket?.on("receive-code", callback);
  return () => {
    socket?.off("receive-code", callback);
  };
}

export function onReceiveAdminOutput(callback: (data: { output: any[]; from: string }) => void) {
  socket?.on("receive-admin-output", callback);
  return () => {
    socket?.off("receive-admin-output", callback);
  };
}

export function onSyncAdminState(
  callback: (data: { code?: string; output?: any[]; adminName?: string }) => void
) {
  socket?.on("sync-admin-state", callback);
  return () => {
    socket?.off("sync-admin-state", callback);
  };
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

