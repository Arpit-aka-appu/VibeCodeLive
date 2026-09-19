import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// 1. ENVIRONMENT CONFIGURATION LOADING
// ============================================================================
function loadEnv() {
  const envFiles = [
    path.resolve(__dirname, "../.env.local"),
    path.resolve(__dirname, "../.env"),
    path.resolve(__dirname, "../socket/.env"),
  ];
  for (const file of envFiles) {
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, "utf-8").split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [k, ...v] = trimmed.split("=");
          const key = k.trim();
          const val = v.join("=").trim().replace(/^["']|["']$/g, "");
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadEnv();

// ============================================================================
// 2. CLI ARGUMENT PARSING
// Usage:
//   node k6-tests/register-users.js 25
//   node k6-tests/register-users.js 50
//   node k6-tests/register-users.js 100
//   node k6-tests/register-users.js --count=50 --url=http://localhost:3000
// ============================================================================
const args = process.argv.slice(2);
let targetUsers = 25; // Default batch size
let baseUrl = process.env.APP_URL || process.env.NEXTAUTH_URL || "http://localhost:3000";
let delayMs = 50; // Delay between registrations in ms
let verbose = false;

// Normalize baseUrl if it lacks protocol
if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
  baseUrl = `http://${baseUrl}`;
}
// Remove trailing slash
baseUrl = baseUrl.replace(/\/$/, "");

for (const arg of args) {
  if (/^\d+$/.test(arg)) {
    targetUsers = parseInt(arg, 10);
  } else if (arg.startsWith("--count=") || arg.startsWith("--users=")) {
    targetUsers = parseInt(arg.split("=")[1], 10);
  } else if (arg.startsWith("--url=") || arg.startsWith("--base-url=")) {
    baseUrl = arg.split("=")[1].replace(/\/$/, "");
  } else if (arg.startsWith("--delay=")) {
    delayMs = parseInt(arg.split("=")[1], 10);
  } else if (arg === "--verbose" || arg === "-v") {
    verbose = true;
  } else if (arg === "--help" || arg === "-h") {
    console.log(`
Automated User Registration & Email Verification Workflow

Usage:
  node k6-tests/register-users.js [count] [options]

Arguments:
  count                  Number of users to register (e.g. 25, 50, 100) [Default: 25]

Options:
  --count=N, --users=N   Specify target user count
  --url=URL              Base URL of the Next.js server (Default: http://localhost:3000)
  --delay=MS             Delay in ms between user requests (Default: 50)
  --verbose, -v          Show detailed server response logs
  --help, -h             Show this help message

Examples:
  node k6-tests/register-users.js 25
  node k6-tests/register-users.js 50
  node k6-tests/register-users.js 100
  node k6-tests/register-users.js 100 --url=http://localhost:3000 --delay=100
`);
    process.exit(0);
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================================
// 3. MAIN WORKFLOW
// ============================================================================
async function run() {
  console.log("==================================================");
  console.log("🚀 Automated User Registration & Verification");
  console.log(`   Target Users : ${targetUsers}`);
  console.log(`   Server URL   : ${baseUrl}`);
  console.log(`   Delay / User : ${delayMs}ms`);
  console.log("==================================================");

  // 1. Load users from users.json
  const usersFilePath = path.resolve(__dirname, "users.json");
  if (!fs.existsSync(usersFilePath)) {
    console.error(`❌ Error: users.json file not found at: ${usersFilePath}`);
    process.exit(1);
  }

  let rawUsers = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));

  // Auto-expand users.json if requested count exceeds existing records
  if (targetUsers > rawUsers.length) {
    console.log(`ℹ️  Expanding users.json from ${rawUsers.length} to ${targetUsers} users...`);
    for (let i = rawUsers.length + 1; i <= targetUsers; i++) {
      rawUsers.push({
        email: `loadtest_student_${String(i).padStart(3, "0")}@example.com`,
        password: "LoadTest@2026",
      });
    }
    fs.writeFileSync(usersFilePath, JSON.stringify(rawUsers, null, 2), "utf-8");
  }

  const selectedUsers = rawUsers.slice(0, targetUsers);
  console.log(`📋 Loaded ${selectedUsers.length} users to process.\n`);

  // Track results
  const stats = {
    total: selectedUsers.length,
    registeredAndVerified: 0,
    alreadyRegistered: 0,
    failedRegister: 0,
    failedVerify: 0,
  };

  const startTime = Date.now();

  for (let i = 0; i < selectedUsers.length; i++) {
    const student = selectedUsers[i];
    const indexLabel = `[${String(i + 1).padStart(String(targetUsers).length, " ")}/${targetUsers}]`;
    const email = student.email.toLowerCase().trim();
    const password = student.password;
    const name = student.name || `Student ${String(i + 1).padStart(3, "0")}`;

    const payload = {
      name,
      email,
      password,
      confirmPassword: password,
    };

    // Forwarding simulated IP to avoid rate limit conflicts if enabled
    const simulatedIp = `10.0.${Math.floor(i / 250)}.${(i % 250) + 1}`;

    try {
      // Step A: Send request to Register route
      const registerRes = await fetch(`${baseUrl}/api/login/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-forwarded-for": simulatedIp,
        },
        body: JSON.stringify(payload),
      });

      let registerData = {};
      try {
        registerData = await registerRes.json();
      } catch (err) {
        // If non-JSON returned
        const text = await registerRes.text();
        console.error(`${indexLabel} ❌ Non-JSON response from register route (${registerRes.status}):`, text.slice(0, 100));
        stats.failedRegister++;
        continue;
      }

      if (verbose) {
        console.log(`${indexLabel} [DEBUG Register Response]:`, registerData);
      }

      // Check if user already exists
      if (
        registerRes.status === 409 ||
        registerData.status === 409 ||
        registerData.message?.toLowerCase().includes("already registered") ||
        registerData.message?.toLowerCase().includes("already exist")
      ) {
        console.log(`${indexLabel} ⚠️  Already registered: ${email}`);
        stats.alreadyRegistered++;
        if (delayMs > 0) await sleep(delayMs);
        continue;
      }

      // Check for registration errors
      if (!registerRes.ok && registerRes.status !== 200) {
        console.error(
          `${indexLabel} ❌ Registration failed for ${email} (Status ${registerRes.status}): ${
            registerData.message || registerData.error || "Unknown error"
          }`
        );
        stats.failedRegister++;
        if (delayMs > 0) await sleep(delayMs);
        continue;
      }

      // Extract verification token
      const rawToken = registerData.rawToken || registerData.token || registerData.data?.rawToken;
      if (!rawToken) {
        console.error(
          `${indexLabel} ❌ Missing rawToken in registration response for ${email}. Response:`,
          registerData
        );
        stats.failedRegister++;
        if (delayMs > 0) await sleep(delayMs);
        continue;
      }

      // Step B: Send request to Verify-Email route with rawToken
      const verifyUrl = `${baseUrl}/api/login/verify-email?token=${encodeURIComponent(rawToken)}&rawToken=${encodeURIComponent(rawToken)}`;
      const verifyRes = await fetch(verifyUrl, {
        method: "GET",
        headers: {
          "x-forwarded-for": simulatedIp,
        },
      });

      let verifyData = {};
      try {
        verifyData = await verifyRes.json();
      } catch (err) {
        const text = await verifyRes.text();
        console.error(`${indexLabel} ❌ Non-JSON response from verify route (${verifyRes.status}):`, text.slice(0, 100));
        stats.failedVerify++;
        continue;
      }

      if (verbose) {
        console.log(`${indexLabel} [DEBUG Verify Response]:`, verifyData);
      }

      // Verify success condition
      if (
        verifyRes.status === 200 ||
        verifyData.status === 200 ||
        verifyData.success === true ||
        verifyData.message?.toLowerCase().includes("verified")
      ) {
        console.log(`${indexLabel} ✅ Registered & Verified: ${email} (${name})`);
        stats.registeredAndVerified++;
      } else {
        console.error(
          `${indexLabel} ❌ Verification failed for ${email}: ${verifyData.message || verifyRes.statusText}`
        );
        stats.failedVerify++;
      }
    } catch (err) {
      if (err.cause?.code === "ECONNREFUSED" || err.message?.includes("fetch failed")) {
        console.error(`\n❌ Network Error: Could not connect to server at ${baseUrl}.`);
        console.error(`   Please ensure your Next.js application is running (e.g. npm run dev).\n`);
        process.exit(1);
      }
      console.error(`${indexLabel} ❌ Unexpected error for ${email}:`, err.message);
      stats.failedRegister++;
    }

    if (delayMs > 0 && i < selectedUsers.length - 1) {
      await sleep(delayMs);
    }
  }

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  // ============================================================================
  // 4. SUMMARY REPORT
  // ============================================================================
  console.log("\n==================================================");
  console.log("📊 Registration & Verification Summary");
  console.log("==================================================");
  console.log(`   Total Users Processed    : ${stats.total}`);
  console.log(`   ✅ Registered & Verified : ${stats.registeredAndVerified}`);
  console.log(`   ⚠️  Already Registered    : ${stats.alreadyRegistered}`);
  console.log(`   ❌ Failed Registrations  : ${stats.failedRegister}`);
  console.log(`   ❌ Failed Verifications  : ${stats.failedVerify}`);
  console.log(`   ⏱️  Time Elapsed          : ${durationSec}s`);
  console.log("==================================================");

  if (stats.registeredAndVerified + stats.alreadyRegistered === stats.total) {
    console.log("🎉 All users are ready for load testing!\n");
  } else {
    console.log("⚠️ Some users failed to register or verify. Check logs above.\n");
  }
}

run().catch((err) => {
  console.error("❌ Fatal error in registration workflow:", err);
  process.exit(1);
});
