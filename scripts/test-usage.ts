import "dotenv/config";
import { prisma } from "../src/db/client";
import { createVerifier, authenticateKey } from "../src/apikey";
import { verifyCredential } from "../src/verify";
import { monthlyUsage } from "../src/usage";

async function main() {
  // a fresh verifier so the count starts clean
  const { verifier, apiKey } = await createVerifier("Test Clinic Ltd", "free", 100);
  console.log("verifier:", verifier.orgName, "| plan:", verifier.plan, "| quota:", verifier.monthlyQuota);

  // authenticate, then run two verifications AS this verifier
  const auth = await authenticateKey(apiKey);
  if (!auth) throw new Error("auth failed");

  await verifyCredential("REG-TEST-0001", auth.id);
  await verifyCredential("NOPE-404", auth.id); // even not_found counts as usage

  const used = await monthlyUsage(auth.id);
  console.log("\nverifications this month:", used, "of", auth.monthlyQuota);
  console.log("remaining:", auth.monthlyQuota - used);
  console.log("over quota:", used > auth.monthlyQuota);

  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
