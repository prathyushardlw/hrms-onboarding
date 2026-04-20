// ============================================
// Local JSON file-based data store
// Stores data in /data/*.json files
// ============================================
import fs from "fs";
import path from "path";
import type {
  Company,
  User,
  DocumentTemplate,
  EmployeeTypeDocRule,
  Onboarding,
  AuditLog,
} from "./types";

const DATA_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const TEMPLATES_DIR = path.join(DATA_DIR, "templates");

// Ensure directories exist
for (const dir of [DATA_DIR, UPLOADS_DIR, TEMPLATES_DIR]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// ---- Generic helpers ----

function getFilePath(collection: string): string {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readCollection<T>(collection: string): T[] {
  const fp = getFilePath(collection);
  if (!fs.existsSync(fp)) {
    fs.writeFileSync(fp, "[]", "utf-8");
    return [];
  }
  const raw = fs.readFileSync(fp, "utf-8");
  return JSON.parse(raw) as T[];
}

function writeCollection<T>(collection: string, data: T[]): void {
  const fp = getFilePath(collection);
  fs.writeFileSync(fp, JSON.stringify(data, null, 2), "utf-8");
}

// ---- CRUD factory ----

function createStore<T extends { id: string }>(collection: string) {
  return {
    getAll(): T[] {
      return readCollection<T>(collection);
    },

    getById(id: string): T | undefined {
      return readCollection<T>(collection).find((item) => item.id === id);
    },

    create(item: T): T {
      const items = readCollection<T>(collection);
      items.push(item);
      writeCollection(collection, items);
      return item;
    },

    update(id: string, updates: Partial<T>): T | undefined {
      const items = readCollection<T>(collection);
      const idx = items.findIndex((item) => item.id === id);
      if (idx === -1) return undefined;
      items[idx] = { ...items[idx], ...updates };
      writeCollection(collection, items);
      return items[idx];
    },

    delete(id: string): boolean {
      const items = readCollection<T>(collection);
      const filtered = items.filter((item) => item.id !== id);
      if (filtered.length === items.length) return false;
      writeCollection(collection, filtered);
      return true;
    },

    find(predicate: (item: T) => boolean): T[] {
      return readCollection<T>(collection).filter(predicate);
    },
  };
}

// ---- Exported stores ----

export const companiesStore = createStore<Company>("companies");
export const usersStore = createStore<User>("users");
export const templatesStore = createStore<DocumentTemplate>("templates");
export const docRulesStore = createStore<EmployeeTypeDocRule>("docRules");
export const onboardingsStore = createStore<Onboarding>("onboardings");
export const auditLogsStore = createStore<AuditLog>("auditLogs");

// ---- File helpers ----

export function getUploadsDir(): string {
  return UPLOADS_DIR;
}

export function getTemplatesDir(): string {
  return TEMPLATES_DIR;
}

export function saveUploadedFile(
  onboardingId: string,
  fileName: string,
  buffer: Buffer
): string {
  const dir = path.join(UPLOADS_DIR, onboardingId);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function getUploadedFilePath(
  onboardingId: string,
  fileName: string
): string {
  return path.join(UPLOADS_DIR, onboardingId, fileName);
}
