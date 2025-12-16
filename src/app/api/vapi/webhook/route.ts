import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { verifyWebhookSignature } from '@/lib/vapi/security';
import { VapiServerMessage, ToolCallResponse, SupportedLanguage, LANGUAGE_GREETINGS } from '@/lib/vapi/types';
import { CONCIERGE_ASSISTANT, BOOKING_SQUAD, HOTEL_CONFIG } from '@/lib/vapi/config';
import { queryKnowledgeBase, formatKnowledgeResults } from '@/lib/services/knowledge-base';
import {
  checkAvailability,
  calculatePrice,
  createReservation,
  processPayment,
  sendConfirmation,
  formatRoomOptions,
  ROOM_TYPES,
} from '@/lib/services/booking';
import {
  logGuestIssue,
  notifyStaff,
  getWeather,
} from '@/lib/services/proactive';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // Get raw body for signature verification
    const body = await request.text();

    // Verify webhook signature
    const signature = request.headers.get('x-vapi-signature');
    if (!verifyWebhookSignature(body, signature)) {
      console.warn('Invalid webhook signature');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the webhook payload
    const payload: VapiServerMessage = JSON.parse(body);
    const { message } = payload;

    console.log(`Webhook received: ${message.type}`, {
      callId: message.call?.id,
      timestamp: new Date().toISOString(),
    });

    // Handle different message types
    switch (message.type) {
      case 'assistant-request':
        return handleAssistantRequest(message);

      case 'tool-calls':
        return handleToolCalls(message);

      case 'status-update':
        return handleStatusUpdate(message);

      case 'end-of-call-report':
        return handleEndOfCallReport(message);

      case 'transcript':
        // Just acknowledge transcript updates
        return NextResponse.json({ received: true });

      case 'hang':
        return handleHang(message);

      default:
        console.log(`Unhandled message type: ${message.type}`);
        return NextResponse.json({ received: true });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    console.log(`Webhook processed in ${Date.now() - startTime}ms`);
  }
}

/**
 * Handle assistant-request: Return the appropriate assistant configuration
 */
async function handleAssistantRequest(message: VapiServerMessage['message']) {
  const call = message.call;
  const metadata = call?.artifact?.messages?.[0]?.content || '';

  // Determine which template to use based on call metadata or phone number
  // In production, this would be based on the called phone number or IVR selection
  const template = (call?.metadata as Record<string, string>)?.template || 'concierge';

  switch (template) {
    case 'booking-squad':
      return NextResponse.json({ squad: BOOKING_SQUAD });

    case 'proactive':
      // For proactive calls, the assistant is already configured in the outbound call
      return NextResponse.json({ received: true });

    case 'concierge':
    default:
      return NextResponse.json({ assistant: CONCIERGE_ASSISTANT });
  }
}

/**
 * Handle tool-calls: Execute requested tools and return results
 */
