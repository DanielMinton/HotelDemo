import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db/prisma';
import { seedKnowledgeBase } from '@/lib/services/knowledge-base';
import { ROOM_TYPES, PACKAGES } from '@/lib/services/booking';

export const runtime = 'nodejs';

/**
 * Seed endpoint to populate initial data
 * POST /api/seed
 */
export async function POST(request: NextRequest) {
  // Only allow in development or with secret
  if (process.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.SEED_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  try {
    console.log('Starting database seed...');

    // Seed room types
    console.log('Seeding room types...');
    for (const room of Object.values(ROOM_TYPES)) {
      await prisma.roomType.upsert({
        where: { code: room.code },
        update: {
          name: room.name,
          description: room.description,
          basePrice: room.basePrice,
          maxOccupancy: room.maxOccupancy,
          bedType: room.bedType,
        },
        create: {
          code: room.code,
          name: room.name,
          description: room.description,
          basePrice: room.basePrice,
          maxOccupancy: room.maxOccupancy,
          bedType: room.bedType,
          amenities: [],
          imageUrls: [],
        },
      });
    }

    // Seed rooms (10 of each type across 10 floors)
    console.log('Seeding rooms...');
    const roomTypes = await prisma.roomType.findMany();
    let roomNumber = 100;

    for (let floor = 1; floor <= 10; floor++) {
      for (const roomType of roomTypes) {
        const roomsPerType = floor <= 5 ? 2 : 1; // More basic rooms on lower floors
        for (let i = 0; i < roomsPerType; i++) {
          roomNumber++;
          await prisma.room.upsert({
            where: { roomNumber: roomNumber.toString() },
            update: {
              roomTypeId: roomType.id,
              floor,
            },
            create: {
              roomNumber: roomNumber.toString(),
              roomTypeId: roomType.id,
              floor,
              status: 'AVAILABLE',
            },
          });
        }
      }
    }

    // Seed pricing rules
    console.log('Seeding pricing rules...');
    const pricingRules = [
      {
        name: 'Weekend Premium',
        type: 'WEEKEND' as const,
        dayOfWeek: [5, 6], // Friday, Saturday
        multiplier: 1.15,
      },
      {
        name: 'Extended Stay Discount',
        type: 'LENGTH_OF_STAY' as const,
        minStayNights: 7,
        multiplier: 0.9,
      },
      {
        name: 'Early Bird (30+ days)',
        type: 'EARLY_BIRD' as const,
        multiplier: 0.85,
      },
      {
        name: 'Peak Season',
        type: 'SEASONAL' as const,
        startDate: new Date('2024-06-01'),
        endDate: new Date('2024-08-31'),
        multiplier: 1.25,
      },
      {
        name: 'Holiday Season',
        type: 'SEASONAL' as const,
        startDate: new Date('2024-12-15'),
        endDate: new Date('2025-01-05'),
        multiplier: 1.35,
      },
    ];

    for (const rule of pricingRules) {
      await prisma.pricingRule.upsert({
        where: { id: rule.name.toLowerCase().replace(/\s+/g, '-') },
        update: rule,
        create: {
          id: rule.name.toLowerCase().replace(/\s+/g, '-'),
          ...rule,
        },
      });
    }

    // Seed knowledge base
    console.log('Seeding knowledge base...');
    await seedKnowledgeBase();

    // Create sample guest for testing
    console.log('Creating sample guest...');
    const sampleGuest = await prisma.guest.upsert({
      where: { phone: '+15551234567' },
      update: {},
      create: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+15551234567',
        preferredLanguage: 'en',
        vipStatus: false,
      },
    });

    // Create sample reservation
    console.log('Creating sample reservation...');
    const deluxeRoom = roomTypes.find(r => r.code === 'DELUXE');
    if (deluxeRoom) {
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 7);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 3);

      await prisma.reservation.upsert({
        where: { externalId: 'sample-reservation-001' },
        update: {},
        create: {
          externalId: 'sample-reservation-001',
          guestId: sampleGuest.id,
          roomType: 'DELUXE',
          checkInDate: checkIn,
          checkOutDate: checkOut,
          status: 'CONFIRMED',
          numberOfGuests: 2,
        },
      });
    }

    const stats = {
      roomTypes: await prisma.roomType.count(),
      rooms: await prisma.room.count(),
      pricingRules: await prisma.pricingRule.count(),
      knowledgeDocuments: await prisma.knowledgeDocument.count(),
      guests: await prisma.guest.count(),
      reservations: await prisma.reservation.count(),
    };

    console.log('Seed completed:', stats);

    return NextResponse.json({
      success: true,
      message: 'Database seeded successfully',
      stats,
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// GET endpoint to check seed status
export async function GET() {
  try {
    const stats = {
      roomTypes: await prisma.roomType.count(),
      rooms: await prisma.room.count(),
      pricingRules: await prisma.pricingRule.count(),
      knowledgeDocuments: await prisma.knowledgeDocument.count(),
      guests: await prisma.guest.count(),
      reservations: await prisma.reservation.count(),
      bookings: await prisma.booking.count(),
      calls: await prisma.call.count(),
    };

    return NextResponse.json({
      seeded: stats.roomTypes > 0,
      stats,
    });
  } catch (error) {
    return NextResponse.json({
      seeded: false,
      error: error instanceof Error ? error.message : 'Database not connected',
    });
  }
}
