import prisma from '../db/prisma';
import axios from 'axios';
import { addDays, addHours, format, parseISO, startOfDay, subDays, isAfter, isBefore } from 'date-fns';
import { PROACTIVE_CALL_CONFIGS, PROACTIVE_TOOLS, HOTEL_CONFIG } from '../vapi/config';
import { VapiAssistantConfig, OutboundCallRequest, PMSReservation, PMSGuest } from '../vapi/types';

const VAPI_API_URL = 'https://api.vapi.ai';

/**
 * Make an outbound call using VAPI
 */
export async function makeOutboundCall(
  phoneNumber: string,
  assistantConfig: Partial<VapiAssistantConfig>,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; callId?: string; error?: string }> {
  const apiKey = process.env.VAPI_API_KEY;
  const phoneNumberId = process.env.VAPI_PHONE_NUMBER_ID;

  if (!apiKey || !phoneNumberId) {
    console.error('VAPI API key or phone number ID not configured');
    return { success: false, error: 'VAPI not configured' };
  }

  try {
    const request: OutboundCallRequest = {
      phoneNumberId,
      customer: {
        number: phoneNumber,
      },
      assistant: {
        name: assistantConfig.name || 'Proactive Service Agent',
        firstMessage: assistantConfig.firstMessage,
        model: {
          provider: assistantConfig.model?.provider || 'openai',
          model: assistantConfig.model?.model || 'gpt-4o-2024-11-20',
          temperature: assistantConfig.model?.temperature || 0.7,
          messages: assistantConfig.model?.messages || [],
        },
        voice: assistantConfig.voice || {
          provider: 'eleven-labs',
          voiceId: '21m00Tcm4TlvDq8ikWAM',
        },
        transcriber: {
          provider: 'deepgram',
          model: 'nova-2',
          language: 'en',
        },
        tools: PROACTIVE_TOOLS,
        server: {
          url: process.env.VAPI_SERVER_URL || '',
          secret: process.env.VAPI_WEBHOOK_SECRET,
        },
        silenceTimeoutSeconds: 20,
        maxDurationSeconds: assistantConfig.maxDurationSeconds || 300,
        metadata: {
          ...metadata,
          template: 'proactive-services',
        },
      },
    };

    const response = await axios.post(
      `${VAPI_API_URL}/call/phone`,
      request,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return {
      success: true,
      callId: response.data.id,
    };
  } catch (error) {
    console.error('Error making outbound call:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to initiate call',
    };
  }
}

/**
 * Schedule pre-arrival calls for guests checking in tomorrow
 */
export async function schedulePreArrivalCalls(): Promise<number> {
  const tomorrow = addDays(startOfDay(new Date()), 1);
  const dayAfterTomorrow = addDays(tomorrow, 1);

  // Find reservations checking in tomorrow that haven't been called
  const reservations = await prisma.reservation.findMany({
    where: {
      status: 'CONFIRMED',
      checkInDate: {
        gte: tomorrow,
        lt: dayAfterTomorrow,
      },
      proactiveCalls: {
        none: {
          callType: 'PRE_ARRIVAL',
        },
      },
    },
    include: {
      guest: true,
    },
  });

  let scheduledCount = 0;

  for (const reservation of reservations) {
    // Schedule call for 4 PM today (day before check-in)
    const scheduledTime = new Date();
    scheduledTime.setHours(16, 0, 0, 0);

    // If it's already past 4 PM, schedule for now + 1 hour
    if (isAfter(new Date(), scheduledTime)) {
      scheduledTime.setTime(addHours(new Date(), 1).getTime());
    }

    await prisma.proactiveCall.create({
      data: {
        reservationId: reservation.id,
        callType: 'PRE_ARRIVAL',
        scheduledTime,
        status: 'SCHEDULED',
      },
    });

    scheduledCount++;
  }

  return scheduledCount;
}

/**
 * Schedule mid-stay check-in calls for guests on day 2
 */
export async function scheduleMidStayCalls(): Promise<number> {
  const yesterday = subDays(startOfDay(new Date()), 1);
  const twoDaysAgo = subDays(yesterday, 1);

  // Find guests who checked in yesterday (now on day 2)
  const reservations = await prisma.reservation.findMany({
    where: {
      status: 'CHECKED_IN',
      checkInDate: {
        gte: twoDaysAgo,
        lt: yesterday,
      },
      proactiveCalls: {
        none: {
          callType: 'MID_STAY',
        },
      },
    },
    include: {
      guest: true,
    },
  });

  let scheduledCount = 0;

  for (const reservation of reservations) {
    // Schedule call for 2 PM
    const scheduledTime = new Date();
    scheduledTime.setHours(14, 0, 0, 0);

    if (isAfter(new Date(), scheduledTime)) {
      scheduledTime.setTime(addHours(new Date(), 1).getTime());
    }

    await prisma.proactiveCall.create({
      data: {
        reservationId: reservation.id,
        callType: 'MID_STAY',
        scheduledTime,
        status: 'SCHEDULED',
      },
    });

    scheduledCount++;
  }

  return scheduledCount;
}

/**
 * Schedule pre-checkout calls for guests checking out today
 */
export async function schedulePreCheckoutCalls(): Promise<number> {
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);

  const reservations = await prisma.reservation.findMany({
    where: {
      status: 'CHECKED_IN',
      checkOutDate: {
        gte: today,
        lt: tomorrow,
      },
      proactiveCalls: {
        none: {
          callType: 'PRE_CHECKOUT',
        },
      },
    },
    include: {
      guest: true,
    },
  });

  let scheduledCount = 0;

  for (const reservation of reservations) {
    // Schedule call for 8 AM on checkout day
    const scheduledTime = new Date();
    scheduledTime.setHours(8, 0, 0, 0);

    if (isAfter(new Date(), scheduledTime)) {
      // If it's past 8 AM, still schedule but mark as urgent
      scheduledTime.setTime(new Date().getTime());
    }

    await prisma.proactiveCall.create({
      data: {
        reservationId: reservation.id,
        callType: 'PRE_CHECKOUT',
        scheduledTime,
        status: 'SCHEDULED',
      },
    });

    scheduledCount++;
  }

  return scheduledCount;
}

