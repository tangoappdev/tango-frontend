import sgMail from '@sendgrid/mail';

const apiKey = process.env.SENDGRID_API_KEY || '';
const fromEmail =
  process.env.SENDGRID_FROM_EMAIL ||
  process.env.SENDGRID_FROM ||
  '';
const verificationTemplateId = process.env.SENDGRID_VERIFICATION_TEMPLATE_ID || '';

let initialized = false;
function ensureClient() {
  if (initialized || !apiKey) return;
  sgMail.setApiKey(apiKey);
  initialized = true;
}

export async function sendEmail({ to, subject, html, text }) {
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }
  if (!fromEmail) {
    throw new Error('SENDGRID_FROM is not configured');
  }

  ensureClient();

  const msg = {
    to,
    from: fromEmail,
    subject,
    text: text || '',
    html: html || text || '',
  };

  return sgMail.send(msg);
}

export async function sendVerificationTemplateEmail({ to, dynamicTemplateData }) {
  if (!verificationTemplateId) {
    throw new Error('SENDGRID_VERIFICATION_TEMPLATE_ID is not configured');
  }
  if (!apiKey) {
    throw new Error('SENDGRID_API_KEY is not configured');
  }
  if (!fromEmail) {
    throw new Error('SENDGRID_FROM is not configured');
  }

  ensureClient();

  const msg = {
    to,
    from: fromEmail,
    templateId: verificationTemplateId,
    dynamicTemplateData,
  };

  return sgMail.send(msg);
}
