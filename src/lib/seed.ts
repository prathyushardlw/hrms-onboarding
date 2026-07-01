// Seed script — call POST /api/seed from the browser during development
// Use POST /api/seed?reset=true to wipe and reseed

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

export async function seedData(force = false) {
  // Only seed if empty (unless force reset)
  if (!force && companiesStore.getAll().length > 0) {
    return { message: "Data already seeded. Use ?reset=true to reseed." };
  }

  if (force) {
    // Wipe all collections before reseeding
    companiesStore.getAll().forEach((c) => companiesStore.delete(c.id));
    usersStore.getAll().forEach((u) => usersStore.delete(u.id));
    templatesStore.getAll().forEach((t) => templatesStore.delete(t.id));
    docRulesStore.getAll().forEach((r) => docRulesStore.delete(r.id));
  }

  const now = new Date().toISOString();

  // ---- Companies ----
  const companyDefs = [
    { name: "Tekreant" },
    { name: "MLX" },
    { name: "Labsquire" },
    { name: "Testgo" },
  ];

  const companies: Company[] = companyDefs.map((def) => ({
    id: uuidv4(),
    name: def.name,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }));
  companies.forEach((c) => companiesStore.create(c));

  const [tekreant, mlx, labsquire, testgo] = companies;

  // ---- Super Admin (platform-level, sees all companies) ----
  const superAdmin: User = {
    id: uuidv4(),
    name: "Prathyusha R",
    email: "prathyusha.r@testgo.com",
    passwordHash: await hashPassword("Admin@1234"),
    role: "super_admin",
    companyIds: [], // empty = access all
    createdAt: now,
    updatedAt: now,
  };
  usersStore.create(superAdmin);

  // ---- HR Admin per company ----
  const hrAdmins: User[] = [
    {
      id: uuidv4(),
      name: "Tekreant Admin",
      email: "admin@tekreant.com",
      passwordHash: await hashPassword("password123"),
      role: "admin",
      companyIds: [tekreant.id],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      name: "MLX Admin",
      email: "admin@mlx.com",
      passwordHash: await hashPassword("password123"),
      role: "admin",
      companyIds: [mlx.id],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      name: "Labsquire Admin",
      email: "admin@labsquire.com",
      passwordHash: await hashPassword("password123"),
      role: "admin",
      companyIds: [labsquire.id],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uuidv4(),
      name: "Testgo Admin",
      email: "admin@testgo.com",
      passwordHash: await hashPassword("password123"),
      role: "admin",
      companyIds: [testgo.id],
      createdAt: now,
      updatedAt: now,
    },
  ];
  hrAdmins.forEach((u) => usersStore.create(u));

  // Use MLX as the reference company for seeding templates & doc rules
  const company = mlx;

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
        // Part I - SSN (dashes at x:457,x:497, y:405; boxes at y:395-415)
        { id: uuidv4(), label: "Social security number", type: "ssn" as const, page: 0, x: 416, y: 395, width: 142, height: 20, fontSize: 12 },
        // Part I - EIN (dash at x:443, y:360; boxes at y:350-370)
        { id: uuidv4(), label: "Employer identification number", type: "ein" as const, page: 0, x: 416, y: 350, width: 142, height: 20, fontSize: 12 },
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
    companies: companies.map((c) => c.name),
    superAdmin: { email: superAdmin.email, password: "Admin@1234" },
    hrAdmins: hrAdmins.map((u) => ({ email: u.email, password: "password123", company: u.companyIds[0] })),
    templates: templates.length,
    rules: rules.length,
  };
}
