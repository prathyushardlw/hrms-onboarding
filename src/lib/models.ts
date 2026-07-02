/**
 * All Mongoose models — one per collection.
 * We use { strict: false } so any fields from our TypeScript types
 * are persisted without needing to enumerate every nested field.
 * We disable __v (version key) and transform _id → id on serialisation.
 */
import mongoose, { Schema, model, models } from "mongoose";

const opts = {
  strict: false,
  versionKey: false,
  toJSON: {
    transform(_: unknown, ret: Record<string, unknown>) {
      delete ret._id;
      return ret;
    },
  },
  toObject: {
    transform(_: unknown, ret: Record<string, unknown>) {
      delete ret._id;
      return ret;
    },
  },
};

function makeModel(name: string) {
  const schema = new Schema(
    { id: { type: String, required: true, unique: true } },
    opts
  );
  // Return existing model (important for Next.js hot-reload)
  return models[name] ?? model(name, schema);
}

export const CompanyModel     = makeModel("Company");
export const UserModel        = makeModel("User");
export const TemplateModel    = makeModel("Template");
export const DocRuleModel     = makeModel("DocRule");
export const OnboardingModel  = makeModel("Onboarding");
export const AuditLogModel    = makeModel("AuditLog");
export const JobModel         = makeModel("Job");
export const CandidateModel   = makeModel("Candidate");
export const InterviewModel   = makeModel("Interview");
export const OfferModel       = makeModel("Offer");
export const EmployeeModel    = makeModel("Employee");
