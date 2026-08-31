import crypto from 'crypto';
import { cookies } from 'next/headers';

const COOKIE_NAME = 'traceguard_session';
const SESSION_DURATION = 2 * 60 * 60 * 1000; // 2 hours

export interface SessionPayload {
  userId: string;
  username: string;
  role: 'ADMIN' | 'ANALYST';
  name: string;
  expiresAt: string;
}

// Derive a 32-byte key from the session secret using SHA-256
function getEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET || 'fallback-super-secure-secret-key-32-chars-long';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a session payload string using AES-256-GCM
 */
export function encrypt(text: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 12-byte IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  // Format: iv_hex:auth_tag_hex:encrypted_hex
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Decrypts an encrypted session string
 */
export function decrypt(encryptedText: string): string | null {
  try {
    const parts = encryptedText.split(':');
    if (parts.length !== 3) return null;
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Session decryption failed:', error);
    return null;
  }
}

/**
 * Sets the session cookie with proper security attributes
 */
export async function setSession(payload: Omit<SessionPayload, 'expiresAt'>) {
  const expiresAt = new Date(Date.now() + SESSION_DURATION);
  const sessionData: SessionPayload = {
    ...payload,
    expiresAt: expiresAt.toISOString(),
  };
  
  const encryptedSession = encrypt(JSON.stringify(sessionData));
  
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, encryptedSession, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    expires: expiresAt,
    path: '/',
  });
}

/**
 * Retrieves and validates the current session from cookies
 */
export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(COOKIE_NAME);
  if (!sessionCookie || !sessionCookie.value) return null;
  
  const decrypted = decrypt(sessionCookie.value);
  if (!decrypted) return null;
  
  try {
    const payload = JSON.parse(decrypted) as SessionPayload;
    
    // Check expiration
    if (new Date(payload.expiresAt) < new Date()) {
      await clearSession();
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Destroys the session cookie
 */
export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}
