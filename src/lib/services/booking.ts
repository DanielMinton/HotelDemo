import prisma from '../db/prisma';
import { addDays, differenceInDays, format, parseISO, isWeekend } from 'date-fns';
import Stripe from 'stripe';
import sgMail from '@sendgrid/mail';
import twilio from 'twilio';
import { HOTEL_CONFIG } from '../vapi/config';

// Initialize external services
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2025-11-17.clover' })
  : null;

if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

const twilioClient = process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  : null;

// Room type definitions
export const ROOM_TYPES = {
  DELUXE: {
    code: 'DELUXE',
    name: 'Deluxe Room',
    description: '400 sq ft, city view, king or two queens, work desk, marble bathroom',
    basePrice: 299,
    maxOccupancy: 4,
    bedType: 'King or Two Queens',
  },
  PREMIER: {
    code: 'PREMIER',
    name: 'Premier Room',
    description: '500 sq ft, partial ocean view, king bed, sitting area, spa-style bathroom',
    basePrice: 399,
    maxOccupancy: 3,
    bedType: 'King',
  },
  JUNIOR_SUITE: {
    code: 'JUNIOR_SUITE',
    name: 'Junior Suite',
    description: '650 sq ft, ocean view, separate living area, soaking tub, premium amenities',
    basePrice: 549,
    maxOccupancy: 4,
    bedType: 'King',
  },
  EXECUTIVE_SUITE: {
    code: 'EXECUTIVE_SUITE',
    name: 'Executive Suite',
    description: '900 sq ft, panoramic views, full kitchen, dining area, washer/dryer',
    basePrice: 799,
    maxOccupancy: 6,
    bedType: 'King + Sofa Bed',
  },
  PRESIDENTIAL: {
    code: 'PRESIDENTIAL',
    name: 'Presidential Suite',
    description: '1,500 sq ft, wraparound terrace, butler service, private bar, grand piano',
    basePrice: 1499,
    maxOccupancy: 8,
    bedType: 'King + Second Bedroom',
  },
};

// Package definitions
export const PACKAGES = {
  ROMANCE: {
    code: 'ROMANCE',
    name: 'Romance Package',
    description: 'Champagne, chocolate truffles, rose petal turndown',
    price: 150,
  },
  SPA: {
    code: 'SPA',
    name: 'Spa Package',
    description: 'Two 50-minute massage credits',
    price: 200,
  },
  EXPERIENCE: {
    code: 'EXPERIENCE',
    name: 'Experience Package',
    description: 'Dinner for two + sunset cruise tickets',
    price: 350,
  },
  BREAKFAST: {
    code: 'BREAKFAST',
    name: 'Breakfast Included',
    description: 'Daily breakfast buffet for two',
    price: 45, // per night
    perNight: true,
  },
};

/**
 * Check room availability for given dates
 */
export async function checkAvailability(
  checkInDate: string,
  checkOutDate: string,
  numberOfGuests: number,
  numberOfRooms: number = 1
): Promise<{
  available: boolean;
  availableRooms: typeof ROOM_TYPES[keyof typeof ROOM_TYPES][];
  alternativeDates?: { checkIn: string; checkOut: string }[];
}> {
  const checkIn = parseISO(checkInDate);
  const checkOut = parseISO(checkOutDate);
  const nights = differenceInDays(checkOut, checkIn);

  if (nights < 1) {
    return { available: false, availableRooms: [] };
  }

  // Get existing bookings for the date range
  const existingBookings = await prisma.booking.count({
    where: {
      status: { in: ['PENDING', 'CONFIRMED'] },
      OR: [
        {
          checkInDate: { lte: checkOut },
          checkOutDate: { gte: checkIn },
        },
      ],
    },
  });

  // Simple availability check (assuming 100 rooms total)
  const totalRooms = 100;
  const availableRoomCount = totalRooms - existingBookings;

  // Filter room types by occupancy
  const suitableRooms = Object.values(ROOM_TYPES).filter(
    room => room.maxOccupancy >= numberOfGuests
  );

  if (availableRoomCount >= numberOfRooms && suitableRooms.length > 0) {
    return {
      available: true,
      availableRooms: suitableRooms,
    };
  }

  // Suggest alternative dates if not available
  const alternativeDates = [];
  for (let i = 1; i <= 7; i++) {
    const altCheckIn = addDays(checkIn, i);
    const altCheckOut = addDays(checkOut, i);
    alternativeDates.push({
      checkIn: format(altCheckIn, 'yyyy-MM-dd'),
      checkOut: format(altCheckOut, 'yyyy-MM-dd'),
    });
  }

  return {
    available: false,
    availableRooms: [],
    alternativeDates,
  };
}

