import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

const SALT_BYTES = 16;
const KEY_BYTES = 64;
const ENCODED_PREFIX = "scrypt";

/**
 * Password hashing built on Node's own scrypt (§40 — no dependency for
 * something the standard library already does well). scrypt is memory-hard
 * and deliberately slow, which is what makes an offline attack against a
 * leaked hash expensive.
 */

/**
 * Minimum length only. Composition rules ("must contain a symbol") push
 * people toward predictable substitutions and are no longer recommended by
 * NIST; length is what actually matters.
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * scrypt's cost is a function of input length, so an unbounded password is
 * a denial-of-service vector. This bound is far above any real password.
 */
export const PASSWORD_MAX_LENGTH = 256;

/**
 * Hashes a password into a self-describing string:
 * `scrypt:<salt-hex>:<key-hex>`. Keeping the parameters inside the encoded
 * value means the hashing scheme can change later without invalidating
 * existing credentials.
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scrypt(password, salt, KEY_BYTES)) as Buffer;

  return `${ENCODED_PREFIX}:${salt.toString("hex")}:${derived.toString("hex")}`;
}

/**
 * Verifies a password against a stored hash.
 *
 * Comparison is constant-time: a plain `===` leaks how many leading bytes
 * matched via its timing, which is enough to reconstruct a hash byte by
 * byte. Returns false rather than throwing on a malformed stored value, so
 * a corrupted row denies access instead of surfacing a 500.
 */
export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const parts = storedHash.split(":");

  if (parts.length !== 3 || parts[0] !== ENCODED_PREFIX) {
    return false;
  }

  const [, saltHex, keyHex] = parts;

  let salt: Buffer;
  let expected: Buffer;

  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(keyHex, "hex");
  } catch {
    return false;
  }

  if (salt.length !== SALT_BYTES || expected.length !== KEY_BYTES) {
    return false;
  }

  const derived = (await scrypt(password, salt, KEY_BYTES)) as Buffer;

  return timingSafeEqual(derived, expected);
}