/**
 * Schedule post-stay follow-up calls
 */
export async function schedulePostStayCalls(): Promise<number> {
  const twoDaysAgo = subDays(startOfDay(new Date()), 2);
  const threeDaysAgo = subDays(twoDaysAgo, 1);

  const reservations = await prisma.reservation.findMany({
    where: {
      status: 'CHECKED_OUT',
      checkOutDate: {
        gte: threeDaysAgo,
        lt: twoDaysAgo,
      },
      proactiveCalls: {
        none: {
          callType: 'POST_STAY',
        },
      },
    },
    include: {
      guest: true,
    },
  });

  let scheduledCount = 0;

  for (const reservation of reservations) {
    // Schedule call for 2 PM
    const scheduledTime = new Date();
    scheduledTime.setHours(14, 0, 0, 0);

    await prisma.proactiveCall.create({
      data: {
        reservationId: reservation.id,
        callType: 'POST_STAY',
        scheduledTime,
        status: 'SCHEDULED',
      },
    });

    scheduledCount++;
  }

  return scheduledCount;
}

/**
 * Process scheduled proactive calls
 */
export async function processScheduledCalls(callType?: string): Promise<number> {
  const now = new Date();

  const where = {
    status: 'SCHEDULED' as const,
    scheduledTime: { lte: now },
    attempts: { lt: 3 },
    ...(callType ? { callType: callType as never } : {}),
  };

  const scheduledCalls = await prisma.proactiveCall.findMany({
    where,
    include: {
      reservation: {
        include: {
          guest: true,
        },
      },
    },
    take: 10, // Process in batches
    orderBy: { scheduledTime: 'asc' },
  });

  let processedCount = 0;

  for (const call of scheduledCalls) {
    const { reservation } = call;
    const config = PROACTIVE_CALL_CONFIGS[
      call.callType.toLowerCase().replace('_', '') as keyof typeof PROACTIVE_CALL_CONFIGS
    ] || PROACTIVE_CALL_CONFIGS.midStay;

    // Build personalized first message
    let firstMessage = '';
    switch (call.callType) {
      case 'PRE_ARRIVAL':
        firstMessage = `Hello, this is ${HOTEL_CONFIG.name} calling. May I speak with ${reservation.guest.firstName}?`;
        break;
      case 'WAKE_UP':
        firstMessage = `Good morning! This is your wake-up call from ${HOTEL_CONFIG.name}.`;
        break;
      case 'MID_STAY':
        firstMessage = `Hello ${reservation.guest.firstName}, this is Guest Services from ${HOTEL_CONFIG.name}. I'm calling to check on your stay.`;
        break;
      case 'PRE_CHECKOUT':
        firstMessage = `Good morning ${reservation.guest.firstName}, this is the front desk at ${HOTEL_CONFIG.name}.`;
        break;
      case 'POST_STAY':
        firstMessage = `Hello ${reservation.guest.firstName}, this is ${HOTEL_CONFIG.name} calling.`;
        break;
    }

    // Update call to in-progress
    await prisma.proactiveCall.update({
      where: { id: call.id },
      data: {
        status: 'IN_PROGRESS',
        attempts: { increment: 1 },
        actualTime: now,
      },
    });

    // Make the call
    const result = await makeOutboundCall(
      reservation.guest.phone,
      {
        name: `${call.callType} Call`,
        firstMessage,
        model: {
          provider: 'openai',
          model: 'gpt-4o-2024-11-20',
          temperature: 0.7,
          messages: [{ role: 'system', content: config.systemPrompt }],
        },
        maxDurationSeconds: config.maxDuration,
      },
      {
        proactiveCallId: call.id,
        reservationId: reservation.id,
        callType: call.callType,
        guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
        roomNumber: reservation.roomNumber,
      }
    );

    if (result.success) {
      await prisma.proactiveCall.update({
        where: { id: call.id },
        data: {
          vapiCallId: result.callId,
        },
      });
      processedCount++;
    } else {
      // Mark as failed if max attempts reached
      const newAttempts = call.attempts + 1;
      await prisma.proactiveCall.update({
        where: { id: call.id },
        data: {
          status: newAttempts >= call.maxAttempts ? 'FAILED' : 'SCHEDULED',
          notes: result.error,
          scheduledTime: addHours(now, 1), // Retry in 1 hour
        },
      });
    }
  }

  return processedCount;
}

