import { NextRequest, NextResponse } from 'next/server';
import { verifyCronSecret } from '@/lib/vapi/security';
import {
  schedulePreArrivalCalls,
  scheduleMidStayCalls,
  schedulePreCheckoutCalls,
  schedulePostStayCalls,
  processScheduledCalls,
  processWakeUpCalls,
  syncFromPMS,
} from '@/lib/services/proactive';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes

// Cron endpoint to process proactive calls
// Configure in vercel.json - see vercel.json for cron schedule configuration
export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel cron jobs include this header)
  const authHeader = request.headers.get('authorization');
  const cronSecret = authHeader?.replace('Bearer ', '');

  if (!verifyCronSecret(cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') || 'process';

  console.log(`Cron job started: ${type}`, { timestamp: new Date().toISOString() });

  try {
    let result: Record<string, unknown> = {};

    switch (type) {
      case 'schedule':
        // Schedule all types of proactive calls
        const preArrival = await schedulePreArrivalCalls();
        const midStay = await scheduleMidStayCalls();
        const preCheckout = await schedulePreCheckoutCalls();
        const postStay = await schedulePostStayCalls();

        result = {
          scheduled: {
            preArrival,
            midStay,
            preCheckout,
            postStay,
            total: preArrival + midStay + preCheckout + postStay,
          },
        };
        break;

      case 'process':
        // Process scheduled calls that are ready
        const processed = await processScheduledCalls();
        result = { processed };
        break;

      case 'wakeup':
        // Process wake-up calls (runs every minute)
        const wakeUps = await processWakeUpCalls();
        result = { wakeUpCalls: wakeUps };
        break;

      case 'sync':
        // Sync with PMS
        const syncResult = await syncFromPMS();
        result = { pmsSync: syncResult };
        break;

      case 'pre-arrival':
        const preArrivalScheduled = await schedulePreArrivalCalls();
        const preArrivalProcessed = await processScheduledCalls('PRE_ARRIVAL');
        result = { scheduled: preArrivalScheduled, processed: preArrivalProcessed };
        break;

      case 'mid-stay':
        const midStayScheduled = await scheduleMidStayCalls();
        const midStayProcessed = await processScheduledCalls('MID_STAY');
        result = { scheduled: midStayScheduled, processed: midStayProcessed };
        break;

      case 'pre-checkout':
        const preCheckoutScheduled = await schedulePreCheckoutCalls();
        const preCheckoutProcessed = await processScheduledCalls('PRE_CHECKOUT');
        result = { scheduled: preCheckoutScheduled, processed: preCheckoutProcessed };
        break;

      case 'post-stay':
        const postStayScheduled = await schedulePostStayCalls();
        const postStayProcessed = await processScheduledCalls('POST_STAY');
        result = { scheduled: postStayScheduled, processed: postStayProcessed };
        break;

      default:
        return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    console.log(`Cron job completed: ${type}`, result);

    return NextResponse.json({
      success: true,
      type,
      ...result,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error(`Cron job error: ${type}`, error);

    return NextResponse.json(
      {
        success: false,
        type,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request);
}
