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
  PdfFormField,
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
    { name: "W-9 Form", category: "compliance" as const, uploadRequired: false, fileName: "w9.pdf",
      signatureFields: [{ id: uuidv4(), role: "candidate" as const, page: 0, x: 130, y: 195, width: 240, height: 12 }],
      formFields: [
        // Line 1 - Name (label at y:671, fillable area below)
        { id: uuidv4(), label: "Name", type: "text" as const, page: 0, x: 87, y: 643, width: 350, height: 16, fontSize: 11 },
        // Line 2 - Business name (label at y:637)
        { id: uuidv4(), label: "Business name", type: "text" as const, page: 0, x: 87, y: 618, width: 350, height: 16, fontSize: 11 },
        // Line 3a - Tax classification checkboxes (text at y:593)
        { id: uuidv4(), label: "Individual/sole proprietor", type: "checkbox" as const, page: 0, group: "taxClass", x: 88, y: 592, width: 10, height: 10 },
        { id: uuidv4(), label: "C Corporation", type: "checkbox" as const, page: 0, group: "taxClass", x: 188, y: 592, width: 10, height: 10 },
        { id: uuidv4(), label: "S Corporation", type: "checkbox" as const, page: 0, group: "taxClass", x: 256, y: 592, width: 10, height: 10 },
        { id: uuidv4(), label: "Partnership", type: "checkbox" as const, page: 0, group: "taxClass", x: 324, y: 592, width: 10, height: 10 },
        { id: uuidv4(), label: "Trust/estate", type: "checkbox" as const, page: 0, group: "taxClass", x: 385, y: 592, width: 10, height: 10 },
        // LLC checkbox + classification letter entry
        { id: uuidv4(), label: "LLC", type: "checkbox" as const, page: 0, group: "taxClass", x: 88, y: 579, width: 10, height: 10 },
        { id: uuidv4(), label: "LLC classification (C, S, or P)", type: "text" as const, page: 0, x: 370, y: 577, width: 22, height: 14, fontSize: 10 },
        // Other checkbox + description entry
        { id: uuidv4(), label: "Other", type: "checkbox" as const, page: 0, group: "taxClass", x: 88, y: 545, width: 10, height: 10 },
        { id: uuidv4(), label: "Other (see instructions)", type: "text" as const, page: 0, x: 170, y: 543, width: 260, height: 14, fontSize: 10 },
        // Line 4 - Exemptions (right column)
        { id: uuidv4(), label: "Exempt payee code", type: "text" as const, page: 0, x: 449, y: 565, width: 110, height: 13, fontSize: 10 },
        { id: uuidv4(), label: "FATCA code", type: "text" as const, page: 0, x: 449, y: 530, width: 110, height: 13, fontSize: 10 },
        // Line 5 - Address (label at y:501, fillable below)
        { id: uuidv4(), label: "Address (street, apt.)", type: "text" as const, page: 0, x: 87, y: 484, width: 290, height: 14, fontSize: 11 },
        // Line 6 - City/state/ZIP (label at y:479)
        { id: uuidv4(), label: "City, state, ZIP", type: "text" as const, page: 0, x: 87, y: 462, width: 290, height: 14, fontSize: 11 },
        // Line 7 - Account numbers (label at y:456)
        { id: uuidv4(), label: "Account number(s)", type: "text" as const, page: 0, x: 87, y: 438, width: 290, height: 14, fontSize: 11 },
        // Requester info (right side, label at y:501)
        { id: uuidv4(), label: "Requester's name and address", type: "text" as const, page: 0, x: 388, y: 484, width: 172, height: 14, fontSize: 9 },
        // Part I - SSN (label at y:423, boxes at y:398-415)
        { id: uuidv4(), label: "Social security number", type: "ssn" as const, page: 0, x: 435, y: 397, width: 125, height: 18, fontSize: 12 },
        // Part I - EIN (label at y:378, boxes at y:354-370)
        { id: uuidv4(), label: "Employer identification number", type: "ein" as const, page: 0, x: 435, y: 353, width: 125, height: 18, fontSize: 12 },
        // Signature date (next to signature line at y:195)
        { id: uuidv4(), label: "Date", type: "text" as const, page: 0, x: 400, y: 195, width: 160, height: 12, fontSize: 11 },
      ],
    },
    { name: "Internship Agreement", category: "agreement" as const, uploadRequired: false },
  ];

  const defaultSigField = { id: uuidv4(), role: "candidate" as const, page: 0, x: 100, y: 700, width: 200, height: 50 };

  const templates: DocumentTemplate[] = templateDefs.map((def) => ({
    id: uuidv4(),
    companyId: company.id,
    name: def.name,
    category: def.category,
    fileName: (def as { fileName?: string }).fileName || "",
    templateType: "pdf",
    placeholders: [
      { key: "Candidate_Name", label: "Full Name", source: "candidate.name" },
      { key: "Start_Date", label: "Start Date", source: "onboarding.joiningDate" },
      { key: "Position", label: "Position", source: "onboarding.designation" },
    ],
    signatureFields: (def as { signatureFields?: typeof defaultSigField[] }).signatureFields || [defaultSigField],
    formFields: (def as { formFields?: PdfFormField[] }).formFields || [],
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
