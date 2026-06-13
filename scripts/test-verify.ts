import "dotenv/config";
import { prisma } from "../src/db/client";
import { verifyCredential } from "../src/verify";

async function main() {
  const before = await prisma.verificationEvent.count();

  // 1. VALID — practitioner with a currently-active license
  const valid = await verifyCredential("REG-TEST-0001");
  console.log("1. valid lookup   -", valid.result, "(" + valid.fullName + ")");

  // 2. NOT_FOUND — nobody matches
  const missing = await verifyCredential("REG-DOES-NOT-EXIST");
  console.log("2. missing lookup -", missing.result);

  // 3. by LICENSE ID — find practitioner via a license number
  const byLicense = await verifyCredential("TESTBODY-GP-2026-0001");
  console.log("3. by license id  -", byLicense.result, "(" + byLicense.fullName + ")");

  // 4. REVOKED — flip one license to revoked, confirm it overrides everything
  await prisma.license.update({
    where: { licenseId: "TESTBODY-GP-2026-0001" },
    data: { status: "revoked" },
  });
  const revoked = await verifyCredential("REG-TEST-0001");
  console.log("4. after revoke   -", revoked.result, "(should be 'revoked')");

  // reset it so reruns stay consistent
  await prisma.license.update({
    where: { licenseId: "TESTBODY-GP-2026-0001" },
    data: { status: "active" },
  });

  const after = await prisma.verificationEvent.count();
  console.log("\nevents logged this run:", after - before,);

  // show the audit trail
  const recent = await prisma.verificationEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: 4,
  });
  console.log("\naudit log (most recent 4):");
  for (const e of recent) {
    console.log(`  ${e.result.padEnd(10)} query="${e.queryValue}" region=${e.region}`);
  }

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
