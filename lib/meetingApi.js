import { store } from "@/store";
import { setMeetingInfo, setAdminName } from "@/store/meetingSlice";

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
