import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { Keypair } from "@solana/web3.js";
mkdirSync(".keys", { recursive: true });
const keys = Object.fromEntries(
  ["market", "hook", "sponsor"].map((name) => {
    const file = `.keys/${name}.json`;
    const key = existsSync(file)
      ? Keypair.fromSecretKey(
          Uint8Array.from(JSON.parse(readFileSync(file, "utf8"))),
        )
      : Keypair.generate();
    if (!existsSync(file))
      writeFileSync(file, JSON.stringify([...key.secretKey]), { mode: 0o600 });
    return [name, key.publicKey.toBase58()];
  }),
);
const ids = { market: keys.market, hook: keys.hook, admin: keys.sponsor };
writeFileSync("chain/program-ids.json", JSON.stringify(ids, null, 2) + "\n");
writeFileSync("src/lib/program-ids.json", JSON.stringify(ids, null, 2) + "\n");
const marketFile = "chain/programs/fairtix_market/src/lib.rs",
  hookFile = "chain/programs/fairtix_hook/src/lib.rs";
writeFileSync(
  marketFile,
  readFileSync(marketFile, "utf8")
    .replace(/declare_id!\("[^"]+"\)/, `declare_id!("${ids.market}")`)
    .replace(
      /pub const HOOK_ID: Pubkey = pubkey!\("[^"]+"\)/,
      `pub const HOOK_ID: Pubkey = pubkey!("${ids.hook}")`,
    )
    .replace(
      /pub const ADMIN_ID: Pubkey = pubkey!\("[^"]+"\)/,
      `pub const ADMIN_ID: Pubkey = pubkey!("${ids.admin}")`,
    ),
);
writeFileSync(
  hookFile,
  readFileSync(hookFile, "utf8").replace(
    /declare_id!\("[^"]+"\)/,
    `declare_id!("${ids.hook}")`,
  ),
);
writeFileSync(
  "chain/Anchor.toml",
  readFileSync("chain/Anchor.toml", "utf8")
    .replace(/fairtix_market = "[^"]+"/g, `fairtix_market = "${ids.market}"`)
    .replace(/fairtix_hook = "[^"]+"/g, `fairtix_hook = "${ids.hook}"`),
);
console.log(
  "Local program addresses configured. Keys stay in the ignored .keys directory. Run npm run build:chain next.",
);
