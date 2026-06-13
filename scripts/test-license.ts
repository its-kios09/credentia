import "dotenv/config";
import { prisma } from "../src/db/client";

async function main() {
  // 1. find the practitioner we inserted earlier (app-side "join" key)
  const practitioner = await prisma.practitioner.findUnique({
    where: { registrationId: "REG-TEST-0001" },
  });
  if (!practitioner) throw new Error("Run test-practitioner.ts first.");
  console.log("practitioner:", practitioner.fullName, practitioner.id);

  // 2. insert three licenses linked by practitionerId (synthetic data)
  const licenses = [
    {
      licenseId: "TESTBODY-GP-2026-0001",
      externalReferenceId: "GP/2026/0001",
      licenseType: "General Practice",
      licenseStart: new Date("2025-11-19"),
      licenseEnd: new Date("2026-12-31"),
      status: "active",
    },
    {
      licenseId: "TESTBODY-GP-2025-0002",
      externalReferenceId: "GP/2025/0002",
      licenseType: "General Practice",
      licenseStart: new Date("2024-12-20"),
      licenseEnd: new Date("2026-01-06"),
      status: "expired",
    },
    {
      licenseId: "TESTBODY-ANN-2024-0003",
      externalReferenceId: "GP/2024/0003",
      licenseType: "Annual",
      licenseStart: new Date("2023-12-13"),
      licenseEnd: new Date("2024-12-31"),
      status: "expired",
    },
  ];

  for (const l of licenses) {
    await prisma.license.create({
      data: { practitionerId: practitioner.id, ...l },
    });
  }
  console.log("inserted", licenses.length, "licenses");

  // 3. read them back for this practitioner (app-side one-to-many)
  const found = await prisma.license.findMany({
    where: { practitionerId: practitioner.id },
    orderBy: { licenseEnd: "desc" },
  });
  console.log("\nlicenses for", practitioner.fullName + ":");
  for (const l of found) {
    console.log(`  ${l.licenseId}  ${l.licenseType}  ${l.status}  ends ${l.licenseEnd.toISOString().slice(0, 10)}`);
  }
  console.log("\ntotal licenses:", await prisma.license.count());

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
