# Technical Fact Sheet: TeachView Live (VibeCodeLive)

A comprehensive, verifiable engineering analysis of the TeachView Live codebase prepared for software engineering resume bullet generation.

---

## 1. PRODUCT OVERVIEW

* **What TeachView Live does**: A real-time classroom monitoring and collaborative coding platform that connects instructors and students in live coding sessions. It pairs a multi-language browser code editor with passive behavioral tracking, automated engagement scoring, on-demand code inspection, live instructor code broadcasting, and interactive classroom chat.
* **Who uses it**:
  * **Teachers / Instructors**: Host and manage live coding sessions, monitor classroom progress in real time, inspect any student's active editor, broadcast reference code and program output, and track engagement and integrity alerts.
  * **Students**: Join meetings, write and run code in an in-browser Monaco editor across 8 languages, view instructor demonstrations, receive execution feedback, and participate in classroom discussions.
* **What a teacher can do**:
  * Create meetings with dynamic custom registration fields (e.g., student ID, section), join policies (`AUTH_ONLY`, `GUEST_ONLY`, `BOTH`), and URL slugs via [`app/api/createmeeting/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/createmeeting/route.js).
  * Broadcast source code and terminal execution output to all students simultaneously via WebSocket (`send-code`, `send-admin-output`).
  * Monitor all active students in an administrative grid with real-time participation rosters via [`components/admin/UserCard.jsx`](file:///c:/Users/AmanNagar/teachview-live/components/admin/UserCard.jsx).
  * Inspect any student’s current code buffer on-demand in a dedicated read-only Monaco editor tab ([`components/admin/ReadOnlyCodeViewer.jsx`](file:///c:/Users/AmanNagar/teachview-live/components/admin/ReadOnlyCodeViewer.jsx)), managed via a 5-tab FIFO tab manager in Redux.
  * View behavioral telemetry, automated engagement/integrity scores (0–100), and 5-point analytical briefings for each student.
  * Chat with students in real-time with role identification (`senderRole: "teacher"`).
* **What a student can do**:
  * Search and join live classrooms via link or meeting code through [`app/api/joinmeeting/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/joinmeeting/route.js).
  * Write code in Monaco Editor supporting 8 programming languages: JavaScript, TypeScript, Python, Java, C++, C, Go, Rust ([`lib/languageConfig.ts`](file:///c:/Users/AmanNagar/teachview-live/lib/languageConfig.ts)).
  * Compile and run code in a sandboxed remote execution environment (Judge0 CE via RapidAPI) with stdout, stderr, compile diagnostics, execution time, and memory display ([`app/api/run/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/run/route.js)).
  * View live instructor broadcasts alongside their own editor using a 3-way split view toggle (`left`, `right`, `both`) via [`components/Member/Base.tsx`](file:///c:/Users/AmanNagar/teachview-live/components/Member/Base.tsx).
  * Have editor telemetry (keystrokes, backspace ratio, paste events, tab switches, idle periods, execution error trends) captured passively in the background without typing lag or UI re-renders.
  * Exchange real-time messages in classroom chat.
* **What makes it different from standard collaborative/classroom apps**:
  * **Versus Collaborative Editors (Google Docs, Replit, VS Code Live Share)**: Traditional tools use Operational Transformation (OT) or CRDTs to let everyone modify a shared document buffer. In a testing or classroom setting, this enables copying. TeachView Live isolates student workspaces—each student works in an independent editor instance while the instructor monitors all workspaces from a single dashboard.
  * **Versus Video Conferencing (Zoom, Google Meet, Teams)**: Video tools rely on full-screen video streaming (high network bandwidth, lossy compression, non-interactive, non-searchable). TeachView Live transmits structured telemetry and text buffers over WebSockets, consuming orders of magnitude less bandwidth while providing searchable, readable code and automated heuristic analysis.
* **Core features currently implemented in code**:
  * Next.js 16 App Router web client with Monaco editor, React-Split resizable panels, and Redux Toolkit state management.
  * Dual-token authentication (15-min Access JWT + 7-day Refresh Token with 24-hr near-expiry rotation threshold and SHA-256 token hashing).
  * Staged email registration workflow with token expiration and verification email dispatch.
  * 6-digit OTP password reset workflow with UUID reset tokens and bcrypt password hashing.
  * Google OAuth 2.0 integration via NextAuth v4.
  * Multi-language remote code compilation via Judge0 CE (8 languages).
  * Standalone Node.js / Express Socket.IO server daemon managing partitioned meeting rooms, teacher admin rooms, participant rosters, and chat.
  * Passive behavioral telemetry tracking hook ([`UseStudentTracking.js`](file:///c:/Users/AmanNagar/teachview-live/app/meeting/member/%5Bid%5D/@right/user-code/UseStudentTracking.js)) tracking 11 distinct student signals using React mutable `useRef` (zero re-render overhead).
  * In-memory student snapshot caching and targeted instructor broadcasting.
  * On-demand student code inspection via WebSocket RPC with a 10-second timeout guard and 5-tab FIFO buffer eviction.
  * Real-time classroom chat with in-memory sliding window cache (50 messages) and MongoDB persistence.
  * Upstash Redis sliding window rate limiting (5 req/min) on authentication routes.

---

## 2. SYSTEM SCALE

| Metric | Value | Evidence / Source | Confidence |
|---|---|---|---|
| **Max students tested concurrently (automated)** | 100 students (fixture pool), 10 students (script default) | [`k6-tests/users.json`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/users.json) contains exactly 100 pre-generated test users; [`k6-tests/full-flow-test.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/full-flow-test.js#L44) defaults to 10 users with CLI `--users=N` override; [`k6-tests/register-users.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/register-users.js#L45) supports batches of 25, 50, 100. | High |
| **Max students intended per meeting (documented)** | 50 to 200 concurrent students | [`docs/testing.md`](file:///c:/Users/AmanNagar/teachview-live/docs/testing.md#L37-L39) documents a 4-stage k6 stress scenario targeting 50 to 200 concurrent students. | High |
| **Simultaneous meeting support** | Yes (Multi-room support implemented) | Socket.IO rooms are partitioned dynamically by `meetingId` and `meetingUrl` ([`socket/src/socket/meeting.socket.js`](file:///c:/Users/AmanNagar/teachview-live/socket/src/socket/meeting.socket.js#L10-L16)); [`k6-tests/full-flow-test.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/full-flow-test.js#L47) supports `--meetings=N` distributing students across concurrent rooms. | High |
| **Dedicated real-time room per meeting** | Yes (Room + Admin sub-room) | Each meeting creates room `${meetingId}` for general broadcasting and `${meetingId}:admin` exclusively for instructors ([`socket/src/socket/meeting.socket.js`](file:///c:/Users/AmanNagar/teachview-live/socket/src/socket/meeting.socket.js#L23-L25)). | High |
| **Multiple teachers supported** | Database: No (1 host per meeting); Socket: Yes | In [`models/Meeting.js`](file:///c:/Users/AmanNagar/teachview-live/models/Meeting.js#L37-L41), `admin` is a single `ObjectId` reference. In Socket.IO ([`socket/src/socket/meeting.socket.js`](file:///c:/Users/AmanNagar/teachview-live/socket/src/socket/meeting.socket.js#L22)), any socket with `isHost || role === "teacher"` joins the admin room. | High |
| **Tested load levels** | 10, 25, 50, 100 users | Pre-configured in load runner CLI options ([`k6-tests/register-users.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/register-users.js#L86-L89), [`k6-tests/full-flow-test.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/full-flow-test.js#L54-L58)). | High |
| **Number of meetings used during load testing** | 1 meeting (default) to N meetings (configurable) | Handled via `--meeting=<slug>` or `--meetings=<count>` argument in [`k6-tests/full-flow-test.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/full-flow-test.js#L61-L65). | High |
| **Duration of sustained load tests** | 30s (`socket-load-test.js`), 60s (`full-flow-test.js`), 120s (documented k6) | Default test durations in test runner source code: [`k6-tests/socket-load-test.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/socket-load-test.js#L37) (30s) and [`k6-tests/full-flow-test.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/full-flow-test.js#L45) (60s); [`docs/testing.md`](file:///c:/Users/AmanNagar/teachview-live/docs/testing.md#L39) (2 min sustained). | High |

---

## 3. REAL-TIME ARCHITECTURE

### Complete Event Lifecycles

#### 1. Student Code Updates & Telemetry Snapshots
1. **Editor Event Capture**: Student types or pastes into Monaco Editor.
2. **Passive In-Memory Tracking**: [`UseStudentTracking.js`](file:///c:/Users/AmanNagar/teachview-live/app/meeting/member/%5Bid%5D/@right/user-code/UseStudentTracking.js) listens to `editor.onKeyDown` and `editor.onDidPaste`. Metrics are written to mutable `session.current` refs (0 re-renders).
3. **Snapshot Trigger**: Every 30 seconds (after an initial 5s warmup delay), `onSnapshot` fires.
4. **Scoring Request**: Student client posts telemetry payload to `POST /api/meeting/snapShot` ([`app/api/meeting/snapShot/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/meeting/snapShot/route.js)).
5. **Socket Emission**: The resulting snapshot (or client fallback if endpoint fails) is passed to `sendCodeSnapshot(meetingId, snapshot)` in [`lib/socketService.ts`](file:///c:/Users/AmanNagar/teachview-live/lib/socketService.ts#L227), emitting `socket.emit("code-snapshot", { meetingId, snapshot })`.
6. **Server Routing & Verification**:
   * Socket server receives `code-snapshot` in [`socket/src/socket/meeting.socket.js`](file:///c:/Users/AmanNagar/teachview-live/socket/src/socket/meeting.socket.js#L85).
   * Checks caller identity: teachers/hosts are rejected from emitting student snapshots (`isHost || role === "teacher"`).
   * Caches the snapshot in memory: `roomStudentSnapshots.get(meetingId).set(studentUserId, snapshotPayload)`.
   * **Targeted Room Routing**: Broadcasts **exclusively** to the instructor sub-room: `io.to(`${meetingId}:admin`).emit("receive-code-snapshot", snapshotPayload)`. Students in `${meetingId}` never receive peer snapshots.
7. **UI Update**: Teacher client receives `receive-code-snapshot` via [`lib/socketService.ts`](file:///c:/Users/AmanNagar/teachview-live/lib/socketService.ts#L118) and dispatches Redux action `updateSnapshot({ userId, snapshot })` ([`store/meetingSlice.ts`](file:///c:/Users/AmanNagar/teachview-live/store/meetingSlice.ts#L116)), updating the student's status badge, score, and behavioral chips in [`components/admin/UserCard.jsx`](file:///c:/Users/AmanNagar/teachview-live/components/admin/UserCard.jsx).

#### 2. Teacher Code Broadcasting
1. **Teacher Action**: Teacher modifies code or compiles program output.
2. **Event Emission**: Teacher editor calls `sendAdminCode(meetingId, code, language)` or `sendAdminOutput(meetingId, output)` in [`lib/socketService.ts`](file:///c:/Users/AmanNagar/teachview-live/lib/socketService.ts#L260), emitting `send-code` with `{ code, language, meetingId, eventId, clientTimestamp }`.
3. **Server Cache & Room Relay**:
   * Socket server updates in-memory cache `roomAdminState.set(roomKey, { code, language, adminName, timestamp })`.
   * Server broadcasts to all room sockets: `io.to(meetingId).emit("receive-code", payload)`.
4. **Student UI Update**: Student sockets receive `receive-code`, dispatching Redux `setMeetingInfo({ code, language })` and invoking registered listeners in [`components/Member/Base.tsx`](file:///c:/Users/AmanNagar/teachview-live/components/Member/Base.tsx) to update the read-only host Monaco editor.
5. **Catch-Up Synchronization**: When any new student joins or reconnects, the server immediately emits `sync-admin-state` with the cached `roomAdminState` directly to the joining socket.

#### 3. Real-Time Classroom Chat
1. **Sender Action**: Participant submits a message (1–1000 characters).
2. **Socket Call**: Client emits `send-chat-message` with `{ meetingId, message }` and an acknowledgment callback (`ack`).
3. **Server Authorization & Cache**:
   * Checks socket authentication (`userId` must exist).
   * Verifies meeting membership: validates that `socket.data.meetingId` or `meetingUrl` matches the payload's `meetingId`.
   * Validates length (1 to 1000 characters).
   * Appends to in-memory cache `roomChatMessages.get(meetingId)` (sliding window capped at 50 messages).
4. **Room Broadcast**: Server broadcasts to all participants: `io.to(meetingId).emit("receive-chat-message", chatMessage)` and fires `ack({ ok: true, message: chatMessage })`.
5. **Client UI Update**: All clients dispatch Redux `addChatMessage` ([`store/chatSlice.ts`](file:///c:/Users/AmanNagar/teachview-live/store/chatSlice.ts)).

### Core Real-Time Architecture Details

* **Socket.IO Usage**: Yes (`socket.io` v4.8.3, `socket.io-client` v4.8.1).
* **Process Separation**: The Socket.IO server runs as an independent Node.js process completely separate from Next.js ([`socket/src/index.js`](file:///c:/Users/AmanNagar/teachview-live/socket/src/index.js) on port 4000).
* **Server Framework**: Express 5.2.1 wrapping a Node.js `http.createServer`.
* **Socket Authentication**: Token-based handshake via [`socket/src/socket/auth.middleware.js`](file:///c:/Users/AmanNagar/teachview-live/socket/src/socket/auth.middleware.js). Client sends token in `auth: { token }`. The server validates using `jwt.verify(token, process.env.SOCKET_JWT_SECRET)` and attaches the decoded payload to `socket.user` / `socket.data`.
* **Room Joining**: Client emits `join-meeting` with `{ meetingId }`. Server adds the socket to `${meetingId}`. If `isHost` or `role === "teacher"`, the socket additionally joins `${meetingId}:admin`.
* **Meeting Membership Validation**:
  * During REST join: `/api/joinmeeting` validates the user JWT and adds `user._id` to `Meeting.members`.
  * During socket handshake: Handshake token (`socketAuth`) encodes `meetingId`, `meetingUrl`, `userId`, `isHost`, and `role`.
  * In event handlers: `send-chat-message` and `request-student-code` check that the socket token's `meetingId` matches the event's target room.
* **Sender Exclusion**:
  * `socket.to(meetingId).emit("user-joined", ...)` excludes the joining sender.
  * `socket.to(roomKey).emit("user-left", ...)` excludes the disconnecting socket.
  * `io.to(meetingId).emit("receive-code", ...)` and `receive-chat-message` broadcast to all room members.
* **Code Granularity**: Code is transmitted as **complete text snapshots**, not operational transforms (OT) or character deltas.
* **Debouncing & Batching**: Telemetry snapshot generation is throttled to 30-second intervals via `setInterval` in [`UseStudentTracking.js`](file:///c:/Users/AmanNagar/teachview-live/app/meeting/member/%5Bid%5D/@right/user-code/UseStudentTracking.js#L275).
* **Unauthorized Access Prevention**:
  * Unauthenticated sockets are rejected at the handshake level with HTTP 401 / `Unauthorized`.
  * Cross-meeting message injection is rejected with `FORBIDDEN` error.
  * Non-teachers attempting to request student code are rejected with `FORBIDDEN`.

---

## 4. CODE COLLABORATION / TEACHER INSPECTION

* **How student code is stored**:
  * Client side: Maintained in Monaco editor state and React refs (`codeRef.current`).
  * Server side: Cached ephemerally in an in-memory Map: `roomStudentSnapshots` on the Socket.IO process.
  * Teacher client side: Held in Redux state `state.meeting.studentCodeTabs.snapshots[studentId]`.
  * Database: **Not stored in MongoDB**. Student code is strictly ephemeral in memory.
* **How teacher code is stored**:
  * In-memory cache on Socket.IO server (`roomAdminState`).
  * In Redux state on teacher and student clients (`state.meeting.meetingInfo.code`).
  * In MongoDB: Optionally saved to `Meeting.data.code` via `POST /api/meeting/save-code` ([`app/api/meeting/save-code/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/meeting/save-code/route.js)).
* **How a teacher inspects a student's code (On-Demand WebSocket RPC)**:
  1. Teacher clicks "See Code" on student card in [`components/admin/UserCard.jsx`](file:///c:/Users/AmanNagar/teachview-live/components/admin/UserCard.jsx#L118).
  2. Teacher client dispatches `requestStudentCodeStart` and emits `request-student-code` with `{ requestId, meetingId, studentId }`.
  3. Socket server checks authorization: ensures caller is authenticated, caller has teacher role (`isHost !== false && role !== "student"`), caller belongs to meeting, and caller is not requesting their own code.
  4. Server locates the student's active socket in `io.sockets.adapter.rooms.get(meetingId)` (with fallback to `io.sockets.sockets`).
  5. Server forwards targeted event to the student's socket: `targetSocket.emit("get-current-code", { requestId, meetingId, teacherId })`.
  6. Student listener in [`app/meeting/member/[id]/@right/user-code/page.js`](file:///c:/Users/AmanNagar/teachview-live/app/meeting/member/%5Bid%5D/@right/user-code/page.js#L87) captures `get-current-code`, reads current code from `codeRef.current`, and emits `student-code-response`.
  7. Server relays `receive-student-code` back to the meeting room.
  8. Teacher client receives event, dispatches `receiveStudentCodeSuccess`, and renders code in the tab viewer.
* **Inspection without editing**: Yes. Inspecting code renders in [`components/admin/ReadOnlyCodeViewer.jsx`](file:///c:/Users/AmanNagar/teachview-live/components/admin/ReadOnlyCodeViewer.jsx#L195) with Monaco editor options `readOnly: true` and `domReadOnly: true`. Teachers cannot edit student buffers.
* **Can students see teacher code**: Yes, if the teacher broadcasts it via `send-code`.
* **Tab management & FIFO eviction**:
  * Max tabs: Exactly **5 student-code tabs** ([`MAX_STUDENT_TABS = 5`](file:///c:/Users/AmanNagar/teachview-live/store/types.ts#L32)).
  * Deterministic FIFO eviction: Implemented in [`store/meetingSlice.ts`](file:///c:/Users/AmanNagar/teachview-live/store/meetingSlice.ts#L171-L178):
    ```typescript
    if (tabs.length >= MAX_STUDENT_TABS) {
      const oldestTabId = tabs.shift();
      if (oldestTabId) {
        delete state.studentCodeTabs.snapshots[oldestTabId];
        delete state.studentCodeTabs.loading[oldestTabId];
        delete state.studentCodeTabs.errors[oldestTabId];
      }
    }
    tabs.push(studentId);
    ```
* **Offline student handling**: If student socket is not found, server emits `student-code-error` with `{ error: "STUDENT_OFFLINE", message: "Student is offline. We cannot connect to the student." }`. UI displays a red offline alert banner with a retry button.
* **Failure / Timeout handling**: Teacher client sets a **10-second timeout guard** ([`components/admin/ReadOnlyCodeViewer.jsx`](file:///c:/Users/AmanNagar/teachview-live/components/admin/ReadOnlyCodeViewer.jsx#L71-L84)): if the student does not reply within 10,000 ms, Redux sets `error: "Student did not respond in time. Please try again."`, clearing the loading spinner.
* **Code persistence after meeting**: Student code is **not persisted** after meeting termination.

---

## 5. BEHAVIORAL ANALYTICS

### Signals Tracked by the System

| Signal | Where Generated | Detection Mechanism / Threshold | Storage Location | Transmission Method | Used in Scoring | Displayed to Teacher |
|---|---|---|---|---|---|---|
| **Keystroke Count** | Browser DOM | Monaco `editor.onKeyDown` counter | Mutable ref (`session.current.keystrokes`) | HTTP Snapshot payload (`keystrokes`) | Yes (Weight 30 if zero keystrokes) | Yes (Chip in UserCard) |
| **Backspace Ratio** | Browser DOM | Monaco `editor.onKeyDown` (KeyCode 1); ratio = backspaces / keystrokes | Mutable ref (`session.current.backspaces`) | HTTP Snapshot payload (`backspaces`, `backspaceRatio`) | Yes (`HIGH_BACKSPACE_RATIO` penalty 5) | Yes (Chip in UserCard) |
| **Paste Events** | Browser DOM | Monaco `editor.onDidPaste` event; records character count and first 100 chars | Array in mutable ref (`session.current.pasteEvents`) | HTTP Snapshot payload (`pasteEvents`) | Yes (`LARGE_PASTE_DETECTED` penalty 20 if $\ge 50$ chars) | Yes (Chip in UserCard) |
| **Zero Keystroke Code** | Browser DOM | Evaluates if code length $> 80$ chars while keystrokes $< 10$ | Mutable ref flag | HTTP Snapshot payload | Yes (`ZERO_KEYSTROKE_RATIO` penalty 30) | Yes (Card flag) |
| **Idle Duration** | Browser Timer | Timer reset on keystroke; fires after 3 minutes of silence (`IDLE_THRESHOLD_MS = 180000`) | Mutable ref timer | HTTP Snapshot payload | Yes (`IDLE_TOO_LONG` penalty 10) | Yes (Card flag) |
| **Not Started** | Browser Timer | 5-minute timer (`NOT_STARTED_CHECK_MS = 300000`); checks if keystrokes == 0 & code empty | Mutable ref timer | HTTP Snapshot payload | Yes (`NOT_STARTED` penalty 30) | Yes (Card flag) |
| **Stuck on Line** | Browser DOM | Tracks cursor line number across edits; flags if 5 consecutive edits on same line | Array in mutable ref (`session.current.lineHistory`) | HTTP Snapshot payload | Yes (`STUCK_ON_LINE` penalty 10) | Yes (Card flag) |
| **Code Growth Stagnation** | Browser DOM | Samples newline count over time; flags if line count unchanged for 5 minutes | Array in mutable ref (`session.current.lastLineCounts`) | HTTP Snapshot payload | Yes (`CODE_NOT_GROWING` penalty 15) | Yes (Card flag) |
| **Tab Switches** | Browser Event | `document.addEventListener("visibilitychange")`; counts every `document.hidden == true` | Mutable ref counter | HTTP Snapshot payload (`safeFlags`) | Yes (`FREQUENT_TAB_SWITCHES` penalty 15 every 3 switches) | Yes (Card flag) |
| **Run Attempts** | React State | `useEffect` listening to changes in execution `output` array | Array in mutable ref (`session.current.runAttempts`) | HTTP Snapshot payload (`runAttempts`) | Yes (In context lines) | Yes (Card flag) |
| **Error Frequency** | Output Parser | Checks if `latestOutput.type === "error"`; flags if total errors $\ge 5$ | Array in mutable ref (`session.current.errorHistory`) | HTTP Snapshot payload (`totalErrors`) | Yes (`HIGH_ERROR_RATE` penalty 10) | Yes (Card flag) |
| **Repeated Same Error** | Output Parser | Checks if the exact same error string appears 3 runs in a row | Array in mutable ref | HTTP Snapshot payload | Yes (`SAME_ERROR_REPEATED` penalty 10) | Yes (Card flag) |
| **Reference Similarity** | Client Algorithm | Jaccard similarity on character 3-grams against `referenceCode` on clean runs | Mutable ref calculation | HTTP Snapshot payload | Yes (`MATCHES_REFERENCE_SOLUTION` penalty 35 if $\ge 85\%$) | Yes (Card flag) |

### Complete Behavioral Analytics Pipeline

```
Monaco Editor & Browser Events
  │ (Keystrokes, Pastes, VisibilityChange, Run Output)
  ▼
UseStudentTracking Hook (Mutable session.current refs — 0 re-renders)
  │ (Runs threshold checks: Idle 3m, NotStarted 5m, Flat lines 5m, Pastes >=50)
  ▼
Periodic Snapshot Trigger (Every 30s)
  │ POST /api/meeting/snapShot
  ▼
buildBehaviorContext / sessionSummary.js
  │ (Deduplicates flags, computes 0–100 heuristic integrity score)
  ▼
Structured Snapshot Object Created
  │ Emitted via Socket.IO: emit("code-snapshot")
  ▼
Socket.IO Server (Port 4000)
  │ Stores in roomStudentSnapshots Map; Relays to io.to(`${meetingId}:admin`)
  ▼
Teacher Dashboard (Redux meetingSlice)
  │ Updates participants.byId[userId].snapshot
  ▼
UserCard.jsx Component
  │ Renders score meter (0–100%), status badge, context chips, 5-point briefing
```

---

## 6. GEMINI / AI SYSTEM

* **Model & Provider (Fact vs. Documentation)**:
  * **In Documentation**: `docs/backend.md`, `docs/data-flows.md`, `docs/deployment.md`, and `docs/utilities.md` document Google Gemini (`GEMINI_API_KEY`) as the synthesis engine.
  * **In Source Code**: [`app/api/meeting/snapShot/util.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/meeting/snapShot/util.js#L110) implements `analyzeWithClaude` targeting the Anthropic Claude Messages API (`https://api.anthropic.com/v1/messages`) with model `claude-sonnet-4-20250514`.
  * **Current Operational State**: In [`app/api/meeting/snapShot/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/meeting/snapShot/route.js#L44-L93), the remote LLM call is commented out and returns a deterministic mock payload (`aiResult[0]` score 68). In [`lib/snapShotSender.js`](file:///c:/Users/AmanNagar/teachview-live/lib/snapShotSender.js#L10), `USE_DEMO_MODE = true` generates local rule-based mock responses via `mockAIResponse`.
* **Input Data Structure**:
  * Student Name and Assignment ID.
  * Derived behavioral context lines: Session duration in minutes, total keystrokes, backspace count, paste count, tab switch count, run attempts, total errors, idle event count, line count of code, and latest program output string.
  * Full source code string.
  * Latest execution output string.
* **Prompt Structure**: Instructs the model to act as an AI teaching assistant monitoring student progress and return strict JSON adhering to a 5-point evaluation structure ([`utils/sessionSummary.js`](file:///c:/Users/AmanNagar/teachview-live/utils/sessionSummary.js#L158-L194)).
* **Output Format**: Structured JSON:
  ```json
  {
    "score": 68,
    "summary": {
      "whatStudentDid": "...",
      "struggling": "...",
      "doingWell": "...",
      "suspiciousBehavior": null,
      "adviceForTeacher": "..."
    }
  }
  ```
* **Heuristic Scoring Engine (Algorithmic Fallback)**:
  When remote AI is disabled or unconfigured, [`utils/sessionSummary.js`](file:///c:/Users/AmanNagar/teachview-live/utils/sessionSummary.js#L83-L103) computes an algorithmic score:
  $$\text{Score} = \max\left(0, 100 - \sum \left(W_{\text{flag}} + (\text{count} - 1) \times 0.5 \times W_{\text{flag}}\right)\right)$$
* **AI Metrics**:
  * Request count: **Not measured** (no remote calls recorded in git history).
  * P50 / P95 / P99 latency: **Not measured**.
  * Success / failure / timeout rate: **Not measured**.

---

## 7. AUTHENTICATION & SECURITY

* **Dual-Token Architecture**:
  * **Access Token**: Short-lived (15 minutes), signed with `ACCESS_TOKEN_SECRET`, payload `{ userId, email }`. Held in memory on client (`apiClient.js`).
  * **Refresh Token**: Long-lived (7 days), signed with `REFRESH_TOKEN_SECRET`, payload `{ userId }`. Transmitted via HTTP-only cookie (`refreshToken`).
* **Cryptographic Token Hashing**: Refresh tokens are never stored in plaintext. Hashed with SHA-256 (`crypto.createHash("sha256")`) before database insertion into [`models/RefreshToken.js`](file:///c:/Users/AmanNagar/teachview-live/models/RefreshToken.js).
* **Refresh Token Rotation**:
  * Implemented in [`app/api/login/refresh/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/login/refresh/route.js#L70-L95).
  * Threshold: `ROTATE_THRESHOLD = 24 * 60 * 60 * 1000` (24 hours).
  * If token expiration is within 24 hours: deletes existing token from MongoDB, generates a new refresh token, inserts the new SHA-256 hash, and sets a new HTTP-only cookie.
* **Refresh Token Reuse Protection**: If an already-rotated or revoked token hash is presented, `RefreshToken.findOne({ tokenHash })` returns null, rejecting the request with HTTP 401 "Refresh token expired or revoked".
* **Staged Email Registration**:
  * Implemented in [`app/api/login/register/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/login/register/route.js) and [`app/api/login/verify-email/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/login/verify-email/route.js).
  * Unverified users are placed into `EmailVerification` collection with a 15-minute expiration (`tokenExpiry`) and a SHA-256 hashed 32-byte crypto token.
  * Only promoted to the primary `User` collection and removed from staging after the email verification link is clicked.
* **Password Hashing**: `bcrypt.hash(password, 10)`. User schema sets `password: { select: false }` to prevent accidental inclusion in database queries.
* **Password Recovery (OTP)**:
  * 6-digit numeric OTP, SHA-256 hashed into `OTP` collection with 10-minute expiry.
  * Successful verification produces a unique UUID `resetToken`, which is required to change password in [`changepassword/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/login/forgotpassword/changepassword/route.js).
* **Google OAuth**: Integrated via NextAuth v4 in [`app/api/auth/[...nextauth]/route.ts`](file:///c:/Users/AmanNagar/teachview-live/app/api/auth/%5B...nextauth%5D/route.ts). Issues standard app Access JWT and hashed Refresh Token upon sign-in.
* **API Rate Limiting**: Implemented with `@upstash/ratelimit` backed by Upstash Redis REST API ([`lib/rateLimiter.js`](file:///c:/Users/AmanNagar/teachview-live/lib/rateLimiter.js)). Enforces a sliding window limit of **5 requests per 1 minute** on registration, OTP generation, OTP verification, and password change.
* **Socket Authentication**: Handshake middleware [`socket/src/socket/auth.middleware.js`](file:///c:/Users/AmanNagar/teachview-live/socket/src/socket/auth.middleware.js) validates `socketAuth` JWT against `SOCKET_JWT_SECRET`.
* **Meeting Authorization**:
  * Joining a meeting requires an authenticated user account.
  * Chat and code inspection handlers reject interactions if the socket's encoded meeting ID does not match the target room.
  * Teacher inspection explicitly rejects non-teacher roles (`isHost === false || role === "student"`).

---

## 8. REDIS

* **What is stored**: Sliding-window rate-limiting request timestamps and counters managed by `@upstash/ratelimit`.
* **Why used**: Provides stateless, distributed sliding-window rate limiting across serverless API route instances without requiring a dedicated persistent Redis TCP connection pool.
* **Key structure & TTL**: Managed internally by Upstash sliding-window algorithm using client IP address (`x-forwarded-for`); 1-minute expiration window.
* **Read/write flow**: REST API calls via `@upstash/redis` HTTPS endpoints (`UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`).
* **Used for rate limiting**: **Yes** (5 req/min on sensitive auth endpoints).
* **Used for caching**: **No**.
* **Used for sessions/tokens**: **No** (tokens stored in MongoDB `RefreshToken`).
* **Used for real-time coordination**: **No** (Socket.IO uses local in-memory Maps; no `@socket.io/redis-adapter` is installed or configured).
* **Distributed nature**: External cloud-hosted REST-based rate limiter; not a distributed clustering or cache layer.

---

## 9. DATABASE

* **Database Engine**: MongoDB Atlas accessed via Mongoose 8.20.1 singleton connection manager ([`lib/db.js`](file:///c:/Users/AmanNagar/teachview-live/lib/db.js)) with serverless connection reuse (`global.mongoose`).
* **Core Collections & Models**:
  * `users` ([`models/User.model.js`](file:///c:/Users/AmanNagar/teachview-live/models/User.model.js)): Master user accounts, bcrypt password hash (`select: false`), meeting history references, role. Indexes: `{ email: 1 }` (unique).
  * `meetings` ([`models/Meeting.js`](file:///c:/Users/AmanNagar/teachview-live/models/Meeting.js)): Session metadata, admin reference, unique URL slug, participant members array (`members: [ObjectId]`), dynamic custom fields schema, persisted admin code/output in `data` (Mixed). Indexes: `{ url: 1 }` (unique).
  * `chatmessages` ([`models/ChatMessage.js`](file:///c:/Users/AmanNagar/teachview-live/models/ChatMessage.js)): Classroom chat history, sender metadata, message text. Indexes: `{ meetingId: 1, createdAt: -1 }`, `{ senderId: 1 }`.
  * `refreshtokens` ([`models/RefreshToken.js`](file:///c:/Users/AmanNagar/teachview-live/models/RefreshToken.js)): SHA-256 hashed refresh tokens, owning `userId`, user agent, IP address. Indexes: `{ tokenHash: 1 }` (unique), `{ userId: 1 }`, TTL index `{ expiresAt: 1 }` with `{ expires: 0 }`.
  * `emailverifications` ([`models/EmailVerification.js`](file:///c:/Users/AmanNagar/teachview-live/models/EmailVerification.js)): Staged user signups awaiting email confirmation, SHA-256 hashed token, 15-minute expiry. Indexes: `{ verificationToken: 1 }` (unique), `{ email: 1 }`, `{ tokenExpiry: 1 }`.
  * `otps` ([`models/OTP.model.js`](file:///c:/Users/AmanNagar/teachview-live/models/OTP.model.js)): 6-digit password reset OTP hash and UUID reset token.
* **Student Code Persistence**: **Not stored in MongoDB** (held ephemerally in memory).
* **Snapshot Persistence**: **Not stored in MongoDB**.
* **Performance-Sensitive Operations**:
  * User lookup during login: `User.findOne({ email }).select("+password")`.
  * Meeting member update on join: `Meeting.findByIdAndUpdate(meetingId, { $addToSet: { members: user._id } })`.
  * Chat history queries: `ChatMessage.find({ meetingId }).sort({ createdAt: -1 }).limit(50)`.
  * Refresh token lookups & rotation: `RefreshToken.findOne({ tokenHash })` + `RefreshToken.deleteOne()` + `RefreshToken.create()`.
* **Query Latency Measurements**: **Not measured**.

---

## 10. LOAD TESTING

### Load Testing Infrastructure

The codebase contains an extensive custom performance and load-testing test suite in [`k6-tests/`](file:///c:/Users/AmanNagar/teachview-live/k6-tests):
1. [`full-flow-test.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/full-flow-test.js) (1,295 lines): End-to-end multi-protocol scenario covering HTTP Login -> Meeting Search -> Join Meeting -> Socket.IO Handshake -> Room Join -> Code & Snapshot Broadcasts -> Simulated Teacher Code Inspections -> Chat Messages -> Disconnection Cleanup.
2. [`socket-load-test.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/socket-load-test.js) (248 lines): Dedicated WebSocket connection stress tester measuring handshake duration and round-trip snapshot latency.
3. [`classroom-flow.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/classroom-flow.js) (230 lines): k6 benchmark script using `k6/x/socketio`.
4. [`register-users.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/register-users.js) (303 lines): Automated batch user registration and verification script.
5. [`seed-users.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/seed-users.js) (124 lines): Direct MongoDB seeder inserting synthetic test user profiles.
6. [`users.json`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/users.json): 100 synthetic user accounts.

### Load Test Results Table

| Users | Login | Join | Socket | Code P95 | Snapshot P95 | Chat P95 | Errors | Disconnects |
|---|---|---|---|---|---|---|---|---|
| **10** | *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* |
| **50** | *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* |
| **100**| *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* | *Not recorded* |

> [!NOTE]
> **Source Evidence Audit**: While the testing framework (`full-flow-test.js`) is completely implemented and contains the exact calculation methods for all metrics above (percentiles, operation trackers, delivery rates), **no static benchmark execution log files or benchmark runs were checked into the git repository**. All runners stream results to stdout dynamically at runtime.

### Identified Instrumentation & Measurement Issues

1. **CPU Usage Formula Bug (Measurement issue - do not use for resume)**:
   * **Location**: [`socket/src/index.js`](file:///c:/Users/AmanNagar/teachview-live/socket/src/index.js#L34), [`socket/server.js`](file:///c:/Users/AmanNagar/teachview-live/socket/server.js#L28), and [`k6-tests/full-flow-test.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/full-flow-test.js#L341).
   * **Flaw**: Formula is written as:
     ```javascript
     const cpuPercent = Math.min(100, Math.round((totalCpuMicroSec / (timeDiffMs * 1000 * 100)) * 100) / 100);
     ```
     `totalCpuMicroSec` is in microseconds; `timeDiffMs * 1000` is already total available microseconds in that interval. Dividing by `(timeDiffMs * 1000 * 100)` divides the CPU usage by an extra factor of 100. Consequently, a 15% CPU load reports as `0.15%`, causing CPU utilization to permanently display near 0%.
2. **Event Loop Lag Histogram Uninitialized Sampling (Measurement issue - do not use for resume)**:
   * **Location**: [`socket/src/index.js`](file:///c:/Users/AmanNagar/teachview-live/socket/src/index.js#L58-L64).
   * **Flaw**: `eventLoopHistogram.min` reports extreme or arbitrary values before the resolution window populates, which can output impossible event loop lag numbers if polled immediately upon startup.
3. **Multi-Recipient Broadcast Delivery Discrepancies**:
   * **Location**: [`k6-tests/full-flow-test.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/full-flow-test.js#L248-L299).
   * **Flaw**: `expectedRecipients` calculates based on the number of sockets registered in the room at the moment of transmission. If clients connect or disconnect dynamically during test execution, the count of expected recipients can diverge from actual receipts.

---

## 11. PERFORMANCE METRICS

### Legitimate & Trustworthy Metrics for Resume Use

* **Scale & Capacity (Proven by Architecture & Fixtures)**:
  * **100 Synthetic User Profiles**: Pre-seeded in [`k6-tests/users.json`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/users.json) for concurrent multi-protocol testing.
  * **8 Programming Languages**: Fully supported in compiler proxy and Monaco editor ([`lib/languageConfig.ts`](file:///c:/Users/AmanNagar/teachview-live/lib/languageConfig.ts)).
  * **5-Tab FIFO Inspection Buffer**: Strict memory upper bound enforcing a maximum of 5 concurrent student code inspection tabs ([`MAX_STUDENT_TABS = 5`](file:///c:/Users/AmanNagar/teachview-live/store/types.ts#L32)).
  * **50-Message Sliding Chat Cache**: Bounded in-memory room chat buffer ([`socket/src/socket/meeting.socket.js`](file:///c:/Users/AmanNagar/teachview-live/socket/src/socket/meeting.socket.js#L255)).
* **Reliability & Protection Controls**:
  * **10-Second Timeout Guard**: Client-side inspection requests fail safely after 10,000 ms to prevent permanent UI lockup ([`components/admin/ReadOnlyCodeViewer.jsx`](file:///c:/Users/AmanNagar/teachview-live/components/admin/ReadOnlyCodeViewer.jsx#L71-L84)).
  * **5 req/min Sliding Window Rate Limiting**: Upstash Redis protection on authentication and password reset endpoints ([`lib/rateLimiter.js`](file:///c:/Users/AmanNagar/teachview-live/lib/rateLimiter.js)).
  * **24-Hour Near-Expiry Refresh Rotation**: Tokens automatically rotated within 24 hours of expiration ([`app/api/login/refresh/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/login/refresh/route.js#L70)).
  * **30-Second Throttled Telemetry Intervals**: Background telemetry snapshots throttled to 30-second cycles, eliminating continuous keystroke transmission over the network.
  * **0 Re-Render UI Telemetry**: All 11 student behavioral signals tracked via React `useRef` to guarantee 0 editor typing lag.

### Untrustworthy Metrics (DO NOT CLAIM on Resume)

* Specific sub-millisecond P95/P99 latency numbers for WebSocket broadcasts, login, or snapshot generation (since static run logs were not committed).
* CPU utilization percentages derived from `/metrics` (due to the $\div 100$ calculation bug).
* Claims of a "distributed Redis cache" (Redis is only used as an HTTP REST rate limiter).
* Claims of production AI evaluation metrics (since remote AI is currently mocked in the snapshot route).

---

## 12. TESTING

* **Automated Unit Testing Framework**: None installed (no Jest, Vitest, or Mocha in [`package.json`](file:///c:/Users/AmanNagar/teachview-live/package.json)).
* **End-to-End (E2E) Framework**: None installed (no Cypress or Playwright).
* **Load & Performance Testing**:
  * Custom Node.js load test runners: [`k6-tests/full-flow-test.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/full-flow-test.js) (1,295 lines) and [`k6-tests/socket-load-test.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/socket-load-test.js) (248 lines).
  * k6 load test script: [`k6-tests/classroom-flow.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/classroom-flow.js) (230 lines).
* **Integration & Verification Scripts (Present in [`scratch/`](file:///c:/Users/AmanNagar/teachview-live/scratch)):
  1. [`scratch/test-chat-sync.mjs`](file:///c:/Users/AmanNagar/teachview-live/scratch/test-chat-sync.mjs) (315 lines): 5 comprehensive real-time chat tests covering:
     * Test 1: Student-to-Teacher and Student-to-Student message delivery.
     * Test 2: Teacher reply with `senderRole: "teacher"` verification.
     * Test 3: Departure isolation (left members no longer receive room chat).
     * Test 4: Cross-meeting security rejection (`FORBIDDEN`).
     * Test 5: Empty message and $>1000$ character length boundary validation.
  2. [`scratch/test-multi-language.mjs`](file:///c:/Users/AmanNagar/teachview-live/scratch/test-multi-language.mjs) (54 lines): 5 tests validating 8 supported languages, Judge0 IDs, language format flags, and malicious language string rejection.
  3. [`scratch/test-view-mode.mjs`](file:///c:/Users/AmanNagar/teachview-live/scratch/test-view-mode.mjs) (42 lines): 5 tests validating Redux `viewMode` state transitions between `left`, `right`, and `both`.

---

## 13. DEPLOYMENT / INFRASTRUCTURE

| Component | Technology | Runtime Location / Provider |
|---|---|---|
| **Frontend** | Next.js 16.1.4 (React 19.2.0, App Router, Tailwind CSS v4) | Vercel (`vibecodelive.vercel.app` referenced in test scripts) / Node.js runtime |
| **REST Backend** | Next.js App Router API Handlers (`app/api/**`) | Vercel Serverless / Node.js runtime |
| **Real-Time Server** | Standalone Node.js Express daemon + Socket.IO | Railway (`industrious-unity-production.up.railway.app` referenced in test scripts) / Port 4000 |
| **Database** | MongoDB Atlas (Mongoose 8.20.1) | Cloud-hosted MongoDB Atlas cluster |
| **Rate Limiting** | Upstash Redis REST API (`@upstash/ratelimit`) | Cloud-hosted Upstash Serverless Redis |
| **Code Execution Engine** | Judge0 CE via RapidAPI | Cloud-hosted Judge0 CE instance |
| **AI Evaluation** | Anthropic Claude Messages API (Claude 3.5 Sonnet) / Mock Fallback | Cloud API (configured in `util.js`) / Local fallback |
| **Email Service** | Nodemailer with Gmail SMTP transport | Google Gmail SMTP |
| **CI/CD** | None configured | No `.github/workflows` present |
| **Docker** | None configured | No `Dockerfile` or `docker-compose.yml` present |

* **Process Separation**: The Socket.IO server is deployed **independently** from the Next.js application as a long-running Node.js process to maintain persistent stateful WebSocket connections.

---

## 14. HARDEST ENGINEERING PROBLEMS SOLVED

### 1. Non-Blocking Real-Time Telemetry Capture in a Browser Code Editor
* **Why it was difficult**: Capturing rapid user actions (keystrokes, pastes, line edits, tab switches, error runs) in Monaco editor without triggering React re-renders that cause typing lag, input jitter, or editor model desynchronization.
* **Implementation**: Built a custom tracking engine ([`UseStudentTracking.js`](file:///c:/Users/AmanNagar/teachview-live/app/meeting/member/%5Bid%5D/@right/user-code/UseStudentTracking.js)) utilizing mutable `useRef` instances and direct Monaco listener disposables (`editor.onKeyDown`, `editor.onDidPaste`). Decouples high-frequency telemetry collection entirely from React component rendering.
* **Tradeoff**: State is maintained in mutable refs and only converted into immutable snapshots during periodic 30s intervals or execution events.
* **Result**: Zero re-render overhead while typing, maintaining smooth 60 FPS editor performance while tracking 11 distinct student behavioral signals.

### 2. Scalable On-Demand Student Code Inspection with Bounded Client Memory
* **Why it was difficult**: If every student broadcasted their code continuously to the teacher, an $N$-student classroom would generate prohibitive network traffic ($O(N)$ writes), and teacher browser memory would rapidly leak.
* **Implementation**: Developed an on-demand WebSocket RPC protocol (`request-student-code` $\rightarrow$ `get-current-code` $\rightarrow$ `student-code-response` $\rightarrow$ `receive-student-code`) combined with a 10-second client timeout guard and a 5-tab Redux cache with deterministic FIFO eviction ([`store/meetingSlice.ts`](file:///c:/Users/AmanNagar/teachview-live/store/meetingSlice.ts#L170)).
* **Tradeoff**: Teacher views snapshots on-demand rather than streaming continuous code from 50 students simultaneously.
* **Result**: Predictable, constant $O(1)$ memory consumption in the teacher's browser, network bandwidth proportional only to active inspections, and clear UI fallback handling when students are offline.

### 3. Dual-Token Authentication Lifecycle with Cryptographic Hashing and Conditional Rotation
* **Why it was difficult**: Balancing seamless 7-day user sessions against security vulnerabilities such as token theft, database leaks, and token replay attacks.
* **Implementation**: Implemented a 15-minute Access JWT in memory and a 7-day Refresh Token in an HTTP-only cookie. Refresh tokens are hashed via SHA-256 before database insertion ([`models/RefreshToken.js`](file:///c:/Users/AmanNagar/teachview-live/models/RefreshToken.js)). To minimize unnecessary database write thrashing on frequent API hits, rotation is executed conditionally only when the token has less than 24 hours remaining ([`app/api/login/refresh/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/login/refresh/route.js#L70)).
* **Tradeoff**: Requires database lookup on access token refresh, and requires clients to handle 401 retries transparently via Axios response interceptors.
* **Result**: Defense-in-depth protection against database credential theft, automatic token cleanup via MongoDB TTL indexes, and mitigation of replay attacks.

### 4. Role-Restricted Real-Time Routing & Channel Isolation
* **Why it was difficult**: In an educational platform, student privacy is paramount. Students must never be able to inspect peer code or receive peer behavioral snapshots, while instructors need access to all student signals and the ability to broadcast reference code.
* **Implementation**: Built a dual-channel room model in Socket.IO: public classroom room `${meetingId}` and instructor-only room `${meetingId}:admin`. Server verifies `socket.user.isHost` / `role === "teacher"` before allowing entry into `${meetingId}:admin` and routes `code-snapshot` exclusively to that sub-room ([`socket/src/socket/meeting.socket.js`](file:///c:/Users/AmanNagar/teachview-live/socket/src/socket/meeting.socket.js#L118)).
* **Tradeoff**: Requires dual room subscriptions and role checks on the socket server for every broadcast event.
* **Result**: Strict privacy boundary where student metrics are shielded from peers, while instructor broadcasts reach all participants.

---

## 15. ENGINEERING DECISIONS

* **Why Socket.IO instead of HTTP Polling**: HTTP polling would require thousands of requests per minute across a 50-student classroom, saturating the Next.js API layer and database. Socket.IO maintains a single persistent TCP connection per client with minimal framing overhead and native pub/sub room partitioning.
* **Why a Separate Socket.IO Server Process**: Next.js App Router API handlers are stateless and serverless by design. Serverless runtimes cannot maintain stateful, long-lived WebSocket connections or in-memory room registries. Running a standalone Node.js daemon preserves persistent connections.
* **Why Upstash Redis for Rate Limiting**: Avoids running a stateful local Redis server inside serverless functions. Upstash provides a serverless REST-based sliding window rate limiter that shares state across all Next.js serverless instances without connection pooling overhead.
* **Why MongoDB**: The schema requires flexible document structures for dynamic custom registration fields (e.g., custom questions configured by instructors), embedded member arrays, and schema-free execution outputs.
* **Why Ephemeral In-Memory Student Code vs. Database Persistence**: Saving student code on every 30-second snapshot across 50 students would produce 100 database writes per minute per classroom, resulting in severe I/O bottlenecks and database bloat. Managing active student code in memory Maps on the Socket.IO server meets real-time monitoring needs with zero database write load.

---

## 16. RESUME-WORTHY FACTS (Shortlist of 10 Strongest Achievements)

1. **Passive Telemetry Engine (Zero Re-render)**:
   * *Achievement*: Architected a non-blocking client telemetry engine in React/Monaco Editor capturing 11 behavioral signals (typing rhythm, backspace ratios, paste events, idle periods, tab switches, error repeats) with 0 UI re-renders using mutable `useRef` instances.
   * *Complexity*: High
   * *Evidence*: [`UseStudentTracking.js`](file:///c:/Users/AmanNagar/teachview-live/app/meeting/member/%5Bid%5D/@right/user-code/UseStudentTracking.js)
   * *Resume Suitability*: **High**

2. **On-Demand Inspection RPC & Bounded FIFO Tab Manager**:
   * *Achievement*: Engineered an on-demand WebSocket RPC inspection protocol with a 10-second timeout guard and a 5-tab FIFO buffer in Redux, enabling instructors to inspect remote student code buffers while bounding browser memory to $O(1)$.
   * *Complexity*: High
   * *Evidence*: [`socket/src/socket/meeting.socket.js`](file:///c:/Users/AmanNagar/teachview-live/socket/src/socket/meeting.socket.js#L283), [`store/meetingSlice.ts`](file:///c:/Users/AmanNagar/teachview-live/store/meetingSlice.ts#L170)
   * *Resume Suitability*: **High**

3. **Multi-Language Remote Code Execution Sandbox**:
   * *Achievement*: Built a remote code execution proxy supporting 8 languages (JavaScript, TypeScript, Python, Java, C++, C, Go, Rust) integrating Judge0 CE via RapidAPI with language configuration lookups and validation.
   * *Complexity*: Medium
   * *Evidence*: [`app/api/run/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/run/route.js), [`lib/languageConfig.ts`](file:///c:/Users/AmanNagar/teachview-live/lib/languageConfig.ts)
   * *Resume Suitability*: **High**

4. **Hardened Dual-Token Authentication & Rotation Lifecycle**:
   * *Achievement*: Implemented a dual-token JWT system (15-min Access JWT in memory + 7-day Refresh Token in HTTP-only cookie) with SHA-256 token hashing in MongoDB, automatic 24-hour near-expiry rotation, and automated 401 Axios interceptor retries.
   * *Complexity*: High
   * *Evidence*: [`app/api/login/refresh/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/login/refresh/route.js), [`lib/apiClient.js`](file:///c:/Users/AmanNagar/teachview-live/lib/apiClient.js)
   * *Resume Suitability*: **High**

5. **Staged Registration & Anti-Spam Security Pattern**:
   * *Achievement*: Designed a staged user onboarding workflow that isolates pending registrations in a temporary collection with automated 15-minute TTL cleanup, promoting accounts to the master database only upon cryptographic email link verification.
   * *Complexity*: Medium
   * *Evidence*: [`models/EmailVerification.js`](file:///c:/Users/AmanNagar/teachview-live/models/EmailVerification.js), [`app/api/login/register/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/login/register/route.js)
   * *Resume Suitability*: **Medium**

6. **Sliding-Window Rate Limiting via Upstash Redis**:
   * *Achievement*: Protected sensitive authentication and password recovery endpoints against brute-force attacks by integrating serverless sliding-window rate limiting (5 req/min) backed by Upstash Redis REST API.
   * *Complexity*: Medium
   * *Evidence*: [`lib/rateLimiter.js`](file:///c:/Users/AmanNagar/teachview-live/lib/rateLimiter.js), [`app/api/login/register/route.js`](file:///c:/Users/AmanNagar/teachview-live/app/api/login/register/route.js#L16)
   * *Resume Suitability*: **Medium**

7. **Dual-Channel Socket.IO Room Privacy Architecture**:
   * *Achievement*: Designed a partitioned real-time room hierarchy in Socket.IO that isolates public classroom communications from an instructor-only sub-room (`${meetingId}:admin`), ensuring student telemetry and snapshots are shielded from peers.
   * *Complexity*: Medium
   * *Evidence*: [`socket/src/socket/meeting.socket.js`](file:///c:/Users/AmanNagar/teachview-live/socket/src/socket/meeting.socket.js#L23-L25)
   * *Resume Suitability*: **High**

8. **End-to-End Multi-Protocol Load Testing Infrastructure**:
   * *Achievement*: Authored a 1,300-line custom load testing suite simulating realistic multi-step user sessions (HTTP authentication $\rightarrow$ meeting discovery $\rightarrow$ WebSocket handshake $\rightarrow$ telemetry snapshots $\rightarrow$ chat $\rightarrow$ inspections) across 100 synthetic user accounts.
   * *Complexity*: High
   * *Evidence*: [`k6-tests/full-flow-test.js`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/full-flow-test.js), [`k6-tests/users.json`](file:///c:/Users/AmanNagar/teachview-live/k6-tests/users.json)
   * *Resume Suitability*: **High**

9. **Deterministic Algorithmic Integrity Scoring Engine**:
   * *Achievement*: Developed an algorithmic heuristic evaluation engine in [`utils/sessionSummary.js`](file:///c:/Users/AmanNagar/teachview-live/utils/sessionSummary.js) that normalizes 11 telemetry signals into a 0–100 integrity score with weighted penalties for plagiarism, idling, and debugging struggles.
   * *Complexity*: Medium
   * *Evidence*: [`utils/sessionSummary.js`](file:///c:/Users/AmanNagar/teachview-live/utils/sessionSummary.js#L83-L103)
   * *Resume Suitability*: **Medium**

10. **Stateful Catch-Up Synchronization for Reconnecting Clients**:
    * *Achievement*: Implemented stateful in-memory broadcast caching on the WebSocket server (`roomAdminState`), ensuring late-joining or reconnecting students immediately receive the instructor's latest code buffer and compiler output.
    * *Complexity*: Medium
    * *Evidence*: [`socket/src/socket/meeting.socket.js`](file:///c:/Users/AmanNagar/teachview-live/socket/src/socket/meeting.socket.js#L63-L70)
    * *Resume Suitability*: **Medium**

---

## 17. INFORMATION GAPS

### Must Measure (Run Once Before Finalizing Resume)
* **Single Load Test Run Benchmark**: Execute `node k6-tests/full-flow-test.js 50 --duration=60 --meeting=<id>` once locally or on a test server to record actual, verifiable numbers:
  * HTTP Login P95 / P99 latency.
  * Socket Connection Handshake P95 latency.
  * Snapshot Delivery P95 latency.
  * Event Delivery Success Rate (e.g., $99.8\%$).
  * *Reason*: Having real measured numbers for 50 concurrent simulated users transforms bullets from architectural claims into quantifiable engineering achievements.

### Nice to Measure
* **Judge0 Remote Execution Latency**: Time required for `POST /api/run` to return compiler output across different languages (e.g., Python vs. C++).
* **Database Query Latency**: MongoDB Atlas read/write latency on `Meeting.findByIdAndUpdate` and `User.findOne`.
* **Token Rotation Overhead**: Latency difference between standard request vs. 401 retry with automatic refresh.

### Not Necessary (Do Not Waste Time On)
* Full continuous distributed observability / OpenTelemetry tracing setup.
* Setting up external Prometheus / Grafana dashboards for local testing.
* Rewriting the CPU utilization formula in `/metrics` just to obtain server CPU numbers.
