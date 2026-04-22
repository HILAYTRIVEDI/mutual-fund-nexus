import { NextRequest, NextResponse } from 'next/server';
import { sendTestEmail, sendSIPReminderEmail, sendSIPExecutedEmail } from '@/lib/mail';
import { createClient } from '@supabase/supabase-js';

/**
 * Verify the caller is either:
 * - A cron/admin script with CRON_SECRET Bearer token
 * - An authenticated admin user via Supabase session
 */
async function isAuthorized(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('Authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) return true;

  // Check for Supabase user session
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data: { user } } = await supabase.auth.getUser(token);
    if (user) return true;
  }
  return false;
}

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
  // Verify caller is authorized (CRON_SECRET or authenticated user)
  if (!(await isAuthorized(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

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
