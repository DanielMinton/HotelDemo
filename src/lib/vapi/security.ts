import crypto from 'crypto';

/**
 * Verify VAPI webhook signature using HMAC-SHA256
 */
export function verifyWebhookSignature(
  body: string,
  signature: string | null,
  secret?: string
): boolean {
  if (!signature) {
    console.warn('No signature provided in webhook request');
    return false;
  }

  const webhookSecret = secret || process.env.VAPI_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.warn('No webhook secret configured');
    // In development, allow unsigned requests
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(body)
      .digest('hex');

    // Use timing-safe comparison to prevent timing attacks
    const signatureBuffer = Buffer.from(signature, 'utf8');
    const expectedBuffer = Buffer.from(expectedSignature, 'utf8');

    if (signatureBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Verify bearer token authentication
 */
export function verifyBearerToken(
  authHeader: string | null,
  expectedToken?: string
): boolean {
  if (!authHeader) {
    return false;
  }

  const token = authHeader.replace('Bearer ', '');
  const expected = expectedToken || process.env.VAPI_WEBHOOK_SECRET;

  if (!expected) {
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }

  try {
    const tokenBuffer = Buffer.from(token, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    if (tokenBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(tokenBuffer, expectedBuffer);
  } catch (error) {
    console.error('Error verifying bearer token:', error);
    return false;
  }
}

/**
 * Verify cron job secret (for scheduled tasks)
 */
export function verifyCronSecret(
  secret: string | null | undefined,
  expectedSecret?: string
): boolean {
  if (!secret) {
    return false;
  }

  const expected = expectedSecret || process.env.CRON_SECRET;

  if (!expected) {
    if (process.env.NODE_ENV === 'development') {
      return true;
    }
    return false;
  }

  try {
    const secretBuffer = Buffer.from(secret, 'utf8');
    const expectedBuffer = Buffer.from(expected, 'utf8');

    if (secretBuffer.length !== expectedBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(secretBuffer, expectedBuffer);
  } catch (error) {
    console.error('Error verifying cron secret:', error);
    return false;
  }
}

/**
 * Generate a secure random string for use as secrets
 */
export function generateSecret(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data for storage (one-way)
 */
export function hashData(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Encrypt sensitive data for storage (reversible with key)
 */
export function encryptData(data: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('No encryption key configured');
  }

  const iv = crypto.randomBytes(16);
  const keyBuffer = crypto.scryptSync(encryptionKey, 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuffer, iv);

  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypt previously encrypted data
 */
export function decryptData(encryptedData: string, key?: string): string {
  const encryptionKey = key || process.env.ENCRYPTION_KEY;

  if (!encryptionKey) {
    throw new Error('No encryption key configured');
  }

  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const keyBuffer = crypto.scryptSync(encryptionKey, 'salt', 32);

  const decipher = crypto.createDecipheriv('aes-256-gcm', keyBuffer, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Sanitize phone numbers to prevent injection
 */
export function sanitizePhoneNumber(phone: string): string {
  // Remove all non-numeric characters except + at the start
  const sanitized = phone.replace(/[^\d+]/g, '');

  // Ensure + is only at the start if present
  if (sanitized.includes('+') && !sanitized.startsWith('+')) {
    return sanitized.replace(/\+/g, '');
  }

  return sanitized;
}

/**
 * Validate E.164 phone number format
 */
export function isValidE164(phone: string): boolean {
  const e164Regex = /^\+[1-9]\d{1,14}$/;
  return e164Regex.test(phone);
}

/**
 * Rate limiter helper for API endpoints
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private windowMs: number;
  private maxRequests: number;

  constructor(windowMs: number = 60000, maxRequests: number = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get existing requests for this identifier
    let requests = this.requests.get(identifier) || [];

    // Filter out old requests
    requests = requests.filter(time => time > windowStart);

    // Check if under limit
    if (requests.length >= this.maxRequests) {
      return false;
    }

    // Add current request
    requests.push(now);
    this.requests.set(identifier, requests);

    return true;
  }

  reset(identifier: string): void {
    this.requests.delete(identifier);
  }

  cleanup(): void {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    for (const [key, requests] of this.requests.entries()) {
      const filtered = requests.filter(time => time > windowStart);
      if (filtered.length === 0) {
        this.requests.delete(key);
      } else {
        this.requests.set(key, filtered);
      }
    }
  }
}

// Global rate limiter instance
export const globalRateLimiter = new RateLimiter();
