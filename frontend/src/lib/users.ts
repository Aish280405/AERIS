import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import type { UserRole } from "./auth";

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  password: string; // bcrypt hash
  role: UserRole;
  createdAt: string;
}

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

function ensureDataDir() {
  const dir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }
}

export function readUsers(): StoredUser[] {
  ensureDataDir();
  try {
    const data = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]) {
  ensureDataDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

export function findUser(email: string): StoredUser | undefined {
  const users = readUsers();
  return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function createUser(
  email: string,
  name: string,
  password: string,
  role: UserRole = "citizen"
): Promise<StoredUser | null> {
  const users = readUsers();

  // Check duplicate
  if (users.find((u) => u.email.toLowerCase() === email.toLowerCase())) {
    return null;
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const newUser: StoredUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    email: email.toLowerCase(),
    name,
    password: hashedPassword,
    role,
    createdAt: new Date().toISOString(),
  };

  users.push(newUser);
  writeUsers(users);
  return newUser;
}
