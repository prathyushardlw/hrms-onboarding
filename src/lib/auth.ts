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
  /** The company currently active in this session */
  activeCompanyId: string;
  /** All companies this user can access (empty = super_admin sees all) */
  companyIds: string[];
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
  companyIds: string[]
): Promise<Omit<User, "passwordHash">> {
  const existing = await usersStore.find((u) => u.email === email);
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
    companyIds,
    createdAt: now,
    updatedAt: now,
  };

  await usersStore.create(user);
  const { passwordHash: _, ...safe } = user;
  return safe;
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ user: Omit<User, "passwordHash">; token: string }> {
  const users = await usersStore.find((u) => u.email === email);
  if (users.length === 0) {
    throw new Error("Invalid email or password");
  }

  const user = users[0];
  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    throw new Error("Invalid email or password");
  }

  const activeCompanyId = user.companyIds[0] ?? "";
  const token = signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    activeCompanyId,
    companyIds: user.companyIds,
  });

  const { passwordHash: _, ...safe } = user;
  return { user: safe, token };
}

export async function switchCompany(
  userId: string,
  targetCompanyId: string
): Promise<string> {
  const users = await usersStore.find((u) => u.id === userId);
  if (users.length === 0) throw new Error("User not found");
  const user = users[0];

  if (
    user.role !== "super_admin" &&
    !user.companyIds.includes(targetCompanyId)
  ) {
    throw new Error("Access denied to this company");
  }

  return signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    activeCompanyId: targetCompanyId,
    companyIds: user.companyIds,
  });
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
