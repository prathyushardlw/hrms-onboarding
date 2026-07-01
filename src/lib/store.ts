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
  Job,
  Candidate,
  InterviewRound,
  OfferLetter,
  Employee,
} from "./types";

const DATA_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const TEMPLATES_DIR = path.join(DATA_DIR, "templates");
const RESUMES_DIR = path.join(DATA_DIR, "resumes");
const OFFERS_DIR = path.join(DATA_DIR, "offers");

// Ensure directories exist
for (const dir of [DATA_DIR, UPLOADS_DIR, TEMPLATES_DIR, RESUMES_DIR, OFFERS_DIR]) {
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
export const jobsStore = createStore<Job>("jobs");
export const candidatesStore = createStore<Candidate>("candidates");
export const interviewsStore = createStore<InterviewRound>("interviews");
export const offersStore = createStore<OfferLetter>("offers");
export const employeesStore = createStore<Employee>("employees");

/** Generate next employee ID: prefix (first 3 chars of company name uppercased) + zero-padded sequence */
export function generateEmployeeId(companyId: string): string {
  const company = companiesStore.getById(companyId);
  const prefix = (company?.name ?? "EMP").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3) || "EMP";
  const existing = employeesStore.find((e) => e.companyId === companyId);
  const seq = existing.length + 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

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

export function saveResumeFile(
  candidateId: string,
  fileName: string,
  buffer: Buffer
): string {
  const dir = path.join(RESUMES_DIR, candidateId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function getResumeFilePath(candidateId: string, fileName: string): string {
  return path.join(RESUMES_DIR, candidateId, fileName);
}

export function getResumesDir(): string {
  return RESUMES_DIR;
}

export function saveOfferPdf(offerId: string, buffer: Buffer): string {
  const filePath = path.join(OFFERS_DIR, `${offerId}.pdf`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function getOfferPdfPath(offerId: string): string {
  return path.join(OFFERS_DIR, `${offerId}.pdf`);
}
