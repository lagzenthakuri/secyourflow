import nodemailer, { type Transporter } from "nodemailer";

/**
 * Outbound email.
 *
 * SMTP_* and SENDGRID_* have been in the environment template since the start,
 * but no code ever read them — so invitations were created and never delivered,
 * and the recipient had no way to learn their link existed.
 *
 * Mail is optional: with no SMTP host configured this reports "not configured"
 * rather than throwing, so a deployment that does not want outbound mail (an
 * air-gapped appliance, for instance) keeps working.
 */

export interface MailMessage {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
}

export type MailResult =
  | { sent: true; messageId: string }
  | { sent: false; reason: string };

let transporter: Transporter | null = null;
let transporterKey = "";

function currentConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER?.trim();
  // SendGrid's SMTP relay uses the API key as the password with user "apikey".
  const pass = (process.env.SMTP_PASSWORD ?? process.env.SENDGRID_API_KEY)?.trim();
  const from = process.env.SMTP_FROM?.trim();
  return { host, port, user, pass, from };
}

export function isMailConfigured(): boolean {
  const { host, from } = currentConfig();
  return Boolean(host && from);
}

function getTransporter(): Transporter | null {
  const { host, port, user, pass } = currentConfig();
  if (!host) return null;

  const key = `${host}:${port}:${user ?? ""}`;
  if (transporter && transporterKey === key) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    // 465 is implicit TLS; 587 upgrades via STARTTLS.
    secure: port === 465,
    auth: user && pass ? { user, pass } : undefined,
    pool: true,
    maxConnections: 3,
  });
  transporterKey = key;

  return transporter;
}

/** Sends a message. Never throws — delivery failure must not fail the request. */
export async function sendMail(message: MailMessage): Promise<MailResult> {
  const { from } = currentConfig();
  const transport = getTransporter();

  if (!transport || !from) {
    return { sent: false, reason: "Email is not configured (set SMTP_HOST and SMTP_FROM)" };
  }

  try {
    const info = await transport.sendMail({
      from,
      to: Array.isArray(message.to) ? message.to.join(", ") : message.to,
      subject: message.subject,
      text: message.text,
      html: message.html,
    });

    return { sent: true, messageId: info.messageId };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error("[mail] send failed:", reason);
    return { sent: false, reason };
  }
}

function appBaseUrl(): string {
  return (
    process.env.APP_BASE_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  );
}

export function buildInvitationEmail(params: {
  organizationName: string;
  inviterName?: string | null;
  token: string;
  role: string;
}): Pick<MailMessage, "subject" | "text" | "html"> {
  const link = `${appBaseUrl()}/auth/accept-invite?token=${encodeURIComponent(params.token)}`;
  const inviter = params.inviterName ? `${params.inviterName} has` : "You have been";

  return {
    subject: `Invitation to join ${params.organizationName} on SecYourFlow`,
    text:
      `${inviter} invited you to join ${params.organizationName} on SecYourFlow as ${params.role}.\n\n` +
      `Accept the invitation:\n${link}\n\n` +
      `If you were not expecting this, you can ignore this message.`,
    html:
      `<p>${inviter} invited you to join <strong>${params.organizationName}</strong> on SecYourFlow as ${params.role}.</p>` +
      `<p><a href="${link}">Accept the invitation</a></p>` +
      `<p style="color:#666;font-size:12px">If you were not expecting this, you can ignore this message.</p>`,
  };
}
