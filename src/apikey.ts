import { createHash, randomBytes } from "crypto";
import { prisma } from "./db/client";

// SHA-256 hash of the raw key — only the hash is ever stored.
export function hashKey(raw: string): string {
  return createHash("sha256").update(raw).digest("hex");
}

/**
 * Create a new verifier account and return the RAW key ONCE.
 * After this, only the hash and prefix live in the DB.
 */
export async function createVerifier(
  orgName: string,
  plan: string = "free",
  monthlyQuota: number = 100
) {
  const raw = "sk_live_" + randomBytes(24).toString("hex");
  const verifier = await prisma.verifier.create({
    data: {
      orgName,
      apiKeyHash: hashKey(raw),
      keyPrefix: raw.slice(0, 16),
      plan,
      monthlyQuota,
    },
  });
  return { verifier, apiKey: raw }; // raw key shown once, never stored
}

/**
 * Resolve an incoming API key to its verifier (or null).
 * Hashes the presented key and matches against the stored hash.
 */
export async function authenticateKey(rawKey: string | null) {
  if (!rawKey) return null;
  const verifier = await prisma.verifier.findUnique({
    where: { apiKeyHash: hashKey(rawKey) },
  });
  if (!verifier || !verifier.active) return null;
  return verifier;
}