async function handleToolCalls(message: VapiServerMessage['message']) {
  const call = message.call;
  const toolCallList = message.toolCallList || [];
  const toolWithToolCallList = message.toolWithToolCallList || [];

  // Combine both formats (VAPI sends tools in different formats depending on version)
  const allToolCalls = [
    ...toolCallList,
    ...toolWithToolCallList.map(t => t.toolCall),
  ];

  const results: ToolCallResponse[] = [];

  for (const toolCall of allToolCalls) {
    const { id, function: fn } = toolCall;
    let args: Record<string, unknown> = {};

    try {
      args = typeof fn.arguments === 'string'
        ? JSON.parse(fn.arguments)
        : fn.arguments;
    } catch {
      args = {};
    }

    console.log(`Executing tool: ${fn.name}`, { args, callId: call?.id });

    try {
      let result: unknown;

      switch (fn.name) {
        // ============================================
        // TEMPLATE 1: CONCIERGE TOOLS
        // ============================================
        case 'queryKnowledgeBase':
          result = await handleQueryKnowledgeBase(args);
          break;

        case 'checkServiceAvailability':
          result = await handleCheckServiceAvailability(args);
          break;

        case 'createBooking':
          result = await handleCreateServiceBooking(args, call);
          break;

        case 'setLanguage':
          result = handleSetLanguage(args);
          break;

        case 'recordSentiment':
          result = await handleRecordSentiment(args, call);
          break;

        // ============================================
        // TEMPLATE 2: BOOKING SQUAD TOOLS
        // ============================================
        case 'checkAvailability':
          result = await handleCheckRoomAvailability(args);
          break;

        case 'getRoomOptions':
          result = await handleGetRoomOptions(args);
          break;

        case 'calculatePrice':
          result = await handleCalculatePrice(args);
          break;

        case 'createReservation':
          result = await handleCreateReservation(args, call);
          break;

        case 'processPayment':
          result = await handleProcessPayment(args);
          break;

        case 'sendConfirmation':
          result = await handleSendConfirmation(args);
          break;

        // ============================================
        // TEMPLATE 3: PROACTIVE TOOLS
        // ============================================
        case 'updateReservation':
          result = await handleUpdateReservation(args);
          break;

        case 'logIssue':
          result = await handleLogIssue(args, call);
          break;

        case 'recordFeedback':
          result = await handleRecordFeedback(args);
          break;

        case 'scheduleService':
          result = await handleScheduleService(args);
          break;

        case 'getWeather':
          result = await handleGetWeather();
          break;

        case 'notifyStaff':
          result = await handleNotifyStaff(args);
          break;

        default:
          result = { error: `Unknown tool: ${fn.name}` };
      }

      // Record tool call in database
      if (call?.id) {
        await recordToolCall(call.id, fn.name, args, result, true);
      }

      results.push({
        toolCallId: id,
        result: JSON.stringify(result),
      });
    } catch (error) {
      console.error(`Tool execution error for ${fn.name}:`, error);

      if (call?.id) {
        await recordToolCall(call.id, fn.name, args, { error: String(error) }, false);
      }

      results.push({
        toolCallId: id,
        result: JSON.stringify({
          error: 'Tool execution failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        }),
      });
    }
  }

  return NextResponse.json({ results });
}

/**
 * Handle status-update: Track call status changes
 */
async function handleStatusUpdate(message: VapiServerMessage['message']) {
  const call = message.call;
  const status = message.status;

  if (!call?.id) {
    return NextResponse.json({ received: true });
  }

  console.log(`Call status update: ${status}`, { callId: call.id });

  // Update or create call record
  const template = (call.metadata as Record<string, string>)?.template || 'CONCIERGE';

  await prisma.call.upsert({
    where: { vapiCallId: call.id },
    update: {
      status: status?.toUpperCase().replace(/-/g, '_') as never,
    },
    create: {
      vapiCallId: call.id,
      template: template.toUpperCase().replace(/-/g, '_') as never,
      direction: call.type === 'outboundPhoneCall' ? 'OUTBOUND' : 'INBOUND',
      phoneNumber: call.customer?.number,
      startTime: new Date(call.createdAt),
      status: status?.toUpperCase().replace(/-/g, '_') as never,
    },
  });

  return NextResponse.json({ received: true });
}

/**
 * Handle end-of-call-report: Record final call analytics
 */
async function handleEndOfCallReport(message: VapiServerMessage['message']) {
  const call = message.call;
  const artifact = message.artifact || call?.artifact;

  if (!call?.id) {
    return NextResponse.json({ received: true });
  }

  console.log('End of call report received', { callId: call.id });

  // Calculate call duration
  const startTime = new Date(call.createdAt);
  const endTime = new Date();
  const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

  // Extract tools used from messages
  const toolsUsed = new Set<string>();
  artifact?.messages?.forEach(msg => {
    if (msg.toolCalls) {
      msg.toolCalls.forEach(tc => toolsUsed.add(tc.function.name));
    }
  });

  // Update call record with final data
  await prisma.call.upsert({
    where: { vapiCallId: call.id },
    update: {
      endTime,
      duration,
      status: 'ENDED',
      transcript: artifact?.transcript,
      toolsUsed: Array.from(toolsUsed),
      resolutionStatus: call.endedReason === 'assistant-ended-call' ? 'RESOLVED' : 'PENDING',
    },
    create: {
      vapiCallId: call.id,
      template: 'CONCIERGE',
      direction: call.type === 'outboundPhoneCall' ? 'OUTBOUND' : 'INBOUND',
      phoneNumber: call.customer?.number,
      startTime,
      endTime,
      duration,
      status: 'ENDED',
      transcript: artifact?.transcript,
      toolsUsed: Array.from(toolsUsed),
    },
  });

  return NextResponse.json({ received: true });
}

/**
 * Handle hang: Call ended
 */
async function handleHang(message: VapiServerMessage['message']) {
  const call = message.call;

  if (call?.id) {
    await prisma.call.update({
      where: { vapiCallId: call.id },
      data: {
        status: 'ENDED',
        endTime: new Date(),
      },
    }).catch(() => {
      // Call record might not exist yet
    });
  }

  return NextResponse.json({ received: true });
}

// ============================================
// TOOL HANDLERS
// ============================================

async function handleQueryKnowledgeBase(args: Record<string, unknown>) {
  const results = await queryKnowledgeBase(args.query as string, {
    category: args.category as string,
    language: args.language as SupportedLanguage,
  });

  return {
    found: results.length > 0,
    information: formatKnowledgeResults(results),
    resultCount: results.length,
  };
}

async function handleCheckServiceAvailability(args: Record<string, unknown>) {
  // In a real implementation, this would check against a scheduling system
  const serviceType = args.serviceType as string;
  const date = args.date as string;
  const time = args.time as string;

  // Mock availability response
  const available = Math.random() > 0.2; // 80% chance available

  return {
    available,
    serviceType,
    date,
    time: time || 'flexible',
    alternativeSlots: available ? [] : [
      { time: '14:00', available: true },
      { time: '16:00', available: true },
    ],
    message: available
      ? `${args.serviceName || serviceType} is available on ${date}${time ? ` at ${time}` : ''}.`
      : `Sorry, that time is not available. We have openings at 2 PM and 4 PM.`,
  };
}

async function handleCreateServiceBooking(args: Record<string, unknown>, call: VapiServerMessage['message']['call']) {
  // Create service booking in database
  const serviceRequest = await prisma.serviceRequest.create({
    data: {
      requestType: (args.serviceType as string).toUpperCase() as never,
      description: `${args.serviceName}: ${args.specialRequests || 'No special requests'}`,
      scheduledTime: new Date(`${args.date}T${args.time}`),
      roomNumber: args.roomNumber as string,
    },
  });

  return {
    success: true,
    confirmationNumber: `SVC-${serviceRequest.id.slice(-8).toUpperCase()}`,
    service: args.serviceName,
    date: args.date,
    time: args.time,
    guestName: args.guestName,
    message: `Your ${args.serviceName} reservation has been confirmed for ${args.date} at ${args.time}. Confirmation number: SVC-${serviceRequest.id.slice(-8).toUpperCase()}`,
  };
}

function handleSetLanguage(args: Record<string, unknown>) {
  const languageCode = args.languageCode as SupportedLanguage;
  const greeting = LANGUAGE_GREETINGS[languageCode] || LANGUAGE_GREETINGS.en;

  return {
    success: true,
    language: languageCode,
    greeting,
    message: `Language set to ${languageCode}. ${greeting}`,
  };
}

async function handleRecordSentiment(args: Record<string, unknown>, call: VapiServerMessage['message']['call']) {
  const record = await prisma.sentimentRecord.create({
    data: {
      callId: call?.id,
      sentiment: args.sentiment as number,
      vipIndicator: args.isVip as boolean || false,
      notes: args.notes as string,
    },
  });

  // Notify staff for very negative sentiment
  if ((args.sentiment as number) < -0.5) {
    await notifyStaff({
      roomNumber: 'Unknown',
      urgency: 'urgent',
      message: `Negative guest sentiment detected: ${args.notes || 'No details provided'}`,
    });
  }

  return {
    recorded: true,
    id: record.id,
  };
}

async function handleCheckRoomAvailability(args: Record<string, unknown>) {
  const result = await checkAvailability(
    args.checkInDate as string,
    args.checkOutDate as string,
    args.numberOfGuests as number,
    args.numberOfRooms as number
  );

  return {
    ...result,
    message: result.available
      ? `Great news! We have availability for your dates. Let me show you our room options.`
      : `I'm sorry, we're fully booked for those dates. ${result.alternativeDates?.length ? 'Would you like to consider these alternative dates?' : ''}`,
  };
}

async function handleGetRoomOptions(args: Record<string, unknown>) {
  const { availableRooms } = await checkAvailability(
    args.checkInDate as string,
    args.checkOutDate as string,
    args.numberOfGuests as number
  );

  const formatted = formatRoomOptions(
    availableRooms,
    args.checkInDate as string,
    args.checkOutDate as string,
    args.preferences as string
  );

  return {
    rooms: availableRooms.map(r => ({
      code: r.code,
      name: r.name,
      price: r.basePrice,
      maxOccupancy: r.maxOccupancy,
    })),
    formatted,
  };
}

async function handleCalculatePrice(args: Record<string, unknown>) {
  const pricing = await calculatePrice(
    args.roomType as string,
    args.checkInDate as string,
    args.checkOutDate as string,
    args.numberOfRooms as number,
    args.packages as string[]
  );

  return {
    ...pricing,
    summary: `Room: $${pricing.baseAmount}, Resort Fee: $${pricing.fees}, Taxes: $${pricing.taxes}. Total: $${pricing.totalAmount}`,
  };
}

async function handleCreateReservation(args: Record<string, unknown>, call: VapiServerMessage['message']['call']) {
  const result = await createReservation({
    guestName: args.guestName as string,
    guestEmail: args.guestEmail as string,
    guestPhone: args.guestPhone as string || call?.customer?.number || '',
    roomTypeCode: args.roomType as string,
    checkInDate: args.checkInDate as string,
    checkOutDate: args.checkOutDate as string,
    numberOfGuests: args.numberOfGuests as number,
    numberOfRooms: args.numberOfRooms as number,
    packages: args.packages as string[],
    specialRequests: args.specialRequests as string,
    squadSessionId: call?.id,
  });

  return {
    ...result,
    message: result.success
      ? `Wonderful! Your reservation is confirmed. Confirmation number: ${result.confirmationCode}. Your total is $${result.totalAmount?.toFixed(2)}.`
      : `I apologize, there was an issue creating your reservation: ${result.error}`,
  };
}

async function handleProcessPayment(args: Record<string, unknown>) {
  const result = await processPayment(
    args.reservationId as string,
    args.amount as number,
    args.paymentMethod as 'card' | 'pay_at_hotel'
  );

  return {
    ...result,
    message: result.success
      ? 'Payment processed successfully!'
      : `Payment issue: ${result.error}. Would you like to try a different card?`,
  };
}

async function handleSendConfirmation(args: Record<string, unknown>) {
  const result = await sendConfirmation(
    args.reservationId as string,
    {
      sendEmail: args.sendEmail as boolean ?? true,
      sendSms: args.sendSms as boolean ?? true,
    }
  );

  const methods = [];
  if (result.emailSent) methods.push('email');
  if (result.smsSent) methods.push('SMS');

  return {
    ...result,
    message: methods.length > 0
      ? `Confirmation sent via ${methods.join(' and ')}.`
      : 'Confirmation will be sent shortly.',
  };
}

async function handleUpdateReservation(args: Record<string, unknown>) {
  const updates = args.updates as Record<string, unknown>;

  const data: Record<string, unknown> = {};
  if (updates.checkInDate) data.checkInDate = new Date(updates.checkInDate as string);
  if (updates.checkOutDate) data.checkOutDate = new Date(updates.checkOutDate as string);
  if (updates.numberOfGuests) data.numberOfGuests = updates.numberOfGuests as number;
  if (updates.specialRequests) data.specialRequests = updates.specialRequests as string;

  await prisma.reservation.update({
    where: { id: args.reservationId as string },
    data,
  });

  return {
    success: true,
    message: 'Your reservation has been updated.',
  };
}

async function handleLogIssue(args: Record<string, unknown>, call: VapiServerMessage['message']['call']) {
  const issueId = await logGuestIssue({
    reservationId: args.reservationId as string,
    roomNumber: args.roomNumber as string,
    category: args.category as string,
    severity: args.severity as string,
    description: args.description as string,
    callId: call?.id,
  });

  return {
    logged: true,
    issueId,
    message: `I've logged this issue and our team will address it right away.`,
  };
}

async function handleRecordFeedback(args: Record<string, unknown>) {
  // In a real implementation, this would update guest profile and trigger follow-ups
  console.log('Guest feedback recorded:', args);

  return {
    recorded: true,
    message: 'Thank you for your feedback!',
  };
}

async function handleScheduleService(args: Record<string, unknown>) {
  const request = await prisma.serviceRequest.create({
    data: {
      reservationId: args.reservationId as string,
      requestType: (args.serviceType as string).toUpperCase() as never,
      description: args.details as string,
      scheduledTime: args.scheduledTime ? new Date(args.scheduledTime as string) : null,
    },
  });

  return {
    scheduled: true,
    requestId: request.id,
    message: `${args.serviceType} service has been scheduled.`,
  };
}

async function handleGetWeather() {
  const weather = await getWeather();

  return {
    ...weather,
    message: `Currently ${weather.temperature}°F and ${weather.condition.toLowerCase()}. ${weather.forecast}`,
  };
}

async function handleNotifyStaff(args: Record<string, unknown>) {
  const sent = await notifyStaff({
    roomNumber: args.roomNumber as string,
    urgency: args.urgency as 'normal' | 'urgent' | 'emergency',
    message: args.message as string,
  });

  return {
    notified: sent,
    message: sent
      ? 'Staff has been notified and will assist shortly.'
      : 'I will make sure our team is informed.',
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function recordToolCall(
  vapiCallId: string,
  toolName: string,
  args: Record<string, unknown>,
  result: unknown,
  success: boolean
) {
  try {
    const call = await prisma.call.findUnique({
      where: { vapiCallId },
    });

    if (call) {
      await prisma.toolCall.create({
        data: {
          callId: call.id,
          toolName,
          arguments: JSON.parse(JSON.stringify(args)),
          result: JSON.parse(JSON.stringify(result)),
          success,
        },
      });

      // Update knowledge query count for concierge
      if (toolName === 'queryKnowledgeBase') {
        await prisma.call.update({
          where: { id: call.id },
          data: { knowledgeQueries: { increment: 1 } },
        });
      }
    }
  } catch (error) {
    console.error('Error recording tool call:', error);
  }
}
