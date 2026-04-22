import nodemailer from "nodemailer";

const transporter =
  process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === "true",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
        tls: {
          ciphers: "SSLv3",
          rejectUnauthorized: false,
        },
      })
    : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  if (!transporter) {
    console.log("========== EMAIL (no SMTP configured) ==========");
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log("================================================");
    return false;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@hrms.local",
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
  return true;
}

export function buildOnboardingEmail(
  candidateName: string,
  onboardingLink: string,
  companyName: string
): { subject: string; html: string } {
  return {
    subject: `Welcome to ${companyName} – Onboarding Documents`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <p>Good Morning ${candidateName},</p>
        <br/>
        <p>Congratulations &amp; welcome aboard!</p>
        <p>Please see the attached paperwork. If you are in agreement with the terms, complete and sign the <a href="${onboardingLink}" style="color: #0e382b; font-weight: bold;">onboarding documents</a> as soon as possible.</p>
        <p style="color: #b45309; font-size: 13px;"><strong>NOTE:</strong> Send a copy of your driver's license, social security card, professional photo with a white background for ID badge, void check and certifications you held</p>
      </div>
    `,
  };
}

export function buildCorrectionEmail(
  candidateName: string,
  documentNames: string[],
  correctionNote: string,
  onboardingLink: string,
  companyName: string
): { subject: string; html: string } {
  const docList = documentNames.map((n) => `<li style="margin: 4px 0;">${n}</li>`).join("");
  const subjectDocs = documentNames.length === 1 ? documentNames[0] : `${documentNames.length} documents`;
  return {
    subject: `Action Required: Correction Needed — ${subjectDocs}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <p>Dear ${candidateName},</p>
        <p>The HR team at <strong>${companyName}</strong> has reviewed your submission and requested corrections on the following document${documentNames.length > 1 ? "s" : ""}:</p>
        <ul style="margin: 12px 0; padding-left: 20px;">${docList}</ul>
        <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px 16px; margin: 20px 0; border-radius: 4px;">
          <p style="margin: 0; font-weight: bold; color: #92400e;">Remarks:</p>
          <p style="margin: 4px 0 0; color: #92400e;">${correctionNote}</p>
        </div>
        <p>Please use the link below to review and resubmit:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${onboardingLink}" 
             style="background-color: #0e382b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Resend Forms
          </a>
        </div>

      </div>
    `,
  };
}
