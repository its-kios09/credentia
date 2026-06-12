# Credentia

Real-time, cross-border verification of professional credentials, built on Amazon Aurora DSQL and Next.js.

Credentia lets hospitals, staffing agencies, regulators, and other employers confirm whether a professional's license is valid right now, anywhere in the world, and see revocations the instant they happen across every region.

Built for the H0 Hackathon (Track 2 - Monetizable B2B).

## The problem

There is no fast, trustworthy way to ask the only question that matters at the point of hiring: is this person actually licensed to do this, right now? Today the answer is slow, manual, and fragmented by country, which creates three failures:

- Fraud. Paper certificates and PDF scans are trivially forged, and whoever is checking rarely has a fast way to confirm against the issuing authority.
- Verification friction. Confirming a credential usually means emailing a board, waiting for a letter, or querying a single-country registry that does not talk to anyone else's.
- Revocation lag. When a regulator suspends or revokes a practitioner, that fact does not travel. The person revoked in one jurisdiction keeps working elsewhere because no one on the other side can see the revocation in real time.

Healthcare is the first vertical, but the same trust gap exists in finance, legal, aviation, engineering, and security licensing.

## Why Aurora DSQL

A credential verification system has two non-negotiable properties:

1. It must be always available. "Verification is down" at the moment someone is about to start a shift is a safety failure, not an inconvenience.
2. It must be strongly consistent across regions. A revocation has to be visible everywhere the instant it happens. With an eventually consistent store, a revoked practitioner reads back as valid in another region during the replication window - a correctness bug, not a tuning detail.

Aurora DSQL is built for exactly this trade: strong consistency across regions together with active-active multi-region availability. The database is not plumbing here; it is the component that makes the product safe. That is why DSQL is the deliberate choice over an eventually consistent alternative.

## Architecture

Clients (issuers, verifiers, public widget) call a Next.js application deployed on Vercel. The application talks to Aurora DSQL through a pg driver adapter, authenticating with short-lived IAM tokens minted per connection. The database is a multi-region active-active DSQL cluster; credential writes commit synchronously across regions.

See `docs/architecture.png` for the full diagram.

## Tech stack

- Next.js (frontend scaffolded with v0), deployed on Vercel
- Amazon Aurora DSQL - multi-region active-active cluster
- Prisma with `@prisma/adapter-pg` (pg driver adapter)
- IAM-token authentication via `@aws-sdk/dsql-signer`
- `aurora-dsql-prisma` CLI for DSQL-compatible migrations

## Data model

- `issuers` - regulators, professional boards, and universities, with country/jurisdiction.
- `practitioners` - the people holding credentials.
- `credentials` - a license, certification, or degree, with a status (active, suspended, revoked, expired) and a `version` column for optimistic concurrency.
- `verifiers` - the paying B2B customers, each with a hashed API key and a plan.
- `verification_events` - an append-only audit log of every check. It doubles as the per-verification billing meter.

## Aurora DSQL conventions

The data layer is designed around DSQL's distributed architecture:

- UUID primary keys, so random keys distribute writes across shards and reduce concurrency conflicts.
- No foreign keys. Referential integrity is enforced in the application layer; the migration tooling strips foreign-key DDL.
- A `version` column plus a retry wrapper on every write path, to handle optimistic concurrency conflicts with exponential backoff.
- Small transactions. DSQL limits transaction size (roughly a few thousand rows) and duration, so writes are kept small and batched where needed.
- No JSON column type. Flexible fields are stored as text and parsed in the application.

## Getting started

### Prerequisites

- Node.js 18 or later
- An AWS account with permission to create an Aurora DSQL cluster
- AWS credentials available through the default credential chain (environment variables or `~/.aws/credentials`)

### Setup

```bash
npm install
cp .env.example .env
# set DSQL_CLUSTER_ENDPOINT and AWS_REGION in .env
```

### Provision and migrate

1. Create an Aurora DSQL cluster in the AWS console and copy its endpoint into `.env`.
2. Generate the Prisma client:

   ```bash
   npm run prisma:generate
   ```

3. Apply the schema using the `aurora-dsql-prisma` CLI (see that tool's documentation for the exact migrate command).

### Verify the connection

```bash
npm run db:health
```

A successful run confirms that IAM-token authentication works, the driver adapter is wired, the schema migrated, and reads and writes round-trip correctly. Do not proceed until this passes.

## Project structure

```
credentia/
  prisma/
    schema.prisma        Prisma schema (DSQL compatible)
  src/
    db/
      signer.ts          mints short-lived IAM tokens
      client.ts          Prisma client over a pg pool with token auth
      withRetry.ts       optimistic-concurrency retry wrapper
      health.ts          connection and round-trip test gate
  .env.example
```

## Monetization

Verifiers pay per verification through a metered API, or on a subscription plan. Usage is derived directly from the append-only audit log, so billing and the audit trail share one source of truth.
