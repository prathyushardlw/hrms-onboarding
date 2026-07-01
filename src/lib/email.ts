// ============================================================
// Email Service — powered by Kaka (services.kaka.dev)
// Configure: KAKA_EMAIL_SERVICE_KEY, KAKA_EMAIL_SERVICE_API_URL, LABSQUIRE_FROM_EMAIL
// ============================================================

interface SendEmailOptions {
  to: string;
  toName?: string;
  replyTo?: string;
  subject: string;
  html: string;
  attachments?: { content: string; name: string }[]; // base64 — reserved for future Kaka support
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const apiKey = process.env.KAKA_EMAIL_SERVICE_KEY;
  const apiUrl = process.env.KAKA_EMAIL_SERVICE_API_URL ?? "https://services.kaka.dev/1.0";
  const fromEmail = process.env.LABSQUIRE_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    console.log("========== EMAIL (Kaka not configured) ==========");
    console.log(`To:      ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log("=================================================");
    return false;
  }

  const body = {
    message: {
      body: {
        html: {
          charset: "UTF-8",
          data: options.html,
        },
      },
      subject: {
        charset: "UTF-8",
        data: options.subject,
      },
    },
    toAddresses: [options.to],
    fromEmail,
  };

  const res = await fetch(`${apiUrl}/notifications/sendEmail`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error("Kaka email error:", res.status, err);
    return false;
  }
  return true;
}

// ── Shared layout helpers ────────────────────────────────────

function emailWrapper(content: string, companyName: string, headerTitle: string, headerSubtitle: string, accent = "#08bf36"): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;background-color:#f0f4f8;line-height:1.6;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f0f4f8;padding:40px 20px;"><tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.12);overflow:hidden;">
<tr><td style="background-color:#0e382b;padding:45px 40px;text-align:center;border-bottom:4px solid ${accent};">
  <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;">${headerTitle}</h1>
  <p style="margin:12px 0 0;color:#e2e8f0;font-size:15px;">${headerSubtitle}</p>
</td></tr>
<tr><td style="padding:45px 40px;">${content}</td></tr>
<tr><td style="background:#f9fafb;padding:28px 40px;border-top:2px solid #e5e7eb;">
  <p style="margin:0 0 4px;color:#111827;font-size:14px;font-weight:700;">Best regards,</p>
  <p style="margin:0;color:#6b7280;font-size:14px;">${companyName} HR Team</p>
</td></tr>
</table>
<p style="margin:16px 0 0;color:#9ca3af;font-size:12px;text-align:center;">This is an automated message. Please do not reply directly to this email.</p>
</td></tr></table></body></html>`;
}

function detailCard(rows: [string, string][]): string {
  const r = rows.map(([l, v]) => `<tr><td style="padding:12px 0;border-bottom:1px solid #bfdbfe;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td width="38%" style="color:#1e40af;font-size:14px;font-weight:600;padding-right:10px;">${l}</td>
      <td style="color:#111827;font-size:14px;font-weight:700;">${v}</td>
    </tr></table></td></tr>`).join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#f0f9ff,#e0f2fe);border-radius:12px;padding:25px;margin-bottom:28px;border:2px solid #3b82f6;">
    <tr><td><table width="100%" cellpadding="0" cellspacing="0">${r}</table></td></tr></table>`;
}

function ctaButton(label: string, url: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0;"><tr><td align="center">
    <table cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="background-color:#0e382b;border-radius:8px;box-shadow:0 4px 14px rgba(14,56,43,.4);">
        <a href="${url}" style="display:block;color:#fff;text-decoration:none;padding:16px 50px;font-size:16px;font-weight:700;">${label}</a>
      </td></tr></table></td></tr></table>`;
}

function noteBox(text: string, bg = "#fef3c7", border = "#f59e0b", color = "#92400e"): string {
  return `<div style="background:${bg};border-left:4px solid ${border};padding:14px 16px;margin:20px 0;border-radius:6px;">
    <p style="margin:0;color:${color};font-size:14px;line-height:1.6;">${text}</p></div>`;
}

// ── 1. Onboarding Invite ─────────────────────────────────────
export function buildOnboardingEmail(candidateName: string, onboardingLink: string, companyName: string) {
  const content = `
    <p style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700;">Good Morning ${candidateName},</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
      Congratulations and welcome aboard! We're excited to have you join the <strong>${companyName}</strong> team.
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:15px;">Please review and complete your onboarding documents at your earliest convenience.</p>
    ${noteBox("Please also arrange to send: driver's license, social security card, professional photo (white background), void check, and any certifications you hold.")}
    ${ctaButton("Complete Onboarding Documents", onboardingLink)}
    <p style="margin:0;color:#6b7280;font-size:12px;">If the button doesn't work: <a href="${onboardingLink}" style="color:#0e382b;">${onboardingLink}</a></p>`;
  return {
    subject: `Welcome to ${companyName} — Complete Your Onboarding Documents`,
    html: emailWrapper(content, companyName, "Welcome Aboard! 🎉", `Complete your onboarding with ${companyName}`),
  };
}

export function buildReminderEmail(candidateName: string, onboardingLink: string, companyName: string) {
  const content = `
    <p style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700;">Hi ${candidateName},</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
      This is a friendly reminder that your onboarding documents for <strong>${companyName}</strong> are still pending completion.
    </p>
    <p style="margin:0 0 16px;color:#374151;font-size:15px;">Please click the button below to complete your documents at your earliest convenience.</p>
    ${ctaButton("Complete Onboarding Documents", onboardingLink)}
    <p style="margin:0;color:#6b7280;font-size:12px;">If the button doesn't work: <a href="${onboardingLink}" style="color:#0e382b;">${onboardingLink}</a></p>`;
  return {
    subject: `Reminder: Complete Your Onboarding Documents — ${companyName}`,
    html: emailWrapper(content, companyName, "Action Required", `Please complete your onboarding with ${companyName}`, "#f59e0b"),
  };
}

// ── 2. Correction Request ────────────────────────────────────
export function buildCorrectionEmail(candidateName: string, documentNames: string[], correctionNote: string, onboardingLink: string, companyName: string) {
  const docList = documentNames.map((n) => `<li style="margin:4px 0;color:#374151;">${n}</li>`).join("");
  const subjectDocs = documentNames.length === 1 ? documentNames[0] : `${documentNames.length} documents`;
  const content = `
    <p style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700;">Dear ${candidateName},</p>
    <p style="margin:0 0 20px;color:#374151;font-size:15px;line-height:1.7;">
      The HR team at <strong>${companyName}</strong> has reviewed your submission and requested corrections:
    </p>
    <ul style="margin:0 0 20px;padding-left:20px;">${docList}</ul>
    ${noteBox(`<strong>HR Remarks:</strong><br>${correctionNote}`)}
    <p style="margin:16px 0;color:#374151;font-size:15px;">Please use the link below to review and resubmit:</p>
    ${ctaButton("Review & Resubmit Documents", onboardingLink)}`;
  return {
    subject: `Action Required: Correction Needed — ${subjectDocs}`,
    html: emailWrapper(content, companyName, "Correction Requested", "Please review and resubmit your documents", "#f59e0b"),
  };
}

// ── 3. Interview Invitation ──────────────────────────────────
export function buildInterviewInvitationEmail(opts: {
  candidateName: string; jobTitle: string; roundName: string; interviewerName: string;
  scheduledAt: string; companyName: string; meetingType?: string; meetingLink?: string;
}) {
  const MEETING_LABELS: Record<string, string> = {
    google_meet: "Google Meet", zoom: "Zoom", teams: "Microsoft Teams", in_person: "In-person",
  };
  const dt = new Date(opts.scheduledAt);
  const dateStr = dt.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const timeStr = dt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const modeLabel = opts.meetingType ? MEETING_LABELS[opts.meetingType] ?? opts.meetingType : opts.meetingLink ? "Virtual" : "In-person";
  const rows: [string, string][] = [
    ["Position", opts.jobTitle], ["Round", opts.roundName],
    ["Interviewer", opts.interviewerName], ["Date", dateStr], ["Time", timeStr],
    ["Mode", modeLabel],
  ];
  const content = `
    <p style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700;">Dear ${opts.candidateName},</p>
    <p style="margin:0 0 28px;color:#374151;font-size:15px;line-height:1.7;">
      We are pleased to inform you that you have been shortlisted for the next stage of our selection process at <strong>${opts.companyName}</strong>.
    </p>
    ${detailCard(rows)}
    ${opts.meetingLink ? ctaButton("Join Interview Meeting", opts.meetingLink) : ""}
    <p style="margin:0;color:#374151;font-size:14px;">Please be available at the scheduled time. Contact us if you need to reschedule.</p>`;
  return {
    subject: `Interview Invitation — ${opts.roundName} at ${opts.companyName}`,
    html: emailWrapper(content, opts.companyName, "Interview Invitation", "You've been selected for the next stage"),
  };
}

// ── 4. Offer Letter ──────────────────────────────────────────
export function buildOfferEmail(opts: {
  candidateName: string; designation: string; department: string;
  ctc: string; joiningDate: string; companyName: string; signUrl?: string;
}) {
  const joiningStr = new Date(opts.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const rows: [string, string][] = [
    ["Designation", opts.designation], ["Department", opts.department],
    ["CTC", opts.ctc], ["Date of Joining", joiningStr],
  ];
  const signButton = opts.signUrl
    ? `<div style="text-align:center;margin:28px 0;">
        <a href="${opts.signUrl}" style="display:inline-block;background:#15803d;color:#fff;font-weight:700;font-size:15px;padding:14px 36px;border-radius:8px;text-decoration:none;">
          ✍️ Sign &amp; Accept Offer
        </a>
        <p style="margin:10px 0 0;font-size:12px;color:#6b7280;">Or copy this link: <a href="${opts.signUrl}" style="color:#15803d;">${opts.signUrl}</a></p>
      </div>`
    : "";
  const content = `
    <p style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700;">Dear ${opts.candidateName},</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
      We are delighted to extend this offer of employment at <strong>${opts.companyName}</strong>. Please find your offer letter attached as a PDF.
    </p>
    ${detailCard(rows)}
    ${signButton}
    ${noteBox("Please review the terms and sign your offer letter using the button above.", "#f0fdf4", "#22c55e", "#166534")}`;
  return {
    subject: `Offer Letter — ${opts.designation} at ${opts.companyName}`,
    html: emailWrapper(content, opts.companyName, "Congratulations! 🎉", `Offer from ${opts.companyName}`, "#22c55e"),
  };
}

// ── 5. Welcome Employee ──────────────────────────────────────
export function buildWelcomeEmployeeEmail(opts: {
  employeeName: string; employeeId: string; designation: string;
  department: string; joiningDate: string; companyName: string;
}) {
  const joiningStr = new Date(opts.joiningDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const rows: [string, string][] = [
    ["Employee ID", opts.employeeId], ["Designation", opts.designation],
    ["Department", opts.department], ["Date of Joining", joiningStr],
  ];
  const content = `
    <p style="margin:0 0 8px;color:#111827;font-size:18px;font-weight:700;">Welcome, ${opts.employeeName}! 🎉</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.7;">
      Your onboarding is complete. You are officially a member of the <strong>${opts.companyName}</strong> family!
    </p>
    ${detailCard(rows)}
    ${noteBox("Your Employee ID is your unique identifier — keep it handy for all HR matters.", "#f0fdf4", "#22c55e", "#166534")}`;
  return {
    subject: `Welcome to ${opts.companyName} — You're all set, ${opts.employeeName}!`,
    html: emailWrapper(content, opts.companyName, `Welcome to ${opts.companyName}!`, "Your onboarding is complete"),
  };
}
