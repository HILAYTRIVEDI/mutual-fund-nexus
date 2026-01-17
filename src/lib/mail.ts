import { Resend } from 'resend';

// Lazy initialization of Resend client to avoid build-time errors
let resend: Resend | null = null;

function getResendClient(): Resend {
  if (!resend) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set. Please add it to your .env.local file.');
    }
    resend = new Resend(apiKey);
  }
  return resend;
}

// Default from address (configured in environment)
const FROM_EMAIL = process.env.EMAIL_FROM || 'Mutual Fund Nexus <noreply@mutualfundnexus.com>';

interface SIPReminderData {
  clientName: string;
  clientEmail: string;
  schemeName: string;
  amount: number;
  executionDate: string;
  daysUntil: number;
  advisorName?: string;
}

interface SIPExecutedData {
  clientName: string;
  clientEmail: string;
  schemeName: string;
  amount: number;
  units: number;
  nav: number;
  executionDate: string;
  advisorName?: string;
}

/**
 * Format currency in Indian format
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate HTML email template for SIP reminder
 */
function generateSIPReminderHTML(data: SIPReminderData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SIP Reminder</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0e14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
          <tr>
            <td>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #48cae4 0%, #8B5CF6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                💰 Mutual Fund Nexus
              </h1>
            </td>
          </tr>
        </table>

        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">
          <tr>
            <td style="padding: 32px;">
              <!-- Alert Badge -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #48cae4 0%, #48cae4 100%); color: #0a0e14; font-size: 12px; font-weight: 600; padding: 6px 16px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                    ⏰ SIP Reminder
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
                Hi ${data.clientName},
              </h2>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #9CA3AF; line-height: 1.6;">
                Your SIP payment is coming up ${data.daysUntil === 1 ? 'tomorrow' : `in ${data.daysUntil} days`}. Please ensure sufficient balance in your bank account.
              </p>

              <!-- SIP Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: rgba(72, 202, 228, 0.1); border-radius: 12px; border: 1px solid rgba(72, 202, 228, 0.2); margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                          <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">Scheme Name</p>
                          <p style="margin: 4px 0 0 0; font-size: 16px; color: #ffffff; font-weight: 500;">${data.schemeName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 50%;">
                                <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">Amount</p>
                                <p style="margin: 4px 0 0 0; font-size: 20px; color: #48cae4; font-weight: 700;">${formatCurrency(data.amount)}</p>
                              </td>
                              <td style="width: 50%; text-align: right;">
                                <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">Execution Date</p>
                                <p style="margin: 4px 0 0 0; font-size: 16px; color: #ffffff; font-weight: 500;">${data.executionDate}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #48cae4 0%, #8B5CF6 100%); color: #ffffff; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 12px; text-decoration: none;">
                      View Portfolio
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 32px;">
          <tr>
            <td align="center">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #9CA3AF;">
                ${data.advisorName ? `Your Advisor: ${data.advisorName}` : 'Mutual Fund Nexus'}
              </p>
              <p style="margin: 0; font-size: 12px; color: #6B7280;">
                This is an automated reminder. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generate HTML email template for SIP executed confirmation
 */
function generateSIPExecutedHTML(data: SIPExecutedData): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SIP Executed Successfully</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0e14; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    <tr>
      <td>
        <!-- Header -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 32px;">
          <tr>
            <td>
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #48cae4 0%, #8B5CF6 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;">
                💰 Mutual Fund Nexus
              </h1>
            </td>
          </tr>
        </table>

        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%); border-radius: 16px; border: 1px solid rgba(255,255,255,0.1); overflow: hidden;">
          <tr>
            <td style="padding: 32px;">
              <!-- Success Badge -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                <tr>
                  <td style="background: linear-gradient(135deg, #10B981 0%, #10B981 100%); color: #ffffff; font-size: 12px; font-weight: 600; padding: 6px 16px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                    ✅ SIP Executed
                  </td>
                </tr>
              </table>

              <!-- Greeting -->
              <h2 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600; color: #ffffff;">
                Hi ${data.clientName},
              </h2>
              
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #9CA3AF; line-height: 1.6;">
                Your SIP has been successfully executed. Here are the transaction details:
              </p>

              <!-- Transaction Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: rgba(16, 185, 129, 0.1); border-radius: 12px; border: 1px solid rgba(16, 185, 129, 0.2); margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="padding-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                          <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">Scheme Name</p>
                          <p style="margin: 4px 0 0 0; font-size: 16px; color: #ffffff; font-weight: 500;">${data.schemeName}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 12px 0; border-bottom: 1px solid rgba(255,255,255,0.1);">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 50%;">
                                <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">Amount Invested</p>
                                <p style="margin: 4px 0 0 0; font-size: 20px; color: #10B981; font-weight: 700;">${formatCurrency(data.amount)}</p>
                              </td>
                              <td style="width: 50%; text-align: right;">
                                <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">Units Allotted</p>
                                <p style="margin: 4px 0 0 0; font-size: 16px; color: #ffffff; font-weight: 500;">${data.units.toFixed(4)}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 12px;">
                          <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                            <tr>
                              <td style="width: 50%;">
                                <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">NAV</p>
                                <p style="margin: 4px 0 0 0; font-size: 16px; color: #ffffff; font-weight: 500;">₹${data.nav.toFixed(4)}</p>
                              </td>
                              <td style="width: 50%; text-align: right;">
                                <p style="margin: 0; font-size: 12px; color: #9CA3AF; text-transform: uppercase; letter-spacing: 0.5px;">Date</p>
                                <p style="margin: 4px 0 0 0; font-size: 16px; color: #ffffff; font-weight: 500;">${data.executionDate}</p>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <a href="#" style="display: inline-block; background: linear-gradient(135deg, #48cae4 0%, #8B5CF6 100%); color: #ffffff; font-size: 14px; font-weight: 600; padding: 14px 32px; border-radius: 12px; text-decoration: none;">
                      View Transaction History
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 32px;">
          <tr>
            <td align="center">
              <p style="margin: 0 0 8px 0; font-size: 14px; color: #9CA3AF;">
                ${data.advisorName ? `Your Advisor: ${data.advisorName}` : 'Mutual Fund Nexus'}
              </p>
              <p style="margin: 0; font-size: 12px; color: #6B7280;">
                This is an automated notification. Please do not reply to this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send SIP reminder email
 */
export async function sendSIPReminderEmail(data: SIPReminderData): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: data.clientEmail,
      subject: `⏰ SIP Reminder: ${formatCurrency(data.amount)} due ${data.daysUntil === 1 ? 'tomorrow' : `in ${data.daysUntil} days`}`,
      html: generateSIPReminderHTML(data),
    });

    if (error) {
      console.error('Failed to send SIP reminder email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error sending SIP reminder email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

/**
 * Send SIP executed confirmation email
 */
export async function sendSIPExecutedEmail(data: SIPExecutedData): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to: data.clientEmail,
      subject: `✅ SIP Executed: ${formatCurrency(data.amount)} invested in ${data.schemeName}`,
      html: generateSIPExecutedHTML(data),
    });

    if (error) {
      console.error('Failed to send SIP executed email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error sending SIP executed email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

/**
 * Send test email to verify configuration
 */
export async function sendTestEmail(to: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await getResendClient().emails.send({
      from: FROM_EMAIL,
      to,
      subject: '🧪 Test Email from Mutual Fund Nexus',
      html: `
        <div style="font-family: sans-serif; padding: 20px; background: #0a0e14; color: #ffffff;">
          <h1 style="color: #48cae4;">Email Configuration Working! 🎉</h1>
          <p style="color: #9CA3AF;">Your email alerts are properly configured.</p>
          <p style="color: #6B7280; font-size: 12px;">Sent at: ${new Date().toISOString()}</p>
        </div>
      `,
    });

    if (error) {
      console.error('Failed to send test email:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Error sending test email:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Failed to send email' };
  }
}

export type { SIPReminderData, SIPExecutedData };
