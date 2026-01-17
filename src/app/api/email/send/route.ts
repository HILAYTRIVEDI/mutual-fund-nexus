import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail, sendSIPReminderEmail, sendSIPExecutedEmail } from '@/lib/mail';

/**
 * API Route: POST /api/email/send
 * 
 * Send test or sample emails for verification.
 * 
 * Body:
 * - to: Recipient email address
 * - type: 'test' | 'sip-reminder' | 'sip-executed'
 * - data: Optional data for SIP emails
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { to, type, data } = body;

    if (!to) {
      return NextResponse.json(
        { error: 'Missing required field: to' },
        { status: 400 }
      );
    }

    let result: { success: boolean; error?: string };

    switch (type) {
      case 'test':
        result = await sendTestEmail(to);
        break;

      case 'sip-reminder':
        result = await sendSIPReminderEmail({
          clientName: data?.clientName || 'Demo Client',
          clientEmail: to,
          schemeName: data?.schemeName || 'HDFC Flexi Cap Fund - Direct Growth',
          amount: data?.amount || 10000,
          executionDate: data?.executionDate || new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'),
          daysUntil: data?.daysUntil || 2,
          advisorName: data?.advisorName || 'Your Financial Advisor',
        });
        break;

      case 'sip-executed':
        result = await sendSIPExecutedEmail({
          clientName: data?.clientName || 'Demo Client',
          clientEmail: to,
          schemeName: data?.schemeName || 'HDFC Flexi Cap Fund - Direct Growth',
          amount: data?.amount || 10000,
          units: data?.units || 45.2341,
          nav: data?.nav || 221.15,
          executionDate: data?.executionDate || new Date().toLocaleDateString('en-IN'),
          advisorName: data?.advisorName || 'Your Financial Advisor',
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid email type. Use: test, sip-reminder, or sip-executed' },
          { status: 400 }
        );
    }

    if (result.success) {
      return NextResponse.json({
        message: `Email sent successfully to ${to}`,
        type,
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to send email', details: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Email send API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint for API info
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/email/send',
    description: 'POST to send test emails',
    body: {
      to: 'Recipient email (required)',
      type: 'test | sip-reminder | sip-executed',
      data: 'Optional data for SIP email templates',
    },
    example: {
      to: 'user@example.com',
      type: 'sip-reminder',
      data: {
        clientName: 'John Doe',
        schemeName: 'HDFC Flexi Cap Fund',
        amount: 10000,
        daysUntil: 2,
      },
    },
  });
}
