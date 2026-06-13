import "dotenv/config";
import { createVerifier, authenticateKey } from "../src/apikey";

async function main() {
  const { verifier, apiKey } = await createVerifier("Nairobi Hospital", "pro", 5000);
  console.log("created verifier:", verifier.orgName, verifier.id);
  console.log("plan:", verifier.plan, "quota:", verifier.monthlyQuota);
  console.log("RAW KEY (shown once):", apiKey);
  console.log("stored prefix:", verifier.keyPrefix);
  console.log("stored hash:", verifier.apiKeyHash.slice(0, 16) + "...");

  // auth: correct key resolves
  const ok = await authenticateKey(apiKey);
  console.log("\nauth with correct key ->", ok ? "OK (" + ok.orgName + ")" : "REJECTED");

  // auth: wrong key rejected
  const bad = await authenticateKey("sk_live_wrongwrongwrong");
  console.log("auth with wrong key   ->", bad ? "OK" : "REJECTED (correct)");

  await prisma.$disconnect?.();
  process.exit(0);
}

import { prisma } from "../src/db/client";
main().catch(async (e) => {
  console.error(e);
  process.exit(1);
});
