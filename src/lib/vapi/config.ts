import { VapiAssistantConfig, VapiTool, VapiSquadConfig, VapiTransferDestination } from './types';

// ============================================
// HOTEL CONFIGURATION
// ============================================

export const HOTEL_CONFIG = {
  name: 'The Grand Luxe Hotel',
  phoneNumber: process.env.HOTEL_PHONE_NUMBER || '+1-555-GRAND-LUX',
  address: '123 Luxury Avenue, Beverly Hills, CA 90210',
  checkInTime: '15:00',
  checkOutTime: '11:00',
  timezone: 'America/Los_Angeles',
  currency: 'USD',
  taxRate: 0.12,
  resortFee: 45.00,
};

// ============================================
// TEMPLATE 1: CONCIERGE ASSISTANT
// ============================================

export const CONCIERGE_SYSTEM_PROMPT = `You are an expert hotel concierge AI assistant for ${HOTEL_CONFIG.name}. You provide exceptional, personalized service to all guests with warmth, professionalism, and deep knowledge of our hotel and local area.

## Core Responsibilities
1. Answer guest inquiries about hotel amenities, services, dining, and policies
2. Provide recommendations for local attractions, restaurants, and activities
3. Check availability and make reservations for hotel services (spa, dining, activities)
4. Detect and record guest sentiment, identifying VIP treatment opportunities
5. Escalate to human staff when situations require personal attention

## Knowledge Base Usage
- Always use queryKnowledgeBase to search for accurate hotel information
- Search before answering questions about amenities, policies, or services
- If information isn't found, honestly say you'll connect them with staff who can help

## Language Handling
- Detect the guest's preferred language from their speech
- Use setLanguage to switch conversation language when detected
- Supported languages: English, Spanish, French, German, Italian, Portuguese, Russian, Chinese, Japanese, Korean, Arabic, Hindi, Dutch, Swedish, Norwegian
- Always respond in the guest's detected or selected language

## Service Excellence
- Greet warmly and ask how you can assist
- Listen actively and confirm understanding
- Proactively suggest relevant upgrades or services
- Thank guests for choosing our hotel

## Sentiment Monitoring
- Use recordSentiment when detecting strong emotions (positive or negative)
- Mark VIP indicators for: high spend mentions, special occasions, repeat guests
- Alert staff immediately for dissatisfaction or complaints

## Booking Protocol
- Always check availability before confirming bookings
- Confirm date, time, number of guests, and special requests
- Provide confirmation details after booking

## Escalation Protocol
Use transferToStaff when:
- Guest explicitly requests to speak with a person
- Complaint requires immediate attention
- Complex requests beyond your capabilities
- Payment or billing issues
- Safety or emergency situations

## Response Style
- Be concise but thorough
- Use natural, conversational language
- Avoid robotic or scripted responses
- Show genuine care and interest`;

