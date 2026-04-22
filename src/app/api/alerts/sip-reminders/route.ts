import { NextRequest, NextResponse } from 'next/server';
import { sendSIPReminderEmail } from '@/lib/mail';
import { getServerSupabaseClient } from '@/lib/supabase-server';

/**
 * API Route: POST /api/alerts/sip-reminders
 * 
 * Checks for upcoming SIPs and sends reminder emails to clients.
 * This can be called manually or via a scheduled job (Supabase Edge Function, Vercel Cron, etc.)
 * 
 * Query params:
 * - daysAhead: Number of days ahead to check (default: 3)
 * - dryRun: If true, don't actually send emails (default: false)
 */
export async function POST(request: NextRequest) {
  // Verify CRON_SECRET
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const daysAhead = parseInt(searchParams.get('daysAhead') || '3', 10);
    const dryRun = searchParams.get('dryRun') === 'true';

    const supabase = getServerSupabaseClient();

    // Calculate date range
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    // Format dates for PostgreSQL
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    // Fetch upcoming SIPs with client and fund info
    const { data: sips, error: sipsError } = await supabase
      .from('sips')
      .select(`
        *,
        client:profiles(id, full_name, email, advisor_id),
        mutual_fund:mutual_funds(name, code)
      `)
      .eq('status', 'active')
      .gte('next_execution_date', todayStr)
      .lte('next_execution_date', futureDateStr);

    if (sipsError) {
      console.error('Error fetching SIPs:', sipsError);
      return NextResponse.json(
        { error: 'Failed to fetch SIPs', details: sipsError.message },
        { status: 500 }
      );
    }

    if (!sips || sips.length === 0) {
      return NextResponse.json({
        message: 'No upcoming SIPs found',
        sipsChecked: 0,
        emailsSent: 0,
      });
    }

    // Fetch advisor profiles for names
    const advisorIds = [...new Set(sips.map((s: any) => s.client?.advisor_id).filter(Boolean))];
    const { data: advisors } = await supabase
      .from('profiles')
      .select('id, full_name, email_sip_reminders')
      .in('id', advisorIds);

    const advisorMap = new Map(advisors?.map((a: any) => [a.id, a]) || []);

    // Process each SIP
    const results: { sipId: string; clientName: string; success: boolean; error?: string }[] = [];

    for (const sip of sips as any[]) {
      const client = sip.client;
      const mutualFund = sip.mutual_fund;

      // Skip if client has no email
      if (!client?.email) {
        results.push({
          sipId: sip.id,
          clientName: client?.full_name || 'Unknown',
          success: false,
          error: 'No email address',
        });
        continue;
      }

      // Check if advisor has email notifications enabled
      const advisor = advisorMap.get(client.advisor_id);
      if (advisor && advisor.email_sip_reminders === false) {
        results.push({
          sipId: sip.id,
          clientName: client.full_name,
          success: false,
          error: 'Email notifications disabled',
        });
        continue;
      }

      // Calculate days until execution
      const executionDate = new Date(sip.next_execution_date);
      const daysUntil = Math.ceil((executionDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Prepare email data
      const emailData = {
        clientName: client.full_name,
        clientEmail: client.email,
        schemeName: mutualFund?.name || 'Unknown Fund',
        amount: sip.amount,
        executionDate: executionDate.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
        daysUntil,
        advisorName: advisor?.full_name,
      };

      if (dryRun) {
        results.push({
          sipId: sip.id,
          clientName: client.full_name,
          success: true,
          error: 'Dry run - email not sent',
        });
        continue;
      }

      // Send email
      const emailResult = await sendSIPReminderEmail(emailData);
      
      results.push({
        sipId: sip.id,
        clientName: client.full_name,
        success: emailResult.success,
        error: emailResult.error,
      });

      // Create in-app notification for the advisor
      if (emailResult.success && client.advisor_id) {
        await supabase.from('notifications').insert({
          user_id: client.advisor_id,
          type: 'info',
          title: 'SIP Reminder Sent',
          message: `Reminder email sent to ${client.full_name} for ${mutualFund?.name || 'SIP'} (₹${sip.amount.toLocaleString()})`,
          read: false,
        } as any);
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      message: `Processed ${sips.length} SIPs`,
      sipsChecked: sips.length,
      emailsSent: successCount,
      emailsFailed: failureCount,
      dryRun,
      results,
    });
  } catch (error) {
    console.error('SIP reminder API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to check API status
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    endpoint: '/api/alerts/sip-reminders',
    description: 'POST to this endpoint to check and send SIP reminder emails',
    params: {
      daysAhead: 'Number of days ahead to check (default: 3)',
      dryRun: 'If true, simulate without sending emails',
    },
  });
}
