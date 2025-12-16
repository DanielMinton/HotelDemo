import axios from 'axios';
import prisma from '../db/prisma';
import { KnowledgeQueryResult, SupportedLanguage } from '../vapi/types';

const TRIEVE_API_URL = 'https://api.trieve.ai/api';

interface TrieveSearchResult {
  chunk: {
    id: string;
    chunk_html: string;
    metadata?: Record<string, unknown>;
  };
  score: number;
}

interface TrieveSearchResponse {
  chunks: TrieveSearchResult[];
}

/**
 * Search the Trieve knowledge base for relevant hotel information
 */
export async function queryKnowledgeBase(
  query: string,
  options: {
    category?: string;
    language?: SupportedLanguage;
    maxResults?: number;
    scoreThreshold?: number;
  } = {}
): Promise<KnowledgeQueryResult[]> {
  const {
    category,
    language = 'en',
    maxResults = 5,
    scoreThreshold = 0.3,
  } = options;

  const apiKey = process.env.TRIEVE_API_KEY;
  const datasetId = process.env.TRIEVE_DATASET_ID;

  if (!apiKey || !datasetId) {
    console.warn('Trieve API not configured, falling back to database search');
    return searchDatabaseKnowledge(query, category, language, maxResults);
  }

  try {
    // Build filter for category and language
    const filters: Record<string, unknown> = {};
    if (category) {
      filters['category'] = { match: [category.toUpperCase()] };
    }
    if (language !== 'en') {
      filters['language'] = { match: [language] };
    }

    const response = await axios.post<TrieveSearchResponse>(
      `${TRIEVE_API_URL}/chunk/search`,
      {
        query,
        search_type: 'hybrid',
        page_size: maxResults,
        score_threshold: scoreThreshold,
        filters: Object.keys(filters).length > 0 ? { must: [filters] } : undefined,
      },
      {
        headers: {
          'Authorization': apiKey,
          'TR-Dataset': datasetId,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.chunks.map((result) => ({
      id: result.chunk.id,
      content: result.chunk.chunk_html,
      score: result.score,
      metadata: result.chunk.metadata,
    }));
  } catch (error) {
    console.error('Error searching Trieve knowledge base:', error);
    // Fallback to database search
    return searchDatabaseKnowledge(query, category, language, maxResults);
  }
}

/**
 * Fallback database search for knowledge documents
 */
async function searchDatabaseKnowledge(
  query: string,
  category?: string,
  language: SupportedLanguage = 'en',
  maxResults: number = 5
): Promise<KnowledgeQueryResult[]> {
  try {
    const searchTerms = query.toLowerCase().split(' ').filter(term => term.length > 2);

    const documents = await prisma.knowledgeDocument.findMany({
      where: {
        active: true,
        AND: [
          category ? { category: category.toUpperCase() as never } : {},
          { language },
          {
            OR: searchTerms.map(term => ({
              OR: [
                { title: { contains: term, mode: 'insensitive' as const } },
                { content: { contains: term, mode: 'insensitive' as const } },
              ],
            })),
          },
        ],
      },
      take: maxResults,
      orderBy: { updatedAt: 'desc' },
    });

    return documents.map((doc, index) => ({
      id: doc.id,
      content: doc.content,
      score: 1 - (index * 0.1), // Simple scoring based on order
      metadata: {
        category: doc.category,
        title: doc.title,
        language: doc.language,
      },
    }));
  } catch (error) {
    console.error('Error searching database knowledge:', error);
    return [];
  }
}

/**
 * Upload a document to the Trieve knowledge base
 */
export async function uploadToKnowledgeBase(document: {
  title: string;
  content: string;
  category: string;
  language?: string;
  metadata?: Record<string, unknown>;
}): Promise<string | null> {
  const apiKey = process.env.TRIEVE_API_KEY;
  const datasetId = process.env.TRIEVE_DATASET_ID;

  if (!apiKey || !datasetId) {
    console.warn('Trieve API not configured');
    return null;
  }

  try {
    const response = await axios.post(
      `${TRIEVE_API_URL}/chunk`,
      {
        chunk_html: document.content,
        metadata: {
          title: document.title,
          category: document.category.toUpperCase(),
          language: document.language || 'en',
          ...document.metadata,
        },
        upsert_by_tracking_id: true,
        tracking_id: `${document.category}-${document.title}`.toLowerCase().replace(/\s+/g, '-'),
      },
      {
        headers: {
          'Authorization': apiKey,
          'TR-Dataset': datasetId,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data.chunk_uuid || response.data.id;
  } catch (error) {
    console.error('Error uploading to knowledge base:', error);
    return null;
  }
}

/**
 * Seed the knowledge base with initial hotel information
 */
export async function seedKnowledgeBase(): Promise<void> {
  const hotelKnowledge = [
    // AMENITIES
    {
      category: 'AMENITIES',
      title: 'Swimming Pool',
      content: 'Our heated infinity pool is located on the rooftop with panoramic city views. Open daily from 6 AM to 10 PM. Pool towels are provided complimentary. The pool area includes a hot tub, poolside bar, and private cabanas available for reservation.',
    },
    {
      category: 'AMENITIES',
      title: 'Fitness Center',
      content: 'Our state-of-the-art fitness center is open 24/7 for hotel guests. Equipment includes treadmills, ellipticals, free weights, weight machines, yoga mats, and exercise balls. Personal training sessions can be arranged through the concierge.',
    },
    {
      category: 'AMENITIES',
      title: 'Business Center',
      content: 'The business center offers computers, printers, and meeting rooms. Open 24/7 with keycard access. Complimentary printing for up to 10 pages. Meeting rooms can be reserved through the front desk.',
    },
    // DINING
    {
      category: 'DINING',
      title: 'Skyview Restaurant',
      content: 'Our signature rooftop restaurant serves contemporary American cuisine with Mediterranean influences. Open for dinner from 6 PM to 11 PM. Reservations recommended. Dress code: smart casual. Features an extensive wine list and craft cocktails.',
    },
    {
      category: 'DINING',
      title: 'The Grand Café',
      content: 'All-day dining in our elegant lobby café. Breakfast buffet 6:30 AM - 10:30 AM ($35). Lunch 11:30 AM - 3 PM. Afternoon tea 3 PM - 5 PM. Light dinner menu until 9 PM. Room service available from this menu.',
    },
    {
      category: 'DINING',
      title: 'Pool Bar',
      content: 'Casual poolside dining and drinks. Serving light bites, salads, and tropical cocktails. Open 11 AM - 8 PM daily during pool hours. No reservation required.',
    },
    // SPA
    {
      category: 'SPA',
      title: 'Spa Services',
      content: 'The Grand Luxe Spa offers a full menu of treatments. Swedish Massage (60 min $150, 90 min $200). Deep Tissue Massage (60 min $175). Facial Treatments ($120-$250). Body Wraps ($175). Couples packages available. Book 24 hours in advance.',
    },
    {
      category: 'SPA',
      title: 'Spa Facilities',
      content: 'Spa facilities include steam room, sauna, relaxation lounge, and hydrotherapy pool. Available to spa guests from 8 AM - 8 PM. Day passes available for non-guests ($75). Robes and slippers provided.',
    },
    // POLICIES
    {
      category: 'POLICIES',
      title: 'Check-in and Check-out',
      content: 'Check-in time is 3:00 PM. Check-out time is 11:00 AM. Early check-in subject to availability ($50 for 12 PM check-in). Late check-out available until 2 PM ($50) or 4 PM ($100). Express check-out available via TV or mobile app.',
    },
    {
      category: 'POLICIES',
      title: 'Cancellation Policy',
      content: 'Free cancellation up to 48 hours before check-in date. Cancellations within 48 hours: one night charge. No-shows: full stay charged. Prepaid rates are non-refundable but may be modified up to 24 hours before arrival.',
    },
    {
      category: 'POLICIES',
      title: 'Pet Policy',
      content: 'We welcome dogs up to 50 lbs. Pet fee: $75 per night. Maximum 2 pets per room. Pets must be leashed in public areas. Dog walking and pet sitting services available. Pet amenities include bed, bowls, and treats.',
    },
    // LOCAL ATTRACTIONS
    {
      category: 'LOCAL_ATTRACTIONS',
      title: 'Nearby Attractions',
      content: 'Walking distance: Rodeo Drive (5 min), Beverly Hills Park (10 min), LACMA (15 min by car). We arrange tours to Hollywood, Santa Monica, Malibu, and wine country. Concierge can book tickets for shows, sports, and attractions.',
    },
    // TRANSPORTATION
    {
      category: 'TRANSPORTATION',
      title: 'Airport Transportation',
      content: 'LAX airport is 30-45 minutes away. Hotel car service: sedan $85, SUV $120 (one-way). Shared shuttle: $25 per person. We also arrange helicopter transfers ($495). Uber/Lyft pickup in front of hotel.',
    },
    {
      category: 'TRANSPORTATION',
      title: 'Valet Parking',
      content: 'Valet parking available 24/7. Daily rate: $55 for overnight guests. Hourly parking for restaurant guests: $15. Electric vehicle charging available. Self-parking not available.',
    },
    // ROOM FEATURES
    {
      category: 'ROOM_FEATURES',
      title: 'In-Room Amenities',
      content: 'All rooms feature: 55" smart TV with streaming apps, high-speed WiFi (complimentary), Nespresso machine, minibar, in-room safe, bathrobes and slippers, luxury bath amenities, iron and ironing board. Pillow menu available.',
    },
    // FAQ
    {
      category: 'FAQ',
      title: 'WiFi Access',
      content: 'Complimentary high-speed WiFi throughout the hotel. Connect to "GrandLuxe_Guest" network. No password required - just accept terms. Premium WiFi for video calls and streaming available for $15/day.',
    },
    {
      category: 'FAQ',
      title: 'Room Service',
      content: 'Room service available 24/7. Breakfast 6:30 AM - 11 AM. All-day dining menu 11 AM - 11 PM. Late night menu 11 PM - 6 AM. Delivery fee: $5. Gratuity not included.',
    },
  ];

  console.log('Seeding knowledge base with hotel information...');

  for (const doc of hotelKnowledge) {
    // Save to database
    await prisma.knowledgeDocument.upsert({
      where: {
        externalId: `${doc.category}-${doc.title}`.toLowerCase().replace(/\s+/g, '-'),
      },
      update: {
        content: doc.content,
        updatedAt: new Date(),
      },
      create: {
        externalId: `${doc.category}-${doc.title}`.toLowerCase().replace(/\s+/g, '-'),
        category: doc.category as never,
        title: doc.title,
        content: doc.content,
        language: 'en',
      },
    });

    // Upload to Trieve if configured
    await uploadToKnowledgeBase(doc);
  }

  console.log(`Seeded ${hotelKnowledge.length} knowledge documents`);
}

/**
 * Format knowledge results for assistant response
 */
export function formatKnowledgeResults(results: KnowledgeQueryResult[]): string {
  if (results.length === 0) {
    return 'I couldn\'t find specific information about that. Let me connect you with our staff who can help.';
  }

  return results
    .map(result => result.content)
    .join('\n\n');
}
