import "dotenv/config";
import { prisma } from "../src/db/client";

async function main() {
  // insert two regulators across jurisdictions
  for (const r of [
    { code: "KMPDC", name: "Kenya Medical Practitioners & Dentists Council", country: "KE" },
    { code: "GMC", name: "General Medical Council", country: "GB" },
  ]) {
    await prisma.regulatoryBody.upsert({
      where: { code: r.code },
      update: {},
      create: r,
    });
  }
  console.log("upserted 2 regulators");

  const all = await prisma.regulatoryBody.findMany({ orderBy: { code: "asc" } });
  console.log("\nregulators:");
  for (const r of all) {
    console.log(`  ${r.code.padEnd(8)} ${r.country}  ${r.name}`);
  }
  console.log("\ntotal regulators:", await prisma.regulatoryBody.count());

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
