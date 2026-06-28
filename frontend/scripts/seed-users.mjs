/**
 * Seed script — creates demo user accounts.
 * Run with: node scripts/seed-users.mjs
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const USERS_FILE = path.join(__dirname, "..", "data", "users.json");

const demoUsers = [
  {
    id: "user_demo_citizen",
    email: "citizen@aeris.io",
    name: "Demo Citizen",
    password: "password123",
    role: "citizen",
  },
  {
    id: "user_demo_authority",
    email: "admin@aeris.io",
    name: "DPCC Officer",
    password: "password123",
    role: "authority",
  },
];

async function seed() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const users = [];
  for (const u of demoUsers) {
    const hashed = await bcrypt.hash(u.password, 12);
    users.push({
      ...u,
      password: hashed,
      createdAt: new Date().toISOString(),
    });
  }

  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  console.log(`✅ Seeded ${users.length} demo users to ${USERS_FILE}`);
  console.log("   citizen@aeris.io / password123 (citizen)");
  console.log("   admin@aeris.io / password123 (authority)");
}

seed();
