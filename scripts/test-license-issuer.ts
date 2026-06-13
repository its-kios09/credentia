import "dotenv/config";
import { prisma } from "../src/db/client";

async function main() {
  const p = await prisma.practitioner.findUnique({
    where: { registrationId: "REG-TEST-0001" },
  });
  if (!p) throw new Error("Run test-practitioner.ts first.");

  const updated = await prisma.license.updateMany({
    where: { practitionerId: p.id },
    data: { issuerId: "KMPDC" },
  });
  console.log("linked", updated.count, "licenses to issuer KMPDC");

  const license = await prisma.license.findFirst({
    where: { practitionerId: p.id },
  });
const regulator = license?.issuerId
  ? await prisma.regulatoryBody.findUnique({
      where: { code: license.issuerId },
    })
  : null;

  console.log("\nlicense:", license?.licenseId);
  console.log("attested by:", regulator?.name, `(${regulator?.country})`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
