/**
 * PayDuka PoS – Secure PIN Authentication
 * PBKDF2-SHA256 via Web Crypto API (works fully offline)
 */

const PBKDF2_ITERATIONS = 100_000;
const SALT_LENGTH = 16;
const KEY_LENGTH = 32;

export function generateSalt(): string {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  return btoa(String.fromCharCode(...salt));
}

export async function hashPin(pin: string, saltBase64: string): Promise<string> {
  if (!pin || pin.length < 4) throw new Error("PIN must be at least 4 digits");

  const encoder = new TextEncoder();
  const salt = Uint8Array.from(atob(saltBase64), (c) => c.charCodeAt(0));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt,
      iterations: PBKDF2_ITERATIONS,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8
  );

  return btoa(String.fromCharCode(...new Uint8Array(derived)));
}

/** Format stored in DB: salt$iterations$hash */
export async function createPinHash(pin: string): Promise<string> {
  const salt = generateSalt();
  const hash = await hashPin(pin, salt);
  return `${salt}\[ {PBKDF2_ITERATIONS} \]{hash}`;
}

export async function verifyPinHash(pin: string, stored: string): Promise<boolean> {
  if (!stored || !stored.includes("$")) return false;

  const [salt, iterStr, expectedHash] = stored.split("$");
  const iterations = parseInt(iterStr, 10) || PBKDF2_ITERATIONS;

  const encoder = new TextEncoder();
  const saltBytes = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0));

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    KEY_LENGTH * 8
  );

  const actualHash = btoa(String.fromCharCode(...new Uint8Array(derived)));

  // Constant-time comparison
  if (actualHash.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actualHash.length; i++) {
    diff |= actualHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}

// ── Progressive lockout ────────────────────────────────────────────────────
const lockouts = new Map<string, { fails: number; lockedUntil: number }>();

export function recordFailedAttempt(cashierId: string) {
  const now = Date.now();
  const entry = lockouts.get(cashierId) || { fails: 0, lockedUntil: 0 };

  if (now < entry.lockedUntil) {
    return {
      locked: true,
      remainingMs: entry.lockedUntil - now,
      fails: entry.fails,
    };
  }

  entry.fails += 1;

  if (entry.fails >= 10) entry.lockedUntil = now + 10 * 60 * 1000;
  else if (entry.fails >= 8) entry.lockedUntil = now + 2 * 60 * 1000;
  else if (entry.fails >= 5) entry.lockedUntil = now + 30 * 1000;

  lockouts.set(cashierId, entry);

  return {
    locked: now < entry.lockedUntil,
    remainingMs: Math.max(0, entry.lockedUntil - now),
    fails: entry.fails,
  };
}

export function clearFailedAttempts(cashierId: string) {
  lockouts.delete(cashierId);
}

export function isLocked(cashierId: string) {
  const entry = lockouts.get(cashierId);
  if (!entry) return { locked: false, remainingMs: 0, fails: 0 };
  const remaining = entry.lockedUntil - Date.now();
  return {
    locked: remaining > 0,
    remainingMs: Math.max(0, remaining),
    fails: entry.fails,
  };
}
