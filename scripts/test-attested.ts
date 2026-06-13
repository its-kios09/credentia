import "dotenv/config";
import { verifyCredential } from "../src/verify";

async function main() {
  const r = await verifyCredential("REG-TEST-0001");
  console.log(JSON.stringify(r, null, 2));
  process.exit(0);
}
main();
