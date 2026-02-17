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

type MailApiConfig = {
  provider: "sendgrid";
  apiKey: string;
  from: string;
};

function getMailApiConfig(): MailApiConfig | null {
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  const smtpFrom = process.env.SMTP_FROM?.trim();

  if (apiKey && smtpFrom) {
    return { provider: "sendgrid", apiKey, from: smtpFrom };
  }

  return null;
}

export async function sendMail(input: SendMailInput): Promise<SendMailResult> {
  const config = getMailApiConfig();
  if (!config) {
    const hasLegacySmtpCredentials = Boolean(process.env.SMTP_HOST && process.env.SMTP_PORT && process.env.SMTP_USER);
    const hasLegacySendgridCredentials = Boolean(process.env.SENDGRID_USERNAME && process.env.SENDGRID_PASSWORD);

    if (hasLegacySmtpCredentials || hasLegacySendgridCredentials) {
      return {
        sent: false,
        reason: "Mail credentials exist, but this build requires SENDGRID_API_KEY + SMTP_FROM for delivery",
      };
    }

    return { sent: false, reason: "Mail is not configured (missing SENDGRID_API_KEY and SMTP_FROM)" };
  }

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
    throw new Error(`SendGrid error (${response.status}): ${responseText.slice(0, 250)}`);
  }

  return { sent: true };
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
