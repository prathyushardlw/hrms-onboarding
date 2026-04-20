import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { usersStore } from "./store";
import type { User, UserRole } from "./types";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

export interface JwtPayload {
  userId: string;
  email: string;
  role: UserRole;
  companyId: string;
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function registerUser(
  name: string,
  email: string,
  password: string,
  role: UserRole,
  companyId: string
): Promise<Omit<User, "passwordHash">> {
  const existing = usersStore.find((u) => u.email === email);
  if (existing.length > 0) {
    throw new Error("User with this email already exists");
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();
  const user: User = {
    id: uuidv4(),
    name,
    email,
    passwordHash,
    role,
    companyId,
    createdAt: now,
    updatedAt: now,
  };

  usersStore.create(user);
  const { passwordHash: _, ...safe } = user;
  return safe;
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: Omit<User, "passwordHash">; token: string }> {
  const users = usersStore.find((u) => u.email === email);
  if (users.length === 0) {
    throw new Error("Invalid email or password");
  }

  const user = users[0];
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
  });

  const { passwordHash: _, ...safe } = user;
  return { user: safe, token };
}

export function generateAccessToken(): {
  token: string;
  expiresAt: string;
} {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000
  ).toISOString(); // 7 days
  return { token, expiresAt };
}
