// Seed script — run with: npx ts-node --esm src/lib/seed.ts
// Or call POST /api/seed from the browser during development

import { v4 as uuidv4 } from "uuid";
import { hashPassword } from "./auth";
import {
  companiesStore,
  usersStore,
  templatesStore,
  docRulesStore,
} from "./store";
import type {
  Company,
  User,
  DocumentTemplate,
  EmployeeTypeDocRule,
} from "./types";

export async function seedData() {
  // Only seed if empty
  if (companiesStore.getAll().length > 0) {
    return { message: "Data already seeded" };
  }

  const now = new Date().toISOString();

  // ---- Company ----
  const company: Company = {
    id: uuidv4(),
    name: "Acme Corporation",
    createdAt: now,
    updatedAt: now,
  };
  companiesStore.create(company);

  // ---- Admin user ----
  const adminUser: User = {
    id: uuidv4(),
    name: "HR Admin",
    email: "admin@acme.com",
    passwordHash: await hashPassword("password123"),
    role: "admin",
    companyId: company.id,
    createdAt: now,
    updatedAt: now,
  };
  usersStore.create(adminUser);

  // ---- Document templates ----
  const templateDefs = [
    { name: "I-9 Form", category: "compliance" as const, uploadRequired: false },
    { name: "W-4 Form", category: "compliance" as const, uploadRequired: false },
    { name: "Direct Deposit Form", category: "banking" as const, uploadRequired: false },
    { name: "NDA Agreement", category: "agreement" as const, uploadRequired: false },
    { name: "Employment Agreement", category: "agreement" as const, uploadRequired: false },
    { name: "Driver License", category: "identity" as const, uploadRequired: true },
    { name: "SSN Verification", category: "compliance" as const, uploadRequired: true },
    { name: "Banking Details", category: "banking" as const, uploadRequired: true },
    { name: "W-9 Form", category: "compliance" as const, uploadRequired: false },
    { name: "Internship Agreement", category: "agreement" as const, uploadRequired: false },
  ];

  const templates: DocumentTemplate[] = templateDefs.map((def) => ({
    id: uuidv4(),
    companyId: company.id,
    name: def.name,
    category: def.category,
    fileName: "",
    templateType: "pdf",
    placeholders: [
      { key: "Candidate_Name", label: "Full Name", source: "candidate.name" },
      { key: "Start_Date", label: "Start Date", source: "onboarding.joiningDate" },
      { key: "Position", label: "Position", source: "onboarding.designation" },
    ],
    signatureFields: [
      { id: uuidv4(), role: "candidate", page: 0, x: 100, y: 700, width: 200, height: 50 },
    ],
    uploadRequired: def.uploadRequired,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));

  templates.forEach((t) => templatesStore.create(t));

  // ---- Doc rules by employment type ----
  const findTemplate = (name: string) =>
    templates.find((t) => t.name === name)!.id;

  const rules: EmployeeTypeDocRule[] = [
    {
      id: uuidv4(),
      companyId: company.id,
      employmentType: "full-time",
      requiredDocuments: [
        findTemplate("I-9 Form"),
        findTemplate("W-4 Form"),
        findTemplate("Direct Deposit Form"),
        findTemplate("NDA Agreement"),
        findTemplate("Employment Agreement"),
        findTemplate("SSN Verification"),
        findTemplate("Banking Details"),
      ],
      optionalDocuments: [findTemplate("Driver License")],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      companyId: company.id,
      employmentType: "contract",
      requiredDocuments: [
        findTemplate("W-9 Form"),
        findTemplate("NDA Agreement"),
      ],
      optionalDocuments: [findTemplate("Driver License")],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      companyId: company.id,
      employmentType: "intern",
      requiredDocuments: [findTemplate("Internship Agreement")],
      optionalDocuments: [],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      companyId: company.id,
      employmentType: "part-time",
      requiredDocuments: [
        findTemplate("I-9 Form"),
        findTemplate("W-4 Form"),
        findTemplate("NDA Agreement"),
      ],
      optionalDocuments: [findTemplate("Banking Details")],
      createdAt: now,
      updatedAt: now,
    },
  ];

  rules.forEach((r) => docRulesStore.create(r));

  return {
    message: "Seed complete",
    company: company.name,
    user: { email: adminUser.email, password: "password123" },
    templates: templates.length,
    rules: rules.length,
  };
}
