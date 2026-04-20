import nodemailer from "nodemailer";

const transporter =
  process.env.SMTP_HOST
    ? nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      })
    : null;

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  if (!transporter) {
    console.log("========== EMAIL (console mode) ==========");
    console.log(`To: ${options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log(options.html);
    console.log("===========================================");
    return;
  }

  await transporter.sendMail({
    from: process.env.SMTP_FROM || "noreply@hrms.local",
    to: options.to,
    subject: options.subject,
    html: options.html,
  });
}

export function buildOnboardingEmail(
  candidateName: string,
  onboardingLink: string,
  companyName: string
): { subject: string; html: string } {
  return {
    subject: "Complete Your Onboarding Documents",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #1a1a1a;">Welcome to ${companyName}!</h2>
        <p>Dear ${candidateName},</p>
        <p>We're excited to have you join our team. Please complete and sign your onboarding documents using the secure link below.</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${onboardingLink}" 
             style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold;">
            Complete Onboarding Documents
          </a>
        </div>
        <p style="color: #666;">This link will expire in 7 days. If you have any questions, please contact HR.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="color: #999; font-size: 12px;">This is an automated message from the HR onboarding system.</p>
      </div>
    `,
  };
}