export const CONCIERGE_TOOLS: VapiTool[] = [
  {
    type: 'function',
    function: {
      name: 'queryKnowledgeBase',
      description: 'Search the hotel knowledge base for information about amenities, services, policies, dining options, local attractions, and more',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The search query to find relevant information',
          },
          category: {
            type: 'string',
            description: 'Optional category to filter results',
            enum: ['amenities', 'dining', 'spa', 'activities', 'policies', 'local_attractions', 'transportation', 'room_features', 'events', 'faq'],
          },
          language: {
            type: 'string',
            description: 'Language for results (ISO 639-1 code)',
          },
        },
        required: ['query'],
      },
    },
    async: false,
    messages: {
      requestStart: {
        type: 'request-start',
        content: 'Let me look that up for you...',
      },
      requestComplete: {
        type: 'request-complete',
        content: 'I found some information for you.',
      },
      requestFailed: {
        type: 'request-failed',
        content: 'I couldn\'t find that information. Let me connect you with someone who can help.',
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'checkServiceAvailability',
      description: 'Check availability for hotel services like spa treatments, restaurant reservations, or activities',
      parameters: {
        type: 'object',
        properties: {
          serviceType: {
            type: 'string',
            description: 'Type of service to check',
            enum: ['spa', 'dining', 'activities', 'transportation'],
          },
          serviceName: {
            type: 'string',
            description: 'Specific service name (e.g., "Swedish Massage", "Rooftop Restaurant")',
          },
          date: {
            type: 'string',
            description: 'Date to check availability (YYYY-MM-DD format)',
          },
          time: {
            type: 'string',
            description: 'Preferred time (HH:MM format, 24-hour)',
          },
          numberOfGuests: {
            type: 'number',
            description: 'Number of guests for the reservation',
          },
        },
        required: ['serviceType', 'date'],
      },
    },
    async: false,
    messages: {
      requestStart: {
        type: 'request-start',
        content: 'Checking availability for you...',
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'createBooking',
      description: 'Create a reservation for hotel services after confirming availability',
      parameters: {
        type: 'object',
        properties: {
          serviceType: {
            type: 'string',
            description: 'Type of service',
            enum: ['spa', 'dining', 'activities', 'transportation'],
          },
          serviceName: {
            type: 'string',
            description: 'Specific service name',
          },
          guestName: {
            type: 'string',
            description: 'Name for the reservation',
          },
          guestPhone: {
            type: 'string',
            description: 'Contact phone number',
          },
          roomNumber: {
            type: 'string',
            description: 'Guest room number if staying at hotel',
          },
          date: {
            type: 'string',
            description: 'Reservation date (YYYY-MM-DD)',
          },
          time: {
            type: 'string',
            description: 'Reservation time (HH:MM)',
          },
          numberOfGuests: {
            type: 'number',
            description: 'Number of guests',
          },
          specialRequests: {
            type: 'string',
            description: 'Any special requests or notes',
          },
        },
        required: ['serviceType', 'serviceName', 'guestName', 'date', 'time', 'numberOfGuests'],
      },
    },
    async: true,
    messages: {
      requestStart: {
        type: 'request-start',
        content: 'Creating your reservation...',
      },
      requestComplete: {
        type: 'request-complete',
        content: 'Your reservation has been confirmed.',
      },
      requestFailed: {
        type: 'request-failed',
        content: 'I wasn\'t able to complete the reservation. Let me connect you with our reservations team.',
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'setLanguage',
      description: 'Change the conversation language when guest prefers a different language',
      parameters: {
        type: 'object',
        properties: {
          languageCode: {
            type: 'string',
            description: 'ISO 639-1 language code',
            enum: ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko', 'ar', 'hi', 'nl', 'sv', 'no'],
          },
        },
        required: ['languageCode'],
      },
    },
    async: false,
  },
  {
    type: 'function',
    function: {
      name: 'recordSentiment',
      description: 'Record guest sentiment and VIP indicators for follow-up and service improvement',
      parameters: {
        type: 'object',
        properties: {
          sentiment: {
            type: 'number',
            description: 'Sentiment score from -1 (very negative) to 1 (very positive)',
          },
          indicators: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of sentiment indicators or VIP signals detected',
          },
          isVip: {
            type: 'boolean',
            description: 'Whether guest should receive VIP treatment',
          },
          notes: {
            type: 'string',
            description: 'Additional notes about the interaction',
          },
        },
        required: ['sentiment'],
      },
    },
    async: true,
  },
  {
    type: 'transferCall',
    destinations: [
      {
        type: 'number',
        number: process.env.STAFF_PHONE_NUMBER || '+1-555-STAFF',
        message: 'I\'m connecting you with our guest services team who can better assist you.',
        description: 'Transfer to human staff for escalation',
      },
    ],
  },
];

