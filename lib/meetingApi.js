import { store } from "@/store";
import { setMeetingInfo, setAdminName } from "@/store/meetingSlice";
import api from "@/lib/apiClient";

export async function fetchMeetingDetails(meetingId) {
  if (!meetingId) return null;
  try {
    const res = await fetch("/api/getmeeting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data.success && data.meeting) {
      const m = data.meeting;
      store.dispatch(
        setMeetingInfo({
          name: m.name,
          adminName: m.adminName,
          url: m.url,
          createdAt: m.createdAt,
          duration: m.duration,
          status: m.status,
          joinPolicy: m.joinPolicy,
          code: data.code || m.code,
          output: data.output || m.output,
        })
      );
      if (m.adminName) {
        store.dispatch(setAdminName(m.adminName));
      }
      return data.meeting;
    }
  } catch (err) {
    console.warn("Failed to fetch meeting details:", err);
  }
  return null;
}

export async function saveMeetingCode(meetingId, code, output) {
  if (!meetingId) return;
  try {
    await fetch("/api/meeting/save-code", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ meetingId, code, output }),
    });
  } catch (err) {
    console.warn("Failed to save meeting code:", err);
  }
}

export async function leaveMeetingApi(meetingId) {
  if (!meetingId) {
    return { success: false, message: "Missing meeting identifier" };
  }
  try {
    const res = await api.post("/leavemeeting", { meetingId });
    return res.data;
  } catch (err) {
    console.error("Failed to leave meeting:", err);
    return {
      success: false,
      message:
        err.response?.data?.message ||
        err.message ||
        "Failed to leave meeting. Please try again.",
    };
  }
}
