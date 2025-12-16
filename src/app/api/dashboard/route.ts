import { NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    // Get today's calls
    const todaysCalls = await prisma.call.findMany({
      where: {
        startTime: {
          gte: startOfToday,
          lte: endOfToday,
        },
      },
      orderBy: { startTime: 'desc' },
      take: 100,
    });

    // Calculate stats
    const totalCalls = todaysCalls.length;
    const successfulCalls = todaysCalls.filter(c => c.status === 'ENDED' && !c.escalated).length;
    const successRate = totalCalls > 0 ? (successfulCalls / totalCalls) * 100 : 0;

    const callsWithDuration = todaysCalls.filter(c => c.duration && c.duration > 0);
    const avgDuration = callsWithDuration.length > 0
      ? callsWithDuration.reduce((sum, c) => sum + (c.duration || 0), 0) / callsWithDuration.length
      : 0;

    const callsWithSentiment = todaysCalls.filter(c => c.sentiment !== null);
    const avgSentiment = callsWithSentiment.length > 0
      ? callsWithSentiment.reduce((sum, c) => sum + (c.sentiment || 0), 0) / callsWithSentiment.length
      : 0;

    // Get active bookings
    const activeBookings = await prisma.booking.count({
      where: {
        status: { in: ['PENDING', 'CONFIRMED'] },
        checkOutDate: { gte: today },
      },
    });

    // Get today's check-ins
    const todayCheckIns = await prisma.reservation.count({
      where: {
        checkInDate: {
          gte: startOfToday,
          lte: endOfToday,
        },
        status: { in: ['CONFIRMED', 'CHECKED_IN'] },
      },
    });

    // Get pending issues
    const pendingIssues = await prisma.guestIssue.count({
      where: {
        status: { in: ['OPEN', 'IN_PROGRESS'] },
      },
    });

    // Get scheduled proactive calls
    const scheduledCalls = await prisma.proactiveCall.count({
      where: {
        status: 'SCHEDULED',
        scheduledTime: { gte: today },
      },
    });

    // Get recent calls for table
    const recentCalls = await prisma.call.findMany({
      orderBy: { startTime: 'desc' },
      take: 20,
      select: {
        id: true,
        template: true,
        phoneNumber: true,
        duration: true,
        status: true,
        sentiment: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      stats: {
        totalCalls,
        successRate,
        avgDuration: Math.round(avgDuration),
        avgSentiment,
        activeBookings,
        todayCheckIns,
        pendingIssues,
        scheduledCalls,
      },
      recentCalls: recentCalls.map(call => ({
        id: call.id,
        template: call.template,
        phoneNumber: call.phoneNumber,
        duration: call.duration,
        status: call.status,
        sentiment: call.sentiment,
        createdAt: call.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Dashboard API error:', error);

    // Return empty stats if database not connected
    return NextResponse.json({
      stats: {
        totalCalls: 0,
        successRate: 0,
        avgDuration: 0,
        avgSentiment: 0,
        activeBookings: 0,
        todayCheckIns: 0,
        pendingIssues: 0,
        scheduledCalls: 0,
      },
      recentCalls: [],
      error: error instanceof Error ? error.message : 'Database not connected',
    });
  }
}