/**
 * Process wake-up call requests
 */
export async function processWakeUpCalls(): Promise<number> {
  const now = new Date();
  const fiveMinutesAgo = subDays(now, 5 / (24 * 60)); // 5 minutes ago

  const wakeUpRequests = await prisma.wakeUpRequest.findMany({
    where: {
      status: 'PENDING',
      requestedTime: {
        gte: fiveMinutesAgo,
        lte: now,
      },
    },
    take: 10,
  });

  let processedCount = 0;

  for (const request of wakeUpRequests) {
    // Find the reservation
    const reservation = await prisma.reservation.findFirst({
      where: {
        roomNumber: request.roomNumber,
        status: 'CHECKED_IN',
      },
      include: { guest: true },
    });

    if (!reservation) {
      await prisma.wakeUpRequest.update({
        where: { id: request.id },
        data: { status: 'FAILED' },
      });
      continue;
    }

    // Update to in-progress
    await prisma.wakeUpRequest.update({
      where: { id: request.id },
      data: { attempts: { increment: 1 } },
    });

    // Make the call
    const result = await makeOutboundCall(
      reservation.guest.phone,
      {
        name: 'Wake-Up Call',
        firstMessage: `Good morning! This is your ${HOTEL_CONFIG.name} wake-up call. The time is ${format(now, 'h:mm a')}.`,
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini',
          temperature: 0.5,
          messages: [{
            role: 'system',
            content: PROACTIVE_CALL_CONFIGS.wakeUp.systemPrompt,
          }],
        },
        maxDurationSeconds: 120,
      },
      {
        wakeUpRequestId: request.id,
        roomNumber: request.roomNumber,
        guestName: `${reservation.guest.firstName} ${reservation.guest.lastName}`,
      }
    );

    if (result.success) {
      await prisma.wakeUpRequest.update({
        where: { id: request.id },
        data: {
          status: 'COMPLETED',
          completedAt: now,
        },
      });
      processedCount++;
    } else if (request.attempts >= 2) {
      await prisma.wakeUpRequest.update({
        where: { id: request.id },
        data: { status: 'FAILED' },
      });
    }
  }

  return processedCount;
}

/**
 * Log a guest issue detected during a call
 */
export async function logGuestIssue(data: {
  reservationId?: string;
  roomNumber?: string;
  category: string;
  severity: string;
  description: string;
  callId?: string;
}): Promise<string> {
  const issue = await prisma.guestIssue.create({
    data: {
      reservationId: data.reservationId,
      roomNumber: data.roomNumber,
      category: data.category.toUpperCase() as never,
      severity: data.severity.toUpperCase() as never,
      description: data.description,
      detectedBy: 'ai',
      callId: data.callId,
    },
  });

  // Send Slack notification for high/critical issues
  if (['HIGH', 'CRITICAL'].includes(data.severity.toUpperCase())) {
    await notifyStaff({
      roomNumber: data.roomNumber || 'Unknown',
      urgency: data.severity.toLowerCase() === 'critical' ? 'emergency' : 'urgent',
      message: `${data.category}: ${data.description}`,
    });
  }

  return issue.id;
}

/**
 * Send notification to staff (via Slack webhook)
 */
