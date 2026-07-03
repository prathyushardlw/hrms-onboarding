// ============================================
// MongoDB-backed data store (Mongoose)
// File helpers remain on disk (PDFs, uploads)
// ============================================
import fs from "fs";
import path from "path";
import type mongoose from "mongoose";
import { connectDB } from "./mongodb";
import {
  CompanyModel, UserModel, TemplateModel, DocRuleModel,
  OnboardingModel, AuditLogModel, JobModel, CandidateModel,
  InterviewModel, OfferModel, EmployeeModel,
} from "./models";
import type {
  Company, User, DocumentTemplate, EmployeeTypeDocRule,
  Onboarding, AuditLog, Job, Candidate, InterviewRound,
  OfferLetter, Employee,
} from "./types";

// File directories (still on disk)
const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const TEMPLATES_DIR = path.join(DATA_DIR, "templates");
const RESUMES_DIR = path.join(DATA_DIR, "resumes");
const OFFERS_DIR = path.join(DATA_DIR, "offers");

for (const dir of [DATA_DIR, UPLOADS_DIR, TEMPLATES_DIR, RESUMES_DIR, OFFERS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// ---- Async CRUD factory ----

function createStore<T extends { id: string }>(Model: mongoose.Model<T & { _id?: unknown }>) {
  return {
    async getAll(): Promise<T[]> {
      await connectDB();
      const docs = await Model.find({}).lean();
      return docs.map(({ _id, __v, ...rest }) => rest as unknown as T);
    },

    async getById(id: string): Promise<T | undefined> {
      await connectDB();
      const doc = await Model.findOne({ id }).lean();
      if (!doc) return undefined;
      const { _id, __v, ...rest } = doc as Record<string, unknown>;
      return rest as unknown as T;
    },

    async create(item: T): Promise<T> {
      await connectDB();
      await Model.create(item);
      return item;
    },

    async update(id: string, updates: Partial<T>): Promise<T | undefined> {
      await connectDB();
      const doc = await Model.findOneAndUpdate(
        { id },
        { $set: updates },
        { new: true, lean: true }
      );
      if (!doc) return undefined;
      const { _id, __v, ...rest } = doc as Record<string, unknown>;
      return rest as unknown as T;
    },

    async delete(id: string): Promise<boolean> {
      await connectDB();
      const result = await Model.deleteOne({ id });
      return result.deletedCount > 0;
    },

    /** Fetch all then filter in-memory (keeps same predicate interface) */
    async find(predicate: (item: T) => boolean): Promise<T[]> {
      const all = await this.getAll();
      return all.filter(predicate);
    },
  };
}

// ---- Exported stores ----

export const companiesStore  = createStore<Company>(CompanyModel as any);
export const usersStore      = createStore<User>(UserModel as any);
export const templatesStore  = createStore<DocumentTemplate>(TemplateModel as any);
export const docRulesStore   = createStore<EmployeeTypeDocRule>(DocRuleModel as any);
export const onboardingsStore = createStore<Onboarding>(OnboardingModel as any);
export const auditLogsStore  = createStore<AuditLog>(AuditLogModel as any);
export const jobsStore       = createStore<Job>(JobModel as any);
export const candidatesStore = createStore<Candidate>(CandidateModel as any);
export const interviewsStore = createStore<InterviewRound>(InterviewModel as any);
export const offersStore     = createStore<OfferLetter>(OfferModel as any);
export const employeesStore  = createStore<Employee>(EmployeeModel as any);

/** Generate next employee ID: prefix + zero-padded sequence */
export async function generateEmployeeId(companyId: string): Promise<string> {
  const company = await companiesStore.getById(companyId);
  const prefix = (company?.name ?? "EMP").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 3) || "EMP";
  const existing = await employeesStore.find((e) => e.companyId === companyId);
  const seq = existing.length + 1;
  return `${prefix}${String(seq).padStart(3, "0")}`;
}

// ---- File helpers (unchanged) ----

export function getUploadsDir(): string { return UPLOADS_DIR; }
export function getTemplatesDir(): string { return TEMPLATES_DIR; }

export function saveUploadedFile(onboardingId: string, fileName: string, buffer: Buffer): string {
  const dir = path.join(UPLOADS_DIR, onboardingId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function getUploadedFilePath(onboardingId: string, fileName: string): string {
  return path.join(UPLOADS_DIR, onboardingId, fileName);
}

export function saveResumeFile(candidateId: string, fileName: string, buffer: Buffer): string {
  const dir = path.join(RESUMES_DIR, candidateId);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, fileName);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function getResumeFilePath(candidateId: string, fileName: string): string {
  return path.join(RESUMES_DIR, candidateId, fileName);
}

export function getResumesDir(): string { return RESUMES_DIR; }

export function saveOfferPdf(offerId: string, buffer: Buffer): string {
  const filePath = path.join(OFFERS_DIR, `${offerId}.pdf`);
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

export function getOfferPdfPath(offerId: string): string {
  return path.join(OFFERS_DIR, `${offerId}.pdf`);
}