export const CONCIERGE_ASSISTANT: VapiAssistantConfig = {
  name: 'Grand Luxe Concierge',
  firstMessage: 'Hello and welcome to The Grand Luxe Hotel. I\'m your AI concierge, here to help with any questions about our amenities, services, or to make reservations. How may I assist you today?',
  firstMessageMode: 'assistant-speaks-first',
  silenceTimeoutSeconds: 30,
  maxDurationSeconds: 600,
  backgroundSound: 'off',
  backchannelingEnabled: true,
  backgroundDenoisingEnabled: true,
  model: {
    provider: 'openai',
    model: 'gpt-4o-2024-11-20',
    temperature: 0.7,
    messages: [
      {
        role: 'system',
        content: CONCIERGE_SYSTEM_PROMPT,
      },
    ],
  },
  voice: {
    provider: 'eleven-labs',
    voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel - warm, professional
    stability: 0.5,
    similarityBoost: 0.75,
  },
  transcriber: {
    provider: 'deepgram',
    model: 'nova-2',
    language: 'multi',
    smartFormat: true,
    keywords: ['Grand Luxe', 'concierge', 'reservation', 'spa', 'restaurant'],
  },
  tools: CONCIERGE_TOOLS,
  server: {
    url: process.env.VAPI_SERVER_URL || 'https://your-domain.com/api/vapi/webhook',
    secret: process.env.VAPI_WEBHOOK_SECRET,
  },
};

// ============================================
// TEMPLATE 2: BOOKING SQUAD
// ============================================

export const GREETER_SYSTEM_PROMPT = `You are the friendly greeter for ${HOTEL_CONFIG.name}'s booking team. Your role is to warmly welcome callers and determine their intent.

## Responsibilities
1. Greet warmly and introduce yourself
2. Ask for the guest's name
3. Confirm they're interested in making a reservation
4. Collect any initial information they volunteer

## Conversation Flow
1. Greet: "Thank you for calling The Grand Luxe Hotel! I'm so happy to help you today."
2. Ask name: "May I have your name, please?"
3. Confirm intent: "Wonderful, [Name]! Are you looking to book a stay with us?"
4. If yes: Transfer to Qualifier assistant
5. If no/other: Offer to help or transfer to appropriate department

## Transfer Protocol
- When ready to transfer, use the transferCall tool
- Do NOT say "transferring you" - it should be seamless
- Simply continue the conversation naturally

## Style
- Enthusiastic but not overwhelming
- Natural and conversational
- Quick to transition once intent is confirmed`;

export const QUALIFIER_SYSTEM_PROMPT = `You are the booking qualifier for ${HOTEL_CONFIG.name}. Your role is to gather essential booking details before presenting room options.

## Information to Collect
1. Check-in date
2. Check-out date
3. Number of guests (adults and children)
4. Room preferences (bed type, view, floor)
5. Special requirements or occasions

## Conversation Flow
1. Acknowledge the guest by name (from previous conversation)
2. Ask for check-in date naturally
3. Confirm check-out date
4. Ask about guests: "How many guests will be staying?"
5. Ask about preferences: "Do you have any preferences for your room?"
6. Check availability using the checkAvailability tool
7. Transfer to Room Specialist with all gathered information

## Important
- If dates aren't available, offer alternative dates
- Note any special occasions mentioned (anniversary, birthday, honeymoon)
- Be efficient but not rushed

## Transfer Protocol
- Transfer to Room Specialist once you have all information
- Include collected details in the transfer for context continuity`;

export const ROOM_SPECIALIST_SYSTEM_PROMPT = `You are the room specialist for ${HOTEL_CONFIG.name}. Your role is to present room options and help guests choose the perfect accommodation.

## Available Room Types
1. **Deluxe Room** ($299/night) - 400 sq ft, city view, king or two queens
2. **Premier Room** ($399/night) - 500 sq ft, partial ocean view, king bed, sitting area
3. **Junior Suite** ($549/night) - 650 sq ft, ocean view, separate living area
4. **Executive Suite** ($799/night) - 900 sq ft, panoramic views, full kitchen, dining area
5. **Presidential Suite** ($1,499/night) - 1,500 sq ft, wraparound terrace, butler service

## Presentation Strategy
1. Present 2-3 options based on guest preferences and budget signals
2. Start with mid-tier, mention upgrade, have value option ready
3. Highlight unique features that match stated preferences
4. Mention current promotions or packages if applicable

## Upselling Techniques
- "For just $100 more per night, you could enjoy..."
- "Many of our anniversary guests love the suite for the extra space..."
- "The ocean view rooms are particularly stunning at sunset..."

## Packages to Mention
- Romance Package: Champagne, chocolate, rose petals (+$150)
- Spa Package: 2 massage credits (+$200)
- Experience Package: Dinner for 2 + sunset cruise (+$350)

## Transfer Protocol
Once guest selects a room:
1. Confirm their choice
2. Summarize the selection
3. Transfer to Booking Agent for final processing`;

