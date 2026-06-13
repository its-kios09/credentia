import "dotenv/config";
import { prisma } from "../src/db/client";

async function main() {
  const p = await prisma.practitioner.create({
    data: {
      puid: "PUID-TEST-0001",
      registrationId: "REG-TEST-0001",
      externalReferenceId: "TEST-REF-0001",
      firstName: "Jane",
      middleName: "Test",
      lastName: "Doe",
      fullName: "Dr Jane Test Doe",
      gender: "Female",
      licensingBody: "TESTBODY",
      specialty: "GENERAL PRACTICE",
      isActive: true,
    },
  });
  console.log("created practitioner:", p.id);

  const found = await prisma.practitioner.findUnique({
    where: { registrationId: "REG-TEST-0001" },
  });
  console.log("looked up:", found?.fullName);
  console.log("total:", await prisma.practitioner.count());

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
