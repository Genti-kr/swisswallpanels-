interface EmailUser {
  firstName: string;
  lastName: string;
  email: string;
}

import { getAllowedOrigin } from './urls';

function frontendUrl(): string {
  return getAllowedOrigin();
}

export function isEmailConfigured(): boolean {
  const apiKey = process.env.POSTMARK_API_KEY;
  return !!(
    apiKey &&
    !apiKey.includes('your-postmark') &&
    !apiKey.includes('placeholder')
  );
}

export function buildVerifyUrl(token: string, locale: string): string {
  return `${frontendUrl()}/${locale}/verify-email?token=${token}`;
}

async function sendEmail({
  to,
  subject,
  htmlBody,
}: {
  to: string;
  subject: string;
  htmlBody: string;
}): Promise<boolean> {
  const apiKey = process.env.POSTMARK_API_KEY;
  const from = process.env.POSTMARK_FROM || 'noreply@swisswallpanels.ch';

  if (!isEmailConfigured()) {
    console.log('\n--- DEVELOPMENT EMAIL SENT ---');
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    const linkMatch = htmlBody.match(new RegExp('href="([^"]+)"'));
    if (linkMatch) {
      console.log(`Link:    ${linkMatch[1]}`);
    }
    console.log(htmlBody.substring(0, 500));
    console.log('------------------------------\n');
    return true;
  }

  try {
    const res = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Postmark-Server-Token': apiKey || '',
      },
      body: JSON.stringify({
        From: from,
        To: to,
        Subject: subject,
        HtmlBody: htmlBody,
        MessageStream: 'outbound',
      }),
    });
    return res.ok;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
}

export const authEmailService = {
  async sendEmailVerification(user: EmailUser, token: string, locale: string) {
    const verifyUrl = buildVerifyUrl(token, locale);
    const isSq = locale.toLowerCase() === 'sq';
    const subject = isSq ? 'Verifikoni email-in tuaj' : 'Verify your email';
    const heading = isSq ? 'Verifikoni llogarinë tuaj' : 'Verify your account';
    const body = isSq
      ? 'Klikoni linkun më poshtë për të verifikuar email-in tuaj. Linku skadon pas 24 orësh.'
      : 'Click the link below to verify your email. This link expires in 24 hours.';

    await sendEmail({
      to: user.email,
      subject,
      htmlBody: `
        <div style="font-family: sans-serif; padding: 20px; color: #1a1a1a;">
          <h2>${heading}</h2>
          <p>Hello ${user.firstName} ${user.lastName},</p>
          <p>${body}</p>
          <p><a href="${verifyUrl}" style="background: #1a1a1a; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Verify Email</a></p>
        </div>
      `,
    });
  },

  async sendPasswordReset(user: EmailUser, token: string, locale: string) {
    const resetUrl = `${frontendUrl()}/${locale}/reset-password?token=${token}`;
    const isSq = locale.toLowerCase() === 'sq';
    const subject = isSq ? 'Rivendos fjalëkalimin' : 'Reset your password';
    const body = isSq
      ? 'Klikoni linkun më poshtë për të rivendosur fjalëkalimin. Linku skadon pas 1 ore.'
      : 'Click the link below to reset your password. This link expires in 1 hour.';

    await sendEmail({
      to: user.email,
      subject,
      htmlBody: `
        <div style="font-family: sans-serif; padding: 20px; color: #1a1a1a;">
          <h2>${subject}</h2>
          <p>Hello ${user.firstName} ${user.lastName},</p>
          <p>${body}</p>
          <p><a href="${resetUrl}" style="background: #1a1a1a; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Reset Password</a></p>
        </div>
      `,
    });
  },

  async sendAccountLocked(user: EmailUser, unlockToken: string, locale: string) {
    const unlockUrl = `${frontendUrl()}/${locale}/unlock-account?token=${unlockToken}`;
    const isSq = locale.toLowerCase() === 'sq';
    const subject = isSq ? 'Llogaria u bllokua' : 'Account locked';
    const body = isSq
      ? 'Për shkak të përpjekjeve të shumta të dështuara, llogaria juaj është bllokuar. Klikoni linkun për ta zhbllokuar.'
      : 'Due to multiple failed login attempts, your account has been locked. Click the link to unlock it.';

    await sendEmail({
      to: user.email,
      subject,
      htmlBody: `
        <div style="font-family: sans-serif; padding: 20px; color: #1a1a1a;">
          <h2>${subject}</h2>
          <p>Hello ${user.firstName} ${user.lastName},</p>
          <p>${body}</p>
          <p><a href="${unlockUrl}" style="background: #1a1a1a; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 4px;">Unlock Account</a></p>
        </div>
      `,
    });
  },
};
