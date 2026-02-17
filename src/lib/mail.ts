import nodemailer from "nodemailer";

type SendMailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

type SendMailResult = {
  sent: boolean;
  reason?: string;
};

type MailConfig =
  | { provider: "smtp"; host: string; port: number; user: string; pass: string; from: string }
  | { provider: "sendgrid-api"; apiKey: string; from: string };

function getMailConfig(): MailConfig | null {
  // Try SMTP first if host is provided
  const smtpHost = process.env.SMTP_HOST?.trim();
  const smtpPort = parseInt(process.env.SMTP_PORT || "587");
  const smtpUser = process.env.SMTP_USER?.trim() || process.env.SENDGRID_USERNAME?.trim();
  const smtpPass = process.env.SMTP_PASS?.trim() || process.env.SENDGRID_PASSWORD?.trim();
  const smtpFrom = process.env.SMTP_FROM?.trim();

  if (smtpHost && smtpUser && smtpPass && smtpFrom) {
    return {
      provider: "smtp",
      host: smtpHost,
      port: smtpPort,
      user: smtpUser,
      pass: smtpPass,
      from: smtpFrom,
    };
  }

  // Fallback to SendGrid API
  const sgApiKey = process.env.SENDGRID_API_KEY?.trim();
  if (sgApiKey && smtpFrom) {
    return {
      provider: "sendgrid-api",
      apiKey: sgApiKey,
      from: smtpFrom,
    };
  }

  // If we have some credentials but not enough for either, we can try to guess for SendGrid SMTP
  // since many users think SENDGRID_USERNAME/PASSWORD works for SMTP
  if (smtpUser && smtpPass && smtpFrom && !smtpHost) {
    // If no host but we have user/pass/from, and user looks like 'apikey' or we have SENDGRID_USERNAME
    const isSendGrid = smtpUser === 'apikey' || process.env.SENDGRID_USERNAME;
    if (isSendGrid) {
      return {
        provider: "smtp",
        host: "smtp.sendgrid.net",
        port: 587,
        user: smtpUser,
        pass: smtpPass,
        from: smtpFrom,
      };
    }
  }

  return null;
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const config = getMailConfig();

  if (!config) {
    return {
      sent: false,
      reason: "Mail is not configured. (Require SMTP_HOST/USER/PASS/FROM or SENDGRID_API_KEY/SMTP_FROM)"
    };
  }

  if (config.provider === "smtp") {
    try {
      const transporter = nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.port === 465,
        auth: {
          user: config.user,
          pass: config.pass,
        },
      });

      await transporter.sendMail({
        from: config.from,
        to: input.to,
        subject: input.subject,
        text: input.text,
        html: input.html,
      });

      return { sent: true };
    } catch (error) {
      console.error("SMTP Error:", error);
      return {
        sent: false,
        reason: error instanceof Error ? error.message : "Internal SMTP error"
      };
    }
  } else {
    // SendGrid API
    try {
      const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: input.to }] }],
          from: { email: config.from },
          subject: input.subject,
          content: [
            { type: "text/plain", value: input.text },
            ...(input.html ? [{ type: "text/html", value: input.html }] : []),
          ],
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        return {
          sent: false,
          reason: `SendGrid error (${response.status}): ${responseText.slice(0, 250)}`
        };
      }

      return { sent: true };
    } catch (error) {
      console.error("SendGrid API Error:", error);
      return {
        sent: false,
        reason: error instanceof Error ? error.message : "Internal SendGrid error"
      };
    }
  }
}

export async function sendOrganizationActivationEmail(params: {
  to: string;
  organizationName: string;
  productKey: string;
  activationLink: string;
}): Promise<SendMailResult> {
  const subject = `SecYourFlow access for ${params.organizationName}`;
  const text = [
    `Your SecYourFlow organization "${params.organizationName}" has been provisioned.`,
    "",
    `Product Key: ${params.productKey}`,
    `Activation Link: ${params.activationLink}`,
    "",
    "Use the activation link to set your password and activate your officer account.",
  ].join("\n");

  const html = [
    `<p>Your SecYourFlow organization <strong>${params.organizationName}</strong> has been provisioned.</p>`,
    `<p><strong>Product Key:</strong> ${params.productKey}</p>`,
    `<p><strong>Activation Link:</strong> <a href="${params.activationLink}">${params.activationLink}</a></p>`,
    "<p>Use the activation link to set your password and activate your officer account.</p>",
  ].join("");

  return sendMail({ to: params.to, subject, text, html });
}

export async function sendRoleInvitationEmail(params: {
  to: string;
  role: string;
  inviteLink: string;
}): Promise<SendMailResult> {
  const roleLabel = params.role.replaceAll("_", " ");
  const subject = `SecYourFlow invitation - ${roleLabel}`;
  const text = [
    `You have been invited to SecYourFlow as ${roleLabel}.`,
    "",
    `Set your password: ${params.inviteLink}`,
    "",
    "This invitation link expires in 7 days.",
  ].join("\n");

  const html = [
    `<p>You have been invited to SecYourFlow as <strong>${roleLabel}</strong>.</p>`,
    `<p><a href="${params.inviteLink}">Set your password</a></p>`,
    "<p>This invitation link expires in 7 days.</p>",
  ].join("");

  return sendMail({ to: params.to, subject, text, html });
}