export const BOOKING_AGENT_SYSTEM_PROMPT = `You are the booking agent for ${HOTEL_CONFIG.name}. Your role is to finalize reservations and process payments.

## Final Steps
1. Confirm all booking details with the guest
2. Calculate and present total with breakdown
3. Collect payment information
4. Process the booking
5. Provide confirmation number
6. Offer to send confirmation via email and SMS
7. Thank guest and end call professionally

## Price Breakdown
- Room rate x nights
- Taxes (${HOTEL_CONFIG.taxRate * 100}%)
- Resort fee ($${HOTEL_CONFIG.resortFee}/night)
- Any packages or add-ons
- Discounts applied

## Payment Processing
- Use processPayment tool with guest consent
- Handle card details securely
- Confirm payment success before providing confirmation

## Cancellation Policy
- Free cancellation up to 48 hours before check-in
- One night charge for late cancellation
- Prepaid rates are non-refundable

## Confirmation
- Provide confirmation number clearly
- Offer to send email and SMS confirmation
- Remind of check-in time (${HOTEL_CONFIG.checkInTime})
- Mention early check-in availability if requested

## Closing
"Thank you for choosing The Grand Luxe Hotel, [Name]. We look forward to welcoming you on [date]. Is there anything else I can help you with today?"`;

export const BOOKING_SQUAD_TOOLS: Record<string, VapiTool[]> = {
  greeter: [],
  qualifier: [
    {
      type: 'function',
      function: {
        name: 'checkAvailability',
        description: 'Check room availability for specified dates',
        parameters: {
          type: 'object',
          properties: {
            checkInDate: {
              type: 'string',
              description: 'Check-in date (YYYY-MM-DD)',
            },
            checkOutDate: {
              type: 'string',
              description: 'Check-out date (YYYY-MM-DD)',
            },
            numberOfRooms: {
              type: 'number',
              description: 'Number of rooms needed',
            },
            numberOfGuests: {
              type: 'number',
              description: 'Total number of guests',
            },
          },
          required: ['checkInDate', 'checkOutDate', 'numberOfGuests'],
        },
      },
      async: false,
      messages: {
        requestStart: {
          type: 'request-start',
          content: 'Let me check our availability for those dates...',
        },
      },
    },
  ],
  roomSpecialist: [
    {
      type: 'function',
      function: {
        name: 'getRoomOptions',
        description: 'Get available room options with pricing for the booking',
        parameters: {
          type: 'object',
          properties: {
            checkInDate: {
              type: 'string',
              description: 'Check-in date',
            },
            checkOutDate: {
              type: 'string',
              description: 'Check-out date',
            },
            numberOfGuests: {
              type: 'number',
              description: 'Number of guests',
            },
            preferences: {
              type: 'string',
              description: 'Guest preferences (bed type, view, etc)',
            },
          },
          required: ['checkInDate', 'checkOutDate', 'numberOfGuests'],
        },
      },
      async: false,
    },
    {
      type: 'function',
      function: {
        name: 'calculatePrice',
        description: 'Calculate total price for a room selection',
        parameters: {
          type: 'object',
          properties: {
            roomType: {
              type: 'string',
              description: 'Selected room type code',
            },
            checkInDate: {
              type: 'string',
              description: 'Check-in date',
            },
            checkOutDate: {
              type: 'string',
              description: 'Check-out date',
            },
            numberOfRooms: {
              type: 'number',
              description: 'Number of rooms',
            },
            packages: {
              type: 'array',
              items: { type: 'string' },
              description: 'Selected package codes',
            },
          },
          required: ['roomType', 'checkInDate', 'checkOutDate'],
        },
      },
      async: false,
    },
  ],
  bookingAgent: [
    {
      type: 'function',
      function: {
        name: 'createReservation',
        description: 'Create the final reservation in the system',
        parameters: {
          type: 'object',
          properties: {
            guestName: {
              type: 'string',
              description: 'Full guest name',
            },
            guestEmail: {
              type: 'string',
              description: 'Guest email for confirmation',
            },
            guestPhone: {
              type: 'string',
              description: 'Guest phone number',
            },
            roomType: {
              type: 'string',
              description: 'Selected room type',
            },
            checkInDate: {
              type: 'string',
              description: 'Check-in date',
            },
            checkOutDate: {
              type: 'string',
              description: 'Check-out date',
            },
            numberOfGuests: {
              type: 'number',
              description: 'Number of guests',
            },
            numberOfRooms: {
              type: 'number',
              description: 'Number of rooms',
            },
            packages: {
              type: 'array',
              items: { type: 'string' },
              description: 'Selected packages',
            },
            specialRequests: {
              type: 'string',
              description: 'Special requests',
            },
            totalAmount: {
              type: 'number',
              description: 'Total booking amount',
            },
          },
          required: ['guestName', 'guestPhone', 'roomType', 'checkInDate', 'checkOutDate', 'numberOfGuests', 'totalAmount'],
        },
      },
      async: true,
      messages: {
        requestStart: {
          type: 'request-start',
          content: 'Creating your reservation now...',
        },
        requestComplete: {
          type: 'request-complete',
          content: 'Excellent! Your reservation is confirmed.',
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'processPayment',
        description: 'Process payment for the reservation',
        parameters: {
          type: 'object',
          properties: {
            reservationId: {
              type: 'string',
              description: 'Reservation ID to process payment for',
            },
            amount: {
              type: 'number',
              description: 'Amount to charge',
            },
            paymentMethod: {
              type: 'string',
              description: 'Payment method type',
              enum: ['card', 'pay_at_hotel'],
            },
          },
          required: ['reservationId', 'amount', 'paymentMethod'],
        },
      },
      async: true,
      messages: {
        requestStart: {
          type: 'request-start',
          content: 'Processing your payment securely...',
        },
        requestComplete: {
          type: 'request-complete',
          content: 'Payment processed successfully!',
        },
        requestFailed: {
          type: 'request-failed',
          content: 'I\'m having trouble processing the payment. Would you like to try a different card?',
        },
      },
    },
    {
      type: 'function',
      function: {
        name: 'sendConfirmation',
        description: 'Send booking confirmation via email and/or SMS',
        parameters: {
          type: 'object',
          properties: {
            reservationId: {
              type: 'string',
              description: 'Reservation ID',
            },
            sendEmail: {
              type: 'boolean',
              description: 'Whether to send email confirmation',
            },
            sendSms: {
              type: 'boolean',
              description: 'Whether to send SMS confirmation',
            },
          },
          required: ['reservationId'],
        },
      },
      async: true,
    },
  ],
};

const createSquadTransferDestinations = (currentAgent: string): VapiTransferDestination[] => {
  const agents = ['Greeter', 'Qualifier', 'Room Specialist', 'Booking Agent'];
  const nextIndex = agents.findIndex(a => a === currentAgent) + 1;

  if (nextIndex >= agents.length) return [];

  return [{
    type: 'assistant',
    assistantName: agents[nextIndex],
    transferPlan: {
      mode: 'swap-system-message-in-history',
    },
  }];
};

export const BOOKING_SQUAD: VapiSquadConfig = {
  name: 'Grand Luxe Booking Squad',
  members: [
    {
      assistant: {
        name: 'Greeter',
        firstMessage: 'Thank you for calling The Grand Luxe Hotel! I\'m so happy to help you today. May I have your name, please?',
        model: {
          provider: 'openai',
          model: 'gpt-4o-mini', // Faster, cheaper for simple greeting
          temperature: 0.8,
          messages: [{ role: 'system', content: GREETER_SYSTEM_PROMPT }],
        },
        voice: {
          provider: 'eleven-labs',
          voiceId: 'EXAVITQu4vr4xnSDxMaL', // Bella - warm, friendly
        },
      },
      assistantDestinations: createSquadTransferDestinations('Greeter'),
    },
    {
      assistant: {
        name: 'Qualifier',
        model: {
          provider: 'openai',
          model: 'gpt-4o-2024-11-20',
          temperature: 0.7,
          messages: [{ role: 'system', content: QUALIFIER_SYSTEM_PROMPT }],
        },
        voice: {
          provider: 'eleven-labs',
          voiceId: '21m00Tcm4TlvDq8ikWAM', // Rachel - professional
        },
        tools: BOOKING_SQUAD_TOOLS.qualifier,
      },
      assistantDestinations: createSquadTransferDestinations('Qualifier'),
    },
    {
      assistant: {
        name: 'Room Specialist',
        model: {
          provider: 'openai',
          model: 'gpt-4o-2024-11-20',
          temperature: 0.7,
          messages: [{ role: 'system', content: ROOM_SPECIALIST_SYSTEM_PROMPT }],
        },
        voice: {
          provider: 'eleven-labs',
          voiceId: 'pNInz6obpgDQGcFmaJgB', // Adam - confident, knowledgeable
        },
        tools: BOOKING_SQUAD_TOOLS.roomSpecialist,
      },
      assistantDestinations: createSquadTransferDestinations('Room Specialist'),
    },
    {
      assistant: {
        name: 'Booking Agent',
        model: {
          provider: 'openai',
          model: 'gpt-4o-2024-11-20',
          temperature: 0.6, // More precise for final booking
          messages: [{ role: 'system', content: BOOKING_AGENT_SYSTEM_PROMPT }],
        },
        voice: {
          provider: 'eleven-labs',
          voiceId: 'ThT5KcBeYPX3keUQqHPh', // Dorothy - trustworthy, reassuring
        },
        tools: BOOKING_SQUAD_TOOLS.bookingAgent,
        endCallMessage: 'Thank you for choosing The Grand Luxe Hotel. We look forward to your stay. Goodbye!',
      },
    },
  ],
  membersOverrides: {
    transcriber: {
      provider: 'deepgram',
      model: 'nova-2',
      language: 'en',
      smartFormat: true,
    },
    silenceTimeoutSeconds: 20,
    maxDurationSeconds: 900,
    backgroundDenoisingEnabled: true,
    server: {
      url: process.env.VAPI_SERVER_URL || 'https://your-domain.com/api/vapi/webhook',
      secret: process.env.VAPI_WEBHOOK_SECRET,
    },
  },
};

// ============================================
// TEMPLATE 3: PROACTIVE SERVICES
// ============================================

export const PRE_ARRIVAL_SYSTEM_PROMPT = `You are calling to confirm a guest's upcoming reservation at ${HOTEL_CONFIG.name}.

## Call Purpose
1. Confirm reservation details
2. Offer early check-in if available
3. Suggest pre-arrival services (dining reservations, spa)
4. Collect arrival time and transportation needs
5. Note any special requests

## Call Script
1. "Hello, this is [Name] from The Grand Luxe Hotel. May I speak with [Guest Name]?"
2. "I'm calling to confirm your upcoming reservation for [dates]."
3. "Is everything still correct with your booking?"
4. "What time are you expecting to arrive? Our check-in time is ${HOTEL_CONFIG.checkInTime}."
5. "Would you like us to arrange airport transportation?"
6. "Can I make any dinner reservations for your first evening?"

## Handling
- If guest not available: Ask best time to call back
- If changes needed: Update reservation details
- If cancellation: Process cancellation and offer future booking

## Close
"We're looking forward to welcoming you. Safe travels!"`;

export const WAKE_UP_SYSTEM_PROMPT = `You are making a wake-up call for a guest at ${HOTEL_CONFIG.name}.

## Call Purpose
1. Wake the guest at their requested time
2. Provide brief weather and day information
3. Remind of any scheduled activities
4. Offer breakfast service

## Call Script
1. "Good morning! This is your ${HOTEL_CONFIG.name} wake-up call."
2. "The current time is [time]. Today's weather will be [weather]."
3. "You have [activity] scheduled for [time] today." (if applicable)
4. "Would you like breakfast delivered to your room or will you be joining us in the restaurant?"

## Style
- Gentle but clear voice
- Not too cheerful (it's early!)
- Efficient but warm`;

export const MID_STAY_SYSTEM_PROMPT = `You are calling to check on a guest during their stay at ${HOTEL_CONFIG.name}.

## Call Purpose
1. Ensure guest satisfaction
2. Identify and resolve any issues
3. Suggest amenities they haven't used
4. Offer service enhancements

## Call Script
1. "Hello [Guest Name], this is [Name] from Guest Services."
2. "I'm checking in to see how you're enjoying your stay with us."
3. "Is everything meeting your expectations?"
4. "Is there anything we can do to make your stay more comfortable?"

## Issue Detection
Listen for:
- Room problems (temperature, noise, cleanliness)
- Service issues (slow, unfriendly, incorrect)
- Missing amenities
- General dissatisfaction

## Issue Handling
- Apologize sincerely
- Offer immediate solution
- Log issue for follow-up
- Escalate if serious

## Upselling (only if guest is happy)
- Spa services
- Dining experiences
- Activities and excursions
- Room upgrades if available`;

export const PRE_CHECKOUT_SYSTEM_PROMPT = `You are calling a guest who is checking out today from ${HOTEL_CONFIG.name}.

## Call Purpose
1. Confirm checkout time
2. Offer late checkout if available
3. Arrange luggage storage if needed
4. Organize transportation
5. Address any final requests

## Call Script
1. "Good morning [Guest Name], this is [Name] from Guest Services."
2. "I see you're checking out today. Our checkout time is ${HOTEL_CONFIG.checkOutTime}."
3. "Would you need any additional time? We have late checkout available until 2 PM for $50."
4. "Do you need assistance with your luggage or transportation?"
5. "Was everything satisfactory during your stay?"

## Checkout Options
- Standard checkout: ${HOTEL_CONFIG.checkOutTime}
- Late checkout (2 PM): $50
- Extended late checkout (4 PM): $100
- Luggage storage: Complimentary for same-day pickup`;

export const POST_STAY_SYSTEM_PROMPT = `You are calling to thank a guest after their stay at ${HOTEL_CONFIG.name} and gather feedback.

## Call Purpose
1. Thank guest for their stay
2. Gather feedback and address any issues
3. Request online review
4. Offer returning guest discount
5. Update guest preferences

## Call Script
1. "Hello [Guest Name], this is [Name] from The Grand Luxe Hotel."
2. "I'm calling to thank you for staying with us and hope you arrived home safely."
3. "How was your overall experience with us?"
4. "Is there anything we could have done better?"
5. "We'd love if you could share your experience on Google or TripAdvisor."
6. "As a thank you, I'd like to offer you 15% off your next stay."

## Feedback Handling
- Record all feedback (positive and negative)
- Apologize and offer compensation for issues
- Update guest profile with preferences
- Flag VIP potential

## Review Request
"If you enjoyed your stay, we'd be grateful if you could leave us a review. It really helps other travelers find us."`;

export const PROACTIVE_CALL_CONFIGS = {
  preArrival: {
    systemPrompt: PRE_ARRIVAL_SYSTEM_PROMPT,
    maxDuration: 300,
    retryAttempts: 3,
    retryDelay: 3600000, // 1 hour
  },
  wakeUp: {
    systemPrompt: WAKE_UP_SYSTEM_PROMPT,
    maxDuration: 120,
    retryAttempts: 2,
    retryDelay: 300000, // 5 minutes
  },
  midStay: {
    systemPrompt: MID_STAY_SYSTEM_PROMPT,
    maxDuration: 300,
    retryAttempts: 2,
    retryDelay: 7200000, // 2 hours
  },
  preCheckout: {
    systemPrompt: PRE_CHECKOUT_SYSTEM_PROMPT,
    maxDuration: 240,
    retryAttempts: 2,
    retryDelay: 1800000, // 30 minutes
  },
  postStay: {
    systemPrompt: POST_STAY_SYSTEM_PROMPT,
    maxDuration: 300,
    retryAttempts: 3,
    retryDelay: 86400000, // 24 hours
  },
};

export const PROACTIVE_TOOLS: VapiTool[] = [
  {
    type: 'function',
    function: {
      name: 'updateReservation',
      description: 'Update reservation details based on guest requests',
      parameters: {
        type: 'object',
        properties: {
          reservationId: {
            type: 'string',
            description: 'Reservation ID to update',
          },
          updates: {
            type: 'object',
            properties: {
              checkInDate: { type: 'string' },
              checkOutDate: { type: 'string' },
              numberOfGuests: { type: 'number' },
              specialRequests: { type: 'string' },
              earlyCheckIn: { type: 'boolean' },
              lateCheckOut: { type: 'boolean' },
              arrivalTime: { type: 'string' },
              transportationNeeded: { type: 'boolean' },
            },
          },
        },
        required: ['reservationId', 'updates'],
      },
    },
    async: true,
  },
  {
    type: 'function',
    function: {
      name: 'logIssue',
      description: 'Log a guest issue or complaint for follow-up',
      parameters: {
        type: 'object',
        properties: {
          reservationId: {
            type: 'string',
            description: 'Reservation ID',
          },
          category: {
            type: 'string',
            description: 'Issue category',
            enum: ['room', 'service', 'noise', 'cleanliness', 'temperature', 'amenities', 'billing', 'staff', 'other'],
          },
          severity: {
            type: 'string',
            description: 'Issue severity',
            enum: ['low', 'medium', 'high', 'critical'],
          },
          description: {
            type: 'string',
            description: 'Detailed description of the issue',
          },
        },
        required: ['reservationId', 'category', 'severity', 'description'],
      },
    },
    async: true,
  },
  {
    type: 'function',
    function: {
      name: 'recordFeedback',
      description: 'Record guest feedback and satisfaction rating',
      parameters: {
        type: 'object',
        properties: {
          reservationId: {
            type: 'string',
            description: 'Reservation ID',
          },
          rating: {
            type: 'number',
            description: 'Overall satisfaction rating (1-5)',
          },
          feedback: {
            type: 'string',
            description: 'Detailed feedback from guest',
          },
          wouldRecommend: {
            type: 'boolean',
            description: 'Whether guest would recommend the hotel',
          },
          reviewRequested: {
            type: 'boolean',
            description: 'Whether online review was requested',
          },
          discountOffered: {
            type: 'boolean',
            description: 'Whether returning guest discount was offered',
          },
        },
        required: ['reservationId', 'rating'],
      },
    },
    async: true,
  },
  {
    type: 'function',
    function: {
      name: 'scheduleService',
      description: 'Schedule a service request for the guest',
      parameters: {
        type: 'object',
        properties: {
          reservationId: {
            type: 'string',
            description: 'Reservation ID',
          },
          serviceType: {
            type: 'string',
            description: 'Type of service',
            enum: ['housekeeping', 'room_service', 'spa', 'dining', 'transportation', 'wake_up', 'luggage'],
          },
          scheduledTime: {
            type: 'string',
            description: 'Scheduled time for service (ISO 8601)',
          },
          details: {
            type: 'string',
            description: 'Additional details about the request',
          },
        },
        required: ['reservationId', 'serviceType'],
      },
    },
    async: true,
  },
  {
    type: 'function',
    function: {
      name: 'getWeather',
      description: 'Get current weather information for the hotel location',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
    async: false,
  },
  {
    type: 'function',
    function: {
      name: 'notifyStaff',
      description: 'Send urgent notification to staff about guest issue',
      parameters: {
        type: 'object',
        properties: {
          roomNumber: {
            type: 'string',
            description: 'Guest room number',
          },
          urgency: {
            type: 'string',
            description: 'Urgency level',
            enum: ['normal', 'urgent', 'emergency'],
          },
          message: {
            type: 'string',
            description: 'Message to staff',
          },
        },
        required: ['roomNumber', 'urgency', 'message'],
      },
    },
    async: true,
  },
];
