import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getDsqlToken } from "./signer";

const hostname = process.env.DSQL_CLUSTER_ENDPOINT!;

const pool = new Pool({
  host: hostname,
  port: 5432,
  user: "admin",
  database: "postgres",
  ssl: { rejectUnauthorized: true },
  password: async () => await getDsqlToken(),
  max: 10,
  idleTimeoutMillis: 30_000,
});

const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
