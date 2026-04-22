import { z } from "zod";

// ---- Onboarding creation ----

export const createOnboardingSchema = z.object({
  companyId: z.string().min(1, "Company is required"),
  candidate: z.object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("Valid email is required"),
    phone: z.string().min(14, "Valid phone number is required"),
    address: z.string().optional(),
    ssn: z.string().optional(),
  }),
  employmentType: z.enum(["full-time", "part-time", "contract", "intern"]),
  department: z.string().min(1, "Department is required"),
  designation: z.string().min(1, "Designation is required"),
  joiningDate: z.string().min(1, "Joining date is required"),
  documentTemplateIds: z.array(z.string()).min(1, "Select at least one document"),
});

export type CreateOnboardingInput = z.infer<typeof createOnboardingSchema>;

// ---- Document template ----

export const createTemplateSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1, "Template name is required"),
  category: z.enum(["compliance", "banking", "agreement", "identity", "other"]),
  templateType: z.enum(["pdf", "html"]),
  placeholders: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      source: z.string(),
    })
  ).default([]),
  signatureFields: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["candidate", "hr"]),
      page: z.number(),
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
  ).default([]),
  documentAction: z.enum(["sign_and_return", "fill_sign_return", "upload", "read_only"]).default("sign_and_return"),
  uploadRequired: z.boolean().default(false),
});

export type CreateTemplateInput = z.infer<typeof createTemplateSchema>;

// ---- Employee type doc rules ----

export const createDocRuleSchema = z.object({
  companyId: z.string().min(1),
  employmentType: z.enum(["full-time", "part-time", "contract", "intern"]),
  requiredDocuments: z.array(z.string()),
  optionalDocuments: z.array(z.string()),
});

export type CreateDocRuleInput = z.infer<typeof createDocRuleSchema>;

// ---- Company ----

export const createCompanySchema = z.object({
  name: z.string().min(1, "Company name is required"),
  logo: z.string().optional(),
});

export type CreateCompanyInput = z.infer<typeof createCompanySchema>;

// ---- User / Auth ----

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["admin", "hr", "viewer"]).default("hr"),
  companyId: z.string().min(1),
});

// ---- Correction request ----

export const correctionRequestSchema = z.object({
  documentIds: z.array(z.string().min(1)).min(1, "Select at least one document"),
  note: z.string().min(1, "Correction note is required"),
});
