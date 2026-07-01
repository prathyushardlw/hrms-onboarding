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

export type UserRole = "super_admin" | "admin" | "hr" | "viewer";

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
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  /** Companies this user can access. Empty for super_admin (access all). */
  companyIds: string[];
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

export interface PdfFormField {
  id: string;
  label: string;
  type: "text" | "checkbox" | "ssn" | "ein";
  page: number;       // 0-indexed page number
  x: number;          // x position in PDF points (from left)
  y: number;          // y position in PDF points (from bottom)
  width: number;      // width in PDF points
  height: number;     // height in PDF points
  group?: string;     // for radio-like checkbox groups (e.g. "taxClassification")
  defaultValue?: string;
  fontSize?: number;
}

export type DocumentAction = "sign_and_return" | "fill_sign_return" | "upload" | "read_only";

export interface DocumentTemplate {
  id: string;
  companyId: string;
  name: string;
  category: "compliance" | "banking" | "agreement" | "identity" | "other";
  fileName: string; // stored file name in data/templates/
  templateType: "pdf" | "html";
  placeholders: TemplatePlaceholder[];
  signatureFields: SignatureField[];
  formFields?: PdfFormField[];
  documentAction: DocumentAction;
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
  documentAction: DocumentAction;
  status: DocumentStatus;
  fieldValues?: Record<string, string>;
  filledFileUrl?: string;
  signedFileUrl?: string;
  uploadedFileUrl?: string;
  candidateSignature?: { dataUrl: string; signedAt: string; signerIp?: string; signerAgent?: string };
  hrSignature?: { dataUrl: string; signedAt: string };
  correctionNote?: string;
  completedAt?: string;
}

export interface Onboarding {
  id: string;
  companyId: string;
  candidate: {
    firstName: string;
    lastName: string;
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
  lastReminderSent?: string; // ISO date of last reminder email
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

// ---- Recruitment ----

export type JobStatus = "draft" | "open" | "closed";
export type CandidateStatus = "new" | "shortlisted" | "interview" | "offered" | "rejected";
export type CandidateSource = "linkedin" | "referral" | "agency" | "walk_in" | "job_board" | "other";

export interface Job {
  id: string;
  companyId: string;
  title: string;
  department: string;
  employmentType: EmploymentType;
  location: string;
  description: string;
  requiredSkills: string[];
  status: JobStatus;
  createdBy: string; // user ID
  createdAt: string;
  updatedAt: string;
}

export interface Candidate {
  id: string;
  jobId: string;
  companyId: string;
  name: string;
  email: string;
  phone?: string;
  source: CandidateSource;
  resumeFileName?: string; // stored in data/resumes/{candidateId}/
  currentCompany?: string;
  currentDesignation?: string;
  expectedSalary?: string;
  noticePeriod?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  status: CandidateStatus;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ---- Interviews & Offers ----

export type InterviewRecommendation = "proceed" | "hold" | "reject";
export type InterviewStatus = "scheduled" | "completed" | "cancelled";
export type OfferStatus = "draft" | "sent" | "accepted" | "rejected";

export type MeetingType = "google_meet" | "zoom" | "teams" | "in_person";

export interface InterviewRound {
  id: string;
  candidateId: string;
  jobId: string;
  companyId: string;
  roundName: string;       // e.g. "Technical Round 1", "HR Round"
  interviewerName: string; // free text
  scheduledAt?: string;    // ISO date
  meetingType?: MeetingType;
  meetingLink?: string;    // URL for virtual meetings
  status: InterviewStatus;
  rating?: number;         // 1–5
  recommendation?: InterviewRecommendation;
  feedback?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OfferLetter {
  id: string;
  candidateId: string;
  jobId: string;
  companyId: string;
  designation: string;
  department: string;
  ctc: string;             // e.g. "12 LPA" or "₹12,00,000 per annum"
  joiningDate: string;     // ISO date
  additionalTerms?: string;
  status: OfferStatus;
  pdfFileName?: string;
  // ── Signature audit trail ──
  signToken?: string;       // UUID token for candidate sign link
  signedAt?: string;        // ISO timestamp when candidate signed
  signerIp?: string;        // IP address of signer
  signerAgent?: string;     // User-agent of signer
  signedPdfFileName?: string; // PDF with embedded signature + audit page
  createdAt: string;
  updatedAt: string;
}

// ---- Employee ----

export type EmployeeStatus = "active" | "probation" | "notice" | "resigned" | "terminated";

export interface Employee {
  id: string;
  employeeId: string;        // e.g. MLX001
  companyId: string;
  onboardingId?: string;     // link back to source onboarding

  // Personal
  name: string;
  email: string;
  phone?: string;
  address?: string;
  dateOfBirth?: string;      // ISO date

  // Work
  department: string;
  designation: string;
  employmentType: EmploymentType;
  joiningDate: string;       // ISO date
  managerId?: string;        // another Employee id
  status: EmployeeStatus;

  // Compensation
  ctc?: string;

  // Bank
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;

  // Emergency
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelation?: string;

  createdAt: string;
  updatedAt: string;
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
