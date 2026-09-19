import mongoose from "mongoose";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env or .env.local
function loadEnv() {
  const envFiles = [".env.local", ".env"];
  for (const file of envFiles) {
    const fullPath = path.resolve(__dirname, "..", file);
    if (fs.existsSync(fullPath)) {
      const lines = fs.readFileSync(fullPath, "utf-8").split("\n");
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

const MONGODB_URI = process.env.mongodbURI || process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ Error: mongodbURI is not defined in .env or .env.local");
  process.exit(1);
}

// User schema definition
const UserSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, select: true },
    provider: { type: String, enum: ["credential", "google"], default: "credential" },
    meetingHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: "Meeting" }],
    hostedMeeting: [{ type: mongoose.Schema.Types.ObjectId, ref: "Meeting" }],
    problems: [{ type: mongoose.Schema.Types.ObjectId, ref: "Problem" }],
  },
  { timestamps: true }
);

const UserModel = mongoose.models.User || mongoose.model("User", UserSchema);

async function seed() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGODB_URI);
  console.log("✅ Connected to MongoDB.");

  const usersFilePath = path.resolve(__dirname, "users.json");
  if (!fs.existsSync(usersFilePath)) {
    console.error("❌ Error: users.json file not found at", usersFilePath);
    process.exit(1);
  }

  const requestedCount = parseInt(process.argv[2], 10);
  let rawUsers = JSON.parse(fs.readFileSync(usersFilePath, "utf-8"));

  if (requestedCount && requestedCount > rawUsers.length) {
    console.log(`Expanding users.json from ${rawUsers.length} to ${requestedCount} users...`);
    for (let i = rawUsers.length + 1; i <= requestedCount; i++) {
      rawUsers.push({
        email: `loadtest_student_${String(i).padStart(3, "0")}@example.com`,
        password: "LoadTest@2026",
      });
    }
    fs.writeFileSync(usersFilePath, JSON.stringify(rawUsers, null, 2), "utf-8");
  }

  const targetCount = requestedCount || rawUsers.length;
  console.log(`Found ${rawUsers.length} users in users.json. Verifying/seeding up to ${targetCount}...`);

  const salt = await bcrypt.genSalt(10);
  let createdCount = 0;
  let existingCount = 0;

  for (let i = 0; i < targetCount; i++) {
    const item = rawUsers[i];
    const email = item.email.toLowerCase().trim();
    const existing = await UserModel.findOne({ email });

    if (!existing) {
      const hashedPassword = await bcrypt.hash(item.password, salt);
      const studentName = `Student ${String(i + 1).padStart(3, "0")}`;

      await UserModel.create({
        name: studentName,
        email,
        password: hashedPassword,
        provider: "credential",
      });
      createdCount++;
    } else {
      existingCount++;
    }
  }

  console.log("--------------------------------------------------");
  console.log(`✅ Seeding Complete!`);
  console.log(`   - Existing in DB : ${existingCount}`);
  console.log(`   - Newly Created  : ${createdCount}`);
  console.log(`   - Total Ready    : ${rawUsers.length} users ready for testing.`);
  console.log("--------------------------------------------------");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
