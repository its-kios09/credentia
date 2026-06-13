import { prisma } from "./db/client";

export type VerifyResult =
  | "valid"
  | "expired"
  | "revoked"
  | "suspended"
  | "not_found";

const REGION = process.env.AWS_REGION ?? null;

/**
 * Verify a practitioner by registration number or license id.
 * Computes the real status from license data, resolves the attesting
 * regulator, logs an append-only VerificationEvent, and returns the outcome.
 */
export async function verifyCredential(
  queryValue: string,
  verifierId: string | null = null
): Promise<{
  result: VerifyResult;
  practitionerId: string | null;
  fullName: string | null;
  licenseId: string | null;
  attestedBy: { code: string; name: string; country: string } | null;
}> {
  let practitioner = await prisma.practitioner.findUnique({
    where: { registrationId: queryValue },
  });

  let matchedLicenseId: string | null = null;

  if (!practitioner) {
    const license = await prisma.license.findUnique({
      where: { licenseId: queryValue },
    });
    if (license) {
      matchedLicenseId = license.licenseId;
      practitioner = await prisma.practitioner.findUnique({
        where: { id: license.practitionerId },
      });
    }
  }

  let result: VerifyResult;

  if (!practitioner) {
    result = "not_found";
  } else {
    const licenses = await prisma.license.findMany({
      where: { practitionerId: practitioner.id },
    });

    const now = new Date();
    const has = (s: string) => licenses.some((l) => l.status === s);
    const hasValid = licenses.some(
      (l) =>
        l.status === "active" &&
        l.licenseStart <= now &&
        l.licenseEnd >= now
    );

    if (has("revoked")) result = "revoked";
    else if (has("suspended")) result = "suspended";
    else if (hasValid) result = "valid";
    else result = "expired";
  }

  // resolve the attesting regulator from the practitioner's licenses
  let attestedBy:
    | { code: string; name: string; country: string }
    | null = null;
  if (practitioner) {
    const lic = await prisma.license.findFirst({
      where: { practitionerId: practitioner.id, issuerId: { not: null } },
    });
    if (lic?.issuerId) {
      const reg = await prisma.regulatoryBody.findUnique({
        where: { code: lic.issuerId },
      });
      if (reg) {
        attestedBy = { code: reg.code, name: reg.name, country: reg.country };
      }
    }
  }

  await prisma.verificationEvent.create({
    data: {
      practitionerId: practitioner?.id ?? null,
      licenseId: matchedLicenseId,
      queryValue,
      result,
      region: REGION,
      verifierId,
    },
  });

  return {
    result,
    practitionerId: practitioner?.id ?? null,
    fullName: practitioner?.fullName ?? null,
    licenseId: matchedLicenseId,
    attestedBy,
  };
}
