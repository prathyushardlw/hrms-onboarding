// ============================================
// E-Onboarding — Core Types
// ============================================

export type EmploymentType = "full-time" | "part-time" | "contract" | "intern";

export type OnboardingStatus =
  | "initiated"
  | "sent"
  | "in_progress"
  | "submitted"
  | "verified"
  | "completed";

export type DocumentStatus =
  | "pending"
  | "filled"
  | "signed"
  | "uploaded"
  | "verified"
  | "correction_requested";

export type UserRole = "admin" | "hr" | "viewer";

export type AuditEvent =
  | "created"
  | "sent"
  | "link_opened"
  | "document_viewed"
  | "document_signed"
  | "document_uploaded"
  | "submitted"
  | "verified"
  | "correction_requested"
  | "completed";

// ---- Entities ----

export interface Company {
  id: string;
  name: string;
  logo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  companyId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SignatureField {
  id: string;
  role: "candidate" | "hr";
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TemplatePlaceholder {
  key: string;
  label: string;
  source: string; // e.g. "candidate.name", "onboarding.joiningDate"
}

export interface DocumentTemplate {
  id: string;
  companyId: string;
  name: string;
  category: "compliance" | "banking" | "agreement" | "identity" | "other";
  fileName: string; // stored file name in data/templates/
  templateType: "pdf" | "html";
  placeholders: TemplatePlaceholder[];
  signatureFields: SignatureField[];
  uploadRequired: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeTypeDocRule {
  id: string;
  companyId: string;
  employmentType: EmploymentType;
  requiredDocuments: string[]; // template IDs
  optionalDocuments: string[]; // template IDs
  createdAt: string;
  updatedAt: string;
}

export interface OnboardingDocument {
  id: string;
  templateId: string;
  name: string;
  required: boolean;
  uploadRequired: boolean;
  status: DocumentStatus;
  fieldValues?: Record<string, string>;
  filledFileUrl?: string;
  signedFileUrl?: string;
  uploadedFileUrl?: string;
  candidateSignature?: { dataUrl: string; signedAt: string };
  hrSignature?: { dataUrl: string; signedAt: string };
  correctionNote?: string;
  completedAt?: string;
}

export interface Onboarding {
  id: string;
  companyId: string;
  candidate: {
    name: string;
    email: string;
    phone: string;
    address?: string;
    ssn?: string; // encrypted
  };
  employmentType: EmploymentType;
  department: string;
  designation: string;
  joiningDate: string;
  status: OnboardingStatus;
  accessToken: string;
  tokenExpiresAt: string;
  documents: OnboardingDocument[];
  combinedPackageUrl?: string;
  zipPackageUrl?: string;
  createdBy: string; // user ID
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  onboardingId: string;
  event: AuditEvent;
  performedBy: { type: "hr" | "candidate" | "system"; id?: string };
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
}

// ---- API helpers ----

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}
