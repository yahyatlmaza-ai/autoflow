/**
 * server/totp.ts — TOTP 2FA (RFC 6238) — no external dependencies
 */
import crypto from 'crypto';

function base32Decode(input: string): Buffer {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const str   = input.toUpperCase().replace(/=+$/, '');
  let bits = 0, value = 0;
  const output: number[] = [];
  for (let i = 0; i < str.length; i++) {
    value = (value << 5) | chars.indexOf(str[i]);
    bits += 5;
    if (bits >= 8) { bits -= 8; output.push((value >> bits) & 0xff); }
  }
  return Buffer.from(output);
}

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const buf = Buffer.alloc(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) { buf[i] = c & 0xff; c = Math.floor(c / 256); }
  const hmac   = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const code   = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, '0');
}

export function generateTOTP(secret: string): string {
  return hotp(secret, Math.floor(Date.now() / 30000));
}

export function verifyTOTP(secret: string, token: string, window = 1): boolean {
  const t = Math.floor(Date.now() / 30000);
  for (let i = -window; i <= window; i++) {
    if (hotp(secret, t + i) === token) return true;
  }
  return false;
}

export function generateSecret(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const bytes = crypto.randomBytes(20);
  let secret  = '';
  for (let i = 0; i < bytes.length; i++) secret += chars[bytes[i] % 32];
  return secret;
}

export function getTOTPUri(secret: string, email: string, issuer = 'autoflow'): string {
  const iss = encodeURIComponent(issuer);
  const usr = encodeURIComponent(email);
  return `otpauth://totp/${iss}:${usr}?secret=${secret}&issuer=${iss}&algorithm=SHA1&digits=6&period=30`;
}
