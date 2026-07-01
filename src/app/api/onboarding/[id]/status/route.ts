import { NextRequest } from "next/server";
import { onboardingsStore, employeesStore, companiesStore, generateEmployeeId } from "@/lib/store";
import { logAuditEvent } from "@/lib/audit";
import { getAuthFromRequest, unauthorized, ok, notFound, badRequest } from "@/lib/api-helpers";
import { sendEmail, buildWelcomeEmployeeEmail } from "@/lib/email";
import type { OnboardingStatus, Employee } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = getAuthFromRequest(req);
  if (!auth || !["super_admin", "admin", "hr"].includes(auth.role)) return unauthorized();

  const { id } = await params;
  const onboarding = onboardingsStore.getById(id);
  if (!onboarding) return notFound("Onboarding not found");

  try {
    const body = await req.json();
    const newStatus = body.status as OnboardingStatus;

    const validTransitions: Record<string, string[]> = {
      initiated: ["sent"],
      sent: ["in_progress"],
      in_progress: ["submitted"],
      submitted: ["verified", "correction_requested"],
      verified: ["completed"],
    };

    const allowed = validTransitions[onboarding.status] || [];
    if (!allowed.includes(newStatus)) {
      return badRequest(
        `Cannot transition from ${onboarding.status} to ${newStatus}`
      );
    }

    const now = new Date().toISOString();
    onboardingsStore.update(id, { status: newStatus as OnboardingStatus, updatedAt: now });

    logAuditEvent({
      onboardingId: id,
      event: newStatus === "verified" ? "verified" : "completed",
      performedBy: { type: "hr", id: auth.userId },
    });

    // Auto-create employee when onboarding is completed
    let employee: Employee | null = null;
    if (newStatus === "completed") {
      // Only create if not already exists
      const existing = employeesStore.find((e) => e.onboardingId === id);
      if (existing.length === 0) {
        const employeeId = generateEmployeeId(onboarding.companyId);
        const newEmployee: Employee = {
          id: uuidv4(),
          employeeId,
          companyId: onboarding.companyId,
          onboardingId: id,
          name: onboarding.candidate.name,
          email: onboarding.candidate.email,
          phone: onboarding.candidate.phone || undefined,
          address: onboarding.candidate.address || undefined,
          department: onboarding.department,
          designation: onboarding.designation,
          employmentType: onboarding.employmentType,
          joiningDate: onboarding.joiningDate,
          status: "probation",
          createdAt: now,
          updatedAt: now,
        };
        employeesStore.create(newEmployee);
        employee = newEmployee;

        // Send welcome email to the new employee
        const company = companiesStore.getById(onboarding.companyId);
        const { subject, html } = buildWelcomeEmployeeEmail({
          employeeName: newEmployee.name,
          employeeId: newEmployee.employeeId,
          designation: newEmployee.designation,
          department: newEmployee.department,
          joiningDate: newEmployee.joiningDate,
          companyName: company?.name ?? "the company",
        });
        sendEmail({ to: newEmployee.email, toName: newEmployee.name, subject, html }).catch(() => {});
      }
    }

    return ok({ message: `Status updated to ${newStatus}`, employee });
  } catch (error) {
    return badRequest((error as Error).message);
  }
}
