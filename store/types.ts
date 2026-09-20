// types.ts

export interface Snapshot {
  report: {
    studentId: string;
    assignmentId: string;
    lastOutput: string;
    score: number;
    summery: string;
    suggestedAction: string;
    runAttempts: number;
  };
  code: string;
  output: string;
}

export interface CurrentUser {
  id: string;
  username: string;
  isHost?: boolean;
  role?: string;
}

export interface Participant {
  id: string;
  username: string;
  role?: string;
  isHost?: boolean;
  snapshot?: any;
}

export const MAX_STUDENT_TABS = 5;

export interface StudentCodeSnapshot {
  code: string;
  language: string;
  studentName: string;
  timestamp: number;
}

export interface StudentCodeTabsState {
  openTabs: string[]; // array of student userIds (max 5, FIFO order)
  activeTab: string | null; // active student userId or 'host'
  snapshots: Record<string, StudentCodeSnapshot>;
  loading: Record<string, boolean>;
  errors: Record<string, string | null>;
}

export interface MeetingInfo {
  name?: string;
  adminName?: string;
  url?: string;
  createdAt?: string | Date;
  duration?: string;
  status?: string;
  joinPolicy?: string;
  code?: string;
  output?: any[];
}

export interface MeetingState {
  meetingId: string | null;
  connectionStatus: "connected" | "disconnected" | "connecting";
  adminName: string | null;
  meetingInfo: MeetingInfo | null;
  currentUser: CurrentUser | null;

  participants: {
    byId: Record<string, Participant>;
    allIds: string[];
  };

  studentCodeTabs: StudentCodeTabsState;
}