import { createHash, randomBytes, randomInt, scrypt, timingSafeEqual } from "node:crypto";

/**
 * Token acak dan hash (lihat D-006). Hanya untuk kode server.
 */

const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const TOKEN_LENGTH = 22; // 62^22 > 2^128
const PIN_KEY_LENGTH = 32;

/** Token 128 bit acak dalam base62, panjang tetap 22 karakter. */
export function generateToken(): string {
  let value = BigInt(`0x${randomBytes(16).toString("hex")}`);
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token = BASE62[Number(value % BigInt(62))] + token;
    value /= BigInt(62);
  }
  return token;
}

/** SHA-256 heksadesimal. Cukup untuk token berentropi tinggi, bukan untuk PIN. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generatePin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function derivePinKey(pin: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(pin, salt, PIN_KEY_LENGTH, (error, key) => (error ? reject(error) : resolve(key)));
  });
}

/** Hash PIN dengan salt acak. Format: `scrypt$<salt hex>$<kunci hex>`. */
export async function hashPin(pin: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derivePinKey(pin, salt);
  return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
}

export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  const [scheme, saltHex, keyHex] = stored.split("$");
  if (scheme !== "scrypt" || !saltHex || !keyHex) return false;
  const expected = Buffer.from(keyHex, "hex");
  if (expected.length !== PIN_KEY_LENGTH) return false;
  const actual = await derivePinKey(pin, Buffer.from(saltHex, "hex"));
  return timingSafeEqual(actual, expected);
}
