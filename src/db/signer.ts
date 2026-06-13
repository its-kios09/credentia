import { DsqlSigner } from "@aws-sdk/dsql-signer";

const region = process.env.AWS_REGION;
const hostname = process.env.DSQL_CLUSTER_ENDPOINT;

if (!region || !hostname) {
  throw new Error("Set AWS_REGION and DSQL_CLUSTER_ENDPOINT in your environment.");
}

export async function getDsqlToken(): Promise<string> {
  const signer = new DsqlSigner({ hostname: hostname!, region: region! });
  return await signer.getDbConnectAdminAuthToken();
}
