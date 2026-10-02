import { loadEnvConfig } from "@next/env";
import { connection, guard } from "../src/lib/server";
import { MARKET } from "../src/lib/chain";

loadEnvConfig(process.cwd());
async function main() {
  if (
    process.env.SOLANA_NETWORK !== "devnet" ||
    process.env.FAIRTIX_UI_ONLY === "1"
  )
    throw new Error(
      "Select devnet and set FAIRTIX_UI_ONLY=0 before this check.",
    );
  await guard();
  const accounts = await connection().getProgramAccounts(MARKET);
  console.log(
    `Devnet RPC verified. Marketplace account query succeeded (${accounts.length} accounts). No transaction was sent.`,
  );
}
main().catch(() => {
  console.error(
    "RPC check failed. Confirm devnet, FAIRTIX_UI_ONLY=0, provider credentials and getProgramAccounts support. No endpoint credentials were printed.",
  );
  process.exitCode = 1;
});