export async function notifyStaff(data: {
  roomNumber: string;
  urgency: 'normal' | 'urgent' | 'emergency';
  message: string;
}): Promise<boolean> {
  const webhookUrl = process.env.SLACK_WEBHOOK_URL;

  if (!webhookUrl) {
    console.log('Staff notification (no Slack configured):', data);
    return false;
  }

  try {
    const emoji = {
      normal: '📋',
      urgent: '⚠️',
      emergency: '🚨',
    }[data.urgency];

    await axios.post(webhookUrl, {
      text: `${emoji} *${data.urgency.toUpperCase()}* - Room ${data.roomNumber}\n${data.message}`,
      channel: data.urgency === 'emergency' ? '#hotel-emergencies' : '#hotel-operations',
    });

    return true;
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return false;
  }
}

/**
 * Sync reservations from PMS (Property Management System)
 */
export async function syncFromPMS(): Promise<{ synced: number; errors: number }> {
  const pmsUrl = process.env.PMS_API_URL;
  const pmsKey = process.env.PMS_API_KEY;
  const hotelId = process.env.PMS_HOTEL_ID;

  if (!pmsUrl || !pmsKey) {
    console.log('PMS not configured, skipping sync');
    return { synced: 0, errors: 0 };
  }

  try {
    // Fetch recent reservations from PMS
    const response = await axios.get<{ reservations: PMSReservation[] }>(
      `${pmsUrl}/hotels/${hotelId}/reservations`,
      {
        headers: { 'Authorization': `Bearer ${pmsKey}` },
        params: {
          from: subDays(new Date(), 1).toISOString(),
          to: addDays(new Date(), 30).toISOString(),
        },
      }
    );

    let synced = 0;
    let errors = 0;

    for (const pmsRes of response.data.reservations) {
      try {
        // Find or create guest
        const guestResponse = await axios.get<{ guest: PMSGuest }>(
          `${pmsUrl}/guests/${pmsRes.guestId}`,
          { headers: { 'Authorization': `Bearer ${pmsKey}` } }
        );
        const pmsGuest = guestResponse.data.guest;

        let guest = await prisma.guest.findUnique({
          where: { externalId: pmsGuest.id },
        });

        if (!guest) {
          guest = await prisma.guest.create({
            data: {
              externalId: pmsGuest.id,
              firstName: pmsGuest.firstName,
              lastName: pmsGuest.lastName,
              email: pmsGuest.email,
              phone: pmsGuest.phone,
              preferredLanguage: pmsGuest.preferredLanguage || 'en',
              vipStatus: pmsGuest.vipStatus || false,
            },
          });
        }

        // Upsert reservation
        await prisma.reservation.upsert({
          where: { externalId: pmsRes.id },
          update: {
            roomNumber: pmsRes.roomNumber,
            roomType: pmsRes.roomType,
            checkInDate: parseISO(pmsRes.checkInDate),
            checkOutDate: parseISO(pmsRes.checkOutDate),
            status: pmsRes.status.toUpperCase().replace('-', '_') as never,
            numberOfGuests: pmsRes.numberOfGuests,
            specialRequests: pmsRes.specialRequests,
          },
          create: {
            externalId: pmsRes.id,
            guestId: guest.id,
            roomNumber: pmsRes.roomNumber,
            roomType: pmsRes.roomType,
            checkInDate: parseISO(pmsRes.checkInDate),
            checkOutDate: parseISO(pmsRes.checkOutDate),
            status: pmsRes.status.toUpperCase().replace('-', '_') as never,
            numberOfGuests: pmsRes.numberOfGuests,
            specialRequests: pmsRes.specialRequests,
          },
        });

        synced++;
      } catch (error) {
        console.error(`Error syncing reservation ${pmsRes.id}:`, error);
        errors++;
      }
    }

    return { synced, errors };
  } catch (error) {
    console.error('Error fetching from PMS:', error);
    return { synced: 0, errors: 1 };
  }
}

/**
 * Get weather information for the hotel location
 */
export async function getWeather(): Promise<{
  temperature: number;
  condition: string;
  forecast: string;
}> {
  const apiKey = process.env.WEATHER_API_KEY;

  if (!apiKey) {
    // Return mock weather in development
    return {
      temperature: 72,
      condition: 'Sunny',
      forecast: 'Clear skies throughout the day with temperatures reaching 75°F. Perfect weather for outdoor activities.',
    };
  }

  try {
    const response = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather`,
      {
        params: {
          q: 'Beverly Hills,CA,US',
          appid: apiKey,
          units: 'imperial',
        },
      }
    );

    const data = response.data;
    return {
      temperature: Math.round(data.main.temp),
      condition: data.weather[0].main,
      forecast: `${data.weather[0].description}. High of ${Math.round(data.main.temp_max)}°F, low of ${Math.round(data.main.temp_min)}°F.`,
    };
  } catch (error) {
    console.error('Error fetching weather:', error);
    return {
      temperature: 70,
      condition: 'Pleasant',
      forecast: 'Beautiful day expected.',
    };
  }
}