/**
 * Calculate pricing for a booking
 */
export async function calculatePrice(
  roomTypeCode: string,
  checkInDate: string,
  checkOutDate: string,
  numberOfRooms: number = 1,
  packageCodes: string[] = []
): Promise<{
  baseAmount: number;
  taxes: number;
  fees: number;
  discounts: number;
  totalAmount: number;
  breakdown: {
    roomRate: number;
    nights: number;
    packages: { name: string; price: number }[];
    resortFee: number;
    taxRate: number;
  };
}> {
  const roomType = ROOM_TYPES[roomTypeCode as keyof typeof ROOM_TYPES];
  if (!roomType) {
    throw new Error(`Invalid room type: ${roomTypeCode}`);
  }

  const checkIn = parseISO(checkInDate);
  const checkOut = parseISO(checkOutDate);
  const nights = differenceInDays(checkOut, checkIn);

  // Calculate base room rate with dynamic pricing
  let roomRate = roomType.basePrice;

  // Weekend premium
  if (isWeekend(checkIn) || isWeekend(checkOut)) {
    roomRate *= 1.15; // 15% weekend premium
  }

  // Get active pricing rules
  const pricingRules = await prisma.pricingRule.findMany({
    where: {
      active: true,
      OR: [
        { startDate: null },
        {
          startDate: { lte: checkOut },
          endDate: { gte: checkIn },
        },
      ],
    },
    orderBy: { priority: 'desc' },
  });

  // Apply pricing rules
  let multiplier = 1.0;
  for (const rule of pricingRules) {
    switch (rule.type) {
      case 'LENGTH_OF_STAY':
        if (rule.minStayNights && nights >= rule.minStayNights) {
          multiplier *= rule.multiplier;
        }
        break;
      case 'SEASONAL':
        multiplier *= rule.multiplier;
        break;
      case 'EARLY_BIRD':
        const daysUntilCheckIn = differenceInDays(checkIn, new Date());
        if (daysUntilCheckIn >= 30) {
          multiplier *= rule.multiplier;
        }
        break;
    }
  }

  roomRate *= multiplier;

  // Calculate amounts
  const baseAmount = Math.round(roomRate * nights * numberOfRooms * 100) / 100;
  const resortFee = HOTEL_CONFIG.resortFee * nights * numberOfRooms;

  // Calculate packages
  const selectedPackages = packageCodes
    .map(code => PACKAGES[code as keyof typeof PACKAGES])
    .filter(Boolean);

  const packageTotal = selectedPackages.reduce((sum, pkg) => {
    if ('perNight' in pkg && pkg.perNight) {
      return sum + pkg.price * nights;
    }
    return sum + pkg.price;
  }, 0);

  const subtotal = baseAmount + resortFee + packageTotal;
  const taxes = Math.round(subtotal * HOTEL_CONFIG.taxRate * 100) / 100;
  const totalAmount = Math.round((subtotal + taxes) * 100) / 100;

  return {
    baseAmount,
    taxes,
    fees: resortFee,
    discounts: 0,
    totalAmount,
    breakdown: {
      roomRate: Math.round(roomRate * 100) / 100,
      nights,
      packages: selectedPackages.map(pkg => ({ name: pkg.name, price: pkg.price })),
      resortFee: HOTEL_CONFIG.resortFee,
      taxRate: HOTEL_CONFIG.taxRate,
    },
  };
}

/**
 * Generate a unique confirmation code
 */
function generateConfirmationCode(): string {
  const prefix = 'GL';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}

/**
 * Create a new reservation
 */
