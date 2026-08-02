import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("base64url");
  const derived = (await scrypt(password, salt, KEY_LENGTH)) as Buffer;
  return `scrypt$${salt}$${derived.toString("base64url")}`;
}

export async function verifyPasswordHash(input: {
  password: string;
  passwordHash: string;
}): Promise<boolean> {
  const [algorithm, salt, expectedKey] = input.passwordHash.split("$");

  if (algorithm !== "scrypt" || !salt || !expectedKey) {
    return false;
  }

  const actual = (await scrypt(input.password, salt, KEY_LENGTH)) as Buffer;
  const expected = Buffer.from(expectedKey, "base64url");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
