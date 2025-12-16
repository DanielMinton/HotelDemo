// ============================================
// VAPI SERVER MESSAGE TYPES
// ============================================

export type VapiServerMessageType =
  | 'assistant-request'
  | 'conversation-update'
  | 'end-of-call-report'
  | 'function-call'
  | 'hang'
  | 'model-output'
  | 'phone-call-control'
  | 'speech-update'
  | 'status-update'
  | 'tool-calls'
  | 'transcript'
  | 'transfer-destination-request'
  | 'user-interrupted'
  | 'voice-input';

export interface VapiServerMessage {
  message: {
    type: VapiServerMessageType;
    call?: VapiCall;
    customer?: VapiCustomer;
    timestamp?: string;
    artifact?: VapiArtifact;
    toolCallList?: VapiToolCall[];
    toolWithToolCallList?: VapiToolWithToolCall[];
    // Status update specific
    status?: string;
    endedReason?: string;
    // Transfer request specific
    destination?: VapiTransferDestination;
    // Function call specific (legacy)
    functionCall?: VapiFunctionCall;
    // Assistant request specific
    assistant?: VapiAssistantConfig;
  };
}

export interface VapiCall {
  id: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
  type: 'inboundPhoneCall' | 'outboundPhoneCall' | 'webCall';
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended';
  endedReason?: string;
  messages?: VapiMessage[];
  destination?: VapiTransferDestination;
  phoneCallProvider?: string;
  phoneCallProviderId?: string;
  phoneCallTransport?: string;
  phoneNumberId?: string;
  customer?: VapiCustomer;
  assistantId?: string;
  squadId?: string;
  artifact?: VapiArtifact;
  metadata?: Record<string, unknown>;
}

export interface VapiCustomer {
  number?: string;
  numberE164CheckEnabled?: boolean;
  name?: string;
  extension?: string;
}

export interface VapiArtifact {
  messages?: VapiMessage[];
  messagesOpenAIFormatted?: OpenAIMessage[];
  recordingUrl?: string;
  stereoRecordingUrl?: string;
  transcript?: string;
  videoRecordingUrl?: string;
}

export interface VapiMessage {
  role: 'assistant' | 'user' | 'system' | 'tool_call_result' | 'function_call' | 'function_result';
  message?: string;
  content?: string;
  time?: number;
  endTime?: number;
  secondsFromStart?: number;
  duration?: number;
  toolCalls?: VapiToolCall[];
  toolCallResult?: ToolCallResult;
  name?: string;
  result?: string;
}

export interface OpenAIMessage {
  role: 'assistant' | 'user' | 'system' | 'tool';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// ============================================
// TOOL CALL TYPES
// ============================================

export interface VapiToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string | Record<string, unknown>;
  };
}

export interface VapiToolWithToolCall {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
  async?: boolean;
  messages?: ToolMessages;
  toolCall: VapiToolCall;
}

export interface ToolCallResult {
  name: string;
  toolCallId: string;
  result: string;
  error?: string;
}

export interface ToolMessages {
  requestStart?: ToolMessage;
  requestComplete?: ToolMessage;
  requestFailed?: ToolMessage;
  requestDelayed?: ToolMessage;
}

export interface ToolMessage {
  type: 'request-start' | 'request-complete' | 'request-failed' | 'request-response-delayed';
  content?: string;
  role?: 'assistant' | 'system';
}

// ============================================
// FUNCTION CALL TYPES (LEGACY)
// ============================================

export interface VapiFunctionCall {
  name: string;
  parameters: Record<string, unknown>;
}

// ============================================
// ASSISTANT CONFIGURATION
// ============================================

export interface VapiAssistantConfig {
  name?: string;
  firstMessage?: string;
  firstMessageMode?: 'assistant-speaks-first' | 'assistant-waits-for-user' | 'assistant-speaks-first-with-model-generated-message';
  hipaaEnabled?: boolean;
  clientMessages?: string[];
  serverMessages?: string[];
  silenceTimeoutSeconds?: number;
  maxDurationSeconds?: number;
  backgroundSound?: 'off' | 'office';
  backchannelingEnabled?: boolean;
  backgroundDenoisingEnabled?: boolean;
  modelOutputInMessagesEnabled?: boolean;
  transportConfigurations?: TransportConfiguration[];
  voicemailDetection?: VoicemailDetection;
  voicemailMessage?: string;
  endCallMessage?: string;
  endCallPhrases?: string[];

  // Model configuration
  model?: VapiModel;

  // Voice configuration
  voice?: VapiVoice;

  // Transcriber configuration
  transcriber?: VapiTranscriber;

  // Tools
  tools?: VapiTool[];

  // Metadata
  metadata?: Record<string, unknown>;

  // Server
  server?: VapiServer;
}

export interface TransportConfiguration {
  provider: string;
  timeout?: number;
  record?: boolean;
  recordingChannels?: 'mono' | 'dual';
}