export async function createReservation(data: {
  guestName: string;
  guestEmail?: string;
  guestPhone: string;
  roomTypeCode: string;
  checkInDate: string;
  checkOutDate: string;
  numberOfGuests: number;
  numberOfRooms?: number;
  packages?: string[];
  specialRequests?: string;
  squadSessionId?: string;
}): Promise<{
  success: boolean;
  confirmationCode?: string;
  reservationId?: string;
  totalAmount?: number;
  error?: string;
}> {
  try {
    // Calculate pricing
    const pricing = await calculatePrice(
      data.roomTypeCode,
      data.checkInDate,
      data.checkOutDate,
      data.numberOfRooms || 1,
      data.packages || []
    );

    // Find or create guest
    const [firstName, ...lastNameParts] = data.guestName.split(' ');
    const lastName = lastNameParts.join(' ') || firstName;

    let guest = await prisma.guest.findFirst({
      where: {
        OR: [
          { phone: data.guestPhone },
          data.guestEmail ? { email: data.guestEmail } : {},
        ],
      },
    });

    if (!guest) {
      guest = await prisma.guest.create({
        data: {
          firstName,
          lastName,
          phone: data.guestPhone,
          email: data.guestEmail,
        },
      });
    }

    // Find or create room type
    const roomType = ROOM_TYPES[data.roomTypeCode as keyof typeof ROOM_TYPES];
    let roomTypeRecord = await prisma.roomType.findUnique({
      where: { code: data.roomTypeCode },
    });

    if (!roomTypeRecord) {
      roomTypeRecord = await prisma.roomType.create({
        data: {
          code: roomType.code,
          name: roomType.name,
          description: roomType.description,
          basePrice: roomType.basePrice,
          maxOccupancy: roomType.maxOccupancy,
          bedType: roomType.bedType,
          amenities: [],
          imageUrls: [],
        },
      });
    }

    // Create booking
    const confirmationCode = generateConfirmationCode();
    const booking = await prisma.booking.create({
      data: {
        confirmationCode,
        guestId: guest.id,
        roomTypeId: roomTypeRecord.id,
        checkInDate: parseISO(data.checkInDate),
        checkOutDate: parseISO(data.checkOutDate),
        numberOfGuests: data.numberOfGuests,
        numberOfRooms: data.numberOfRooms || 1,
        specialRequests: data.specialRequests,
        baseAmount: pricing.baseAmount,
        taxes: pricing.taxes,
        fees: pricing.fees,
        discounts: pricing.discounts,
        totalAmount: pricing.totalAmount,
        squadSessionId: data.squadSessionId,
        status: 'PENDING',
      },
    });

    return {
      success: true,
      confirmationCode,
      reservationId: booking.id,
      totalAmount: pricing.totalAmount,
    };
  } catch (error) {
    console.error('Error creating reservation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create reservation',
    };
  }
}

/**
 * Process payment for a reservation
 */
