import { prisma } from "./db/client";

/** Verifications used this calendar month by a verifier (the billing meter). */
export async function monthlyUsage(verifierId: string): Promise<number> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  return prisma.verificationEvent.count({
    where: { verifierId, createdAt: { gte: start } },
  });
}