export interface VoicemailDetection {
  enabled: boolean;
  machineDetectionTimeout?: number;
  machineDetectionSpeechThreshold?: number;
  machineDetectionSpeechEndThreshold?: number;
  machineDetectionSilenceTimeout?: number;
}

// ============================================
// MODEL CONFIGURATION
// ============================================

export interface VapiModel {
  provider: 'openai' | 'anthropic' | 'together-ai' | 'anyscale' | 'openrouter' | 'perplexity-ai' | 'deepinfra' | 'groq' | 'custom-llm';
  model: string;
  temperature?: number;
  maxTokens?: number;
  emotionRecognitionEnabled?: boolean;
  numFastTurns?: number;
  messages?: SystemMessage[];
  tools?: VapiTool[];
  toolIds?: string[];
  knowledgeBase?: KnowledgeBase;
  knowledgeBaseId?: string;
}

export interface SystemMessage {
  role: 'system' | 'assistant' | 'user';
  content: string;
}

export interface KnowledgeBase {
  provider: 'trieve';
  topK?: number;
  fileIds?: string[];
}

// ============================================
// VOICE CONFIGURATION
// ============================================

export interface VapiVoice {
  provider: 'azure' | 'cartesia' | 'deepgram' | 'eleven-labs' | 'lmnt' | 'neets' | 'openai' | 'playht' | 'rime-ai';
  voiceId: string;
  speed?: number;
  fillerInjectionEnabled?: boolean;
  chunkPlan?: ChunkPlan;
  model?: string;
  language?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

export interface ChunkPlan {
  enabled: boolean;
  minCharacters?: number;
  punctuationBoundaries?: string[];
  formatPlan?: FormatPlan;
}

export interface FormatPlan {
  enabled: boolean;
  numberToDigitsCutoff?: number;
}

// ============================================
// TRANSCRIBER CONFIGURATION
// ============================================

export interface VapiTranscriber {
  provider: 'deepgram' | 'gladia' | 'talkscriber';
  model?: string;
  language?: string;
  smartFormat?: boolean;
  keywords?: string[];
  endpointing?: number;
}

// ============================================
// TOOL CONFIGURATION
// ============================================

export interface VapiTool {
  type: 'function' | 'ghl' | 'make' | 'transferCall' | 'dtmf' | 'endCall' | 'voicemail' | 'output';
  function?: ToolFunction;
  async?: boolean;
  messages?: ToolMessages;
  server?: VapiServer;
  destinations?: VapiTransferDestination[];
}

export interface ToolFunction {
  name: string;
  description: string;
  parameters: ToolParameters;
}

export interface ToolParameters {
  type: 'object';
  properties: Record<string, ToolProperty>;
  required?: string[];
}

export interface ToolProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object';
  description?: string;
  enum?: string[];
  items?: ToolProperty;
  properties?: Record<string, ToolProperty>;
}

// ============================================
// SERVER CONFIGURATION
// ============================================

export interface VapiServer {
  url: string;
  timeoutSeconds?: number;
  secret?: string;
  headers?: Record<string, string>;
}

// ============================================
// TRANSFER DESTINATION
// ============================================

export interface VapiTransferDestination {
  type: 'assistant' | 'step' | 'number' | 'sip';
  assistantName?: string;
  message?: string;
  description?: string;
  number?: string;
  extension?: string;
  callerId?: string;
  transferPlan?: TransferPlan;
  sipUri?: string;
}

export interface TransferPlan {
  mode: 'swap-system-message-in-history' | 'blind-transfer' | 'blind-transfer-add-summary-to-sip-header' | 'warm-transfer-say-message' | 'warm-transfer-say-summary' | 'warm-transfer-wait-for-operator-to-speak-first-and-then-say-message' | 'warm-transfer-wait-for-operator-to-speak-first-and-then-say-summary';
  message?: string;
  summaryPlan?: SummaryPlan;
}

export interface SummaryPlan {
  enabled: boolean;
  messages?: SystemMessage[];
}

// ============================================
// WEBHOOK RESPONSE TYPES
// ============================================

export interface WebhookResponse {
  results?: ToolCallResponse[];
  assistant?: VapiAssistantConfig;
  destination?: VapiTransferDestination;
  error?: string;
}

export interface ToolCallResponse {
  toolCallId: string;
  result: string;
  error?: string;
}

// ============================================
// SQUAD CONFIGURATION
// ============================================

export interface VapiSquadConfig {
  name: string;
  members: SquadMember[];
  membersOverrides?: Partial<VapiAssistantConfig>;
}

export interface SquadMember {
  assistant?: VapiAssistantConfig;
  assistantId?: string;
  assistantOverrides?: Partial<VapiAssistantConfig>;
  assistantDestinations?: VapiTransferDestination[];
}

// ============================================
// HOTEL-SPECIFIC TYPES
// ============================================

export type SupportedLanguage =
  | 'en' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ru'
  | 'zh' | 'ja' | 'ko' | 'ar' | 'hi' | 'nl' | 'sv' | 'no';

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, string> = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
  ko: '한국어',
  ar: 'العربية',
  hi: 'हिन्दी',
  nl: 'Nederlands',
  sv: 'Svenska',
  no: 'Norsk',
};