export async function processPayment(
  reservationId: string,
  amount: number,
  paymentMethod: 'card' | 'pay_at_hotel'
): Promise<{
  success: boolean;
  paymentIntentId?: string;
  error?: string;
}> {
  if (paymentMethod === 'pay_at_hotel') {
    // Just update the booking status
    await prisma.booking.update({
      where: { id: reservationId },
      data: {
        status: 'CONFIRMED',
        paymentStatus: 'PENDING',
      },
    });

    return { success: true };
  }

  if (!stripe) {
    // Simulate payment in development
    if (process.env.NODE_ENV === 'development') {
      await prisma.booking.update({
        where: { id: reservationId },
        data: {
          status: 'CONFIRMED',
          paymentStatus: 'COMPLETED',
          paidAt: new Date(),
          stripePaymentIntentId: `pi_dev_${Date.now()}`,
        },
      });
      return { success: true, paymentIntentId: `pi_dev_${Date.now()}` };
    }

    return { success: false, error: 'Payment processing not configured' };
  }

  try {
    // Create a payment intent (in real app, would use collected payment method)
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents
      currency: 'usd',
      metadata: {
        reservationId,
      },
    });

    // Update booking with payment intent
    await prisma.booking.update({
      where: { id: reservationId },
      data: {
        stripePaymentIntentId: paymentIntent.id,
        paymentStatus: 'PROCESSING',
      },
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error) {
    console.error('Payment processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    };
  }
}

/**
 * Send booking confirmation via email and/or SMS
 */
export async function sendConfirmation(
  reservationId: string,
  options: { sendEmail?: boolean; sendSms?: boolean } = { sendEmail: true, sendSms: true }
): Promise<{ emailSent: boolean; smsSent: boolean }> {
  const booking = await prisma.booking.findUnique({
    where: { id: reservationId },
    include: {
      guest: true,
      roomType: true,
    },
  });

  if (!booking) {
    return { emailSent: false, smsSent: false };
  }

  let emailSent = false;
  let smsSent = false;

  const confirmationDetails = `
Confirmation: ${booking.confirmationCode}
Room: ${booking.roomType.name}
Check-in: ${format(booking.checkInDate, 'EEEE, MMMM d, yyyy')} at ${HOTEL_CONFIG.checkInTime}
Check-out: ${format(booking.checkOutDate, 'EEEE, MMMM d, yyyy')} by ${HOTEL_CONFIG.checkOutTime}
Guests: ${booking.numberOfGuests}
Total: $${booking.totalAmount.toFixed(2)}
  `.trim();

  // Send email
  if (options.sendEmail && booking.guest.email && process.env.SENDGRID_API_KEY) {
    try {
      await sgMail.send({
        to: booking.guest.email,
        from: process.env.SENDGRID_FROM_EMAIL || 'reservations@grandluxehotel.com',
        subject: `Reservation Confirmed - ${booking.confirmationCode}`,
        text: `
Dear ${booking.guest.firstName},

Thank you for choosing ${HOTEL_CONFIG.name}!

${confirmationDetails}

${booking.specialRequests ? `Special Requests: ${booking.specialRequests}` : ''}

We look forward to welcoming you!

The Grand Luxe Hotel
${HOTEL_CONFIG.address}
${HOTEL_CONFIG.phoneNumber}
        `.trim(),
        html: `
<h2>Reservation Confirmed</h2>
<p>Dear ${booking.guest.firstName},</p>
<p>Thank you for choosing ${HOTEL_CONFIG.name}!</p>
<div style="background: #f5f5f5; padding: 20px; margin: 20px 0;">
<p><strong>Confirmation:</strong> ${booking.confirmationCode}</p>
<p><strong>Room:</strong> ${booking.roomType.name}</p>
<p><strong>Check-in:</strong> ${format(booking.checkInDate, 'EEEE, MMMM d, yyyy')} at ${HOTEL_CONFIG.checkInTime}</p>
<p><strong>Check-out:</strong> ${format(booking.checkOutDate, 'EEEE, MMMM d, yyyy')} by ${HOTEL_CONFIG.checkOutTime}</p>
<p><strong>Guests:</strong> ${booking.numberOfGuests}</p>
<p><strong>Total:</strong> $${booking.totalAmount.toFixed(2)}</p>
</div>
<p>We look forward to welcoming you!</p>
<p>${HOTEL_CONFIG.name}<br>${HOTEL_CONFIG.address}<br>${HOTEL_CONFIG.phoneNumber}</p>
        `.trim(),
      });

      emailSent = true;
      await prisma.booking.update({
        where: { id: reservationId },
        data: { emailSentAt: new Date() },
      });
    } catch (error) {
      console.error('Error sending confirmation email:', error);
    }
  }

  // Send SMS
  if (options.sendSms && twilioClient && process.env.TWILIO_PHONE_NUMBER) {
    try {
      await twilioClient.messages.create({
        to: booking.guest.phone,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: `${HOTEL_CONFIG.name} Confirmation ${booking.confirmationCode}: ${booking.roomType.name}, Check-in ${format(booking.checkInDate, 'MMM d')} at ${HOTEL_CONFIG.checkInTime}. Total: $${booking.totalAmount.toFixed(2)}`,
      });

      smsSent = true;
      await prisma.booking.update({
        where: { id: reservationId },
        data: { smsSentAt: new Date() },
      });
    } catch (error) {
      console.error('Error sending confirmation SMS:', error);
    }
  }

  return { emailSent, smsSent };
}

/**
 * Get room options formatted for the assistant
 */
export function formatRoomOptions(
  rooms: typeof ROOM_TYPES[keyof typeof ROOM_TYPES][],
  checkInDate: string,
  checkOutDate: string,
  preferences?: string
): string {
  const nights = differenceInDays(parseISO(checkOutDate), parseISO(checkInDate));

  return rooms.map((room, index) => {
    const totalEstimate = room.basePrice * nights;
    return `
Option ${index + 1}: ${room.name}
- ${room.description}
- Bed: ${room.bedType}
- Rate: $${room.basePrice}/night (approx. $${totalEstimate} for ${nights} nights before taxes)
- Max occupancy: ${room.maxOccupancy} guests
    `.trim();
  }).join('\n\n');
}