export const LANGUAGE_GREETINGS: Record<SupportedLanguage, string> = {
  en: 'Hello and welcome to The Grand Luxe Hotel. How may I assist you today?',
  es: 'Hola y bienvenido al Hotel Grand Luxe. ¿Cómo puedo ayudarle hoy?',
  fr: 'Bonjour et bienvenue au Grand Luxe Hotel. Comment puis-je vous aider aujourd\'hui?',
  de: 'Guten Tag und willkommen im Grand Luxe Hotel. Wie kann ich Ihnen heute helfen?',
  it: 'Buongiorno e benvenuto al Grand Luxe Hotel. Come posso assisterla oggi?',
  pt: 'Olá e bem-vindo ao Grand Luxe Hotel. Como posso ajudá-lo hoje?',
  ru: 'Здравствуйте и добро пожаловать в Grand Luxe Hotel. Чем могу помочь?',
  zh: '您好，欢迎来到豪华大酒店。今天我能为您做什么？',
  ja: 'こんにちは、グランドラックスホテルへようこそ。本日はどのようなご用件でしょうか？',
  ko: '안녕하세요, 그랜드 럭스 호텔에 오신 것을 환영합니다. 무엇을 도와드릴까요?',
  ar: 'مرحباً بكم في فندق جراند لوكس. كيف يمكنني مساعدتك اليوم؟',
  hi: 'नमस्ते और ग्रैंड लक्स होटल में आपका स्वागत है। आज मैं आपकी कैसे सहायता कर सकता हूं?',
  nl: 'Hallo en welkom bij het Grand Luxe Hotel. Hoe kan ik u vandaag van dienst zijn?',
  sv: 'Hej och välkommen till Grand Luxe Hotel. Hur kan jag hjälpa dig idag?',
  no: 'Hei og velkommen til Grand Luxe Hotel. Hvordan kan jeg hjelpe deg i dag?',
};

export interface HotelService {
  id: string;
  name: string;
  category: 'spa' | 'dining' | 'activities' | 'transportation' | 'housekeeping' | 'concierge';
  description: string;
  price?: number;
  duration?: number;
  available: boolean;
  operatingHours?: {
    start: string;
    end: string;
  };
}

export interface ServiceAvailability {
  serviceId: string;
  serviceName: string;
  date: string;
  availableSlots: TimeSlot[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
  available: boolean;
  price?: number;
}

export interface GuestSentiment {
  score: number; // -1 to 1
  indicators: string[];
  isVip: boolean;
  notes?: string;
}

export interface KnowledgeQueryResult {
  id: string;
  content: string;
  score: number;
  metadata?: Record<string, unknown>;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface ConversationAnalytics {
  callId: string;
  guestName?: string;
  guestPhone?: string;
  roomNumber?: string;
  language: SupportedLanguage;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  status: 'in-progress' | 'completed' | 'failed' | 'escalated';
  transcript?: string;
  summary?: string;
  sentiment?: number;
  toolsUsed: string[];
  knowledgeQueriesCount: number;
  cost?: number;
  resolutionStatus: 'resolved' | 'escalated' | 'pending';
  escalated: boolean;
  metadata?: Record<string, unknown>;
}

// ============================================
// OUTBOUND CALL TYPES (Template 3)
// ============================================

export interface OutboundCallRequest {
  phoneNumberId: string;
  customer: {
    number: string;
    name?: string;
  };
  assistant?: VapiAssistantConfig;
  assistantId?: string;
  assistantOverrides?: Partial<VapiAssistantConfig>;
  squad?: VapiSquadConfig;
  squadId?: string;
}

export interface OutboundCallResponse {
  id: string;
  orgId: string;
  createdAt: string;
  updatedAt: string;
  type: 'outboundPhoneCall';
  status: 'queued' | 'ringing' | 'in-progress' | 'forwarding' | 'ended';
  phoneNumberId: string;
  customer: VapiCustomer;
}

// ============================================
// PMS INTEGRATION TYPES (Template 3)
// ============================================

export interface PMSGuest {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  preferredLanguage?: string;
  vipStatus?: boolean;
}

export interface PMSReservation {
  id: string;
  guestId: string;
  roomNumber?: string;
  roomType: string;
  checkInDate: string;
  checkOutDate: string;
  status: 'confirmed' | 'checked-in' | 'checked-out' | 'cancelled';
  numberOfGuests: number;
  specialRequests?: string;
}

export interface PMSEvent {
  type: 'reservation.created' | 'reservation.updated' | 'guest.checked-in' | 'guest.checked-out' | 'wake-up.requested' | 'service.requested';
  timestamp: string;
  data: PMSReservation | PMSGuest | ServiceRequestData;
}

export interface ServiceRequestData {
  reservationId: string;
  roomNumber: string;
  requestType: string;
  details?: string;
  scheduledTime?: string;
}
