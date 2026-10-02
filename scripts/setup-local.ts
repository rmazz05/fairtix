import { existsSync, readFileSync, writeFileSync } from "node:fs";

const file = ".env.local";
let contents = readFileSync(existsSync(file) ? file : ".env.example", "utf8");
const settings = {
  FAIRTIX_UI_ONLY: "0",
  FAIRTIX_PREVIEW: "0",
  SOLANA_NETWORK: "localnet",
  SOLANA_RPC_URL: "http://127.0.0.1:8920",
  SOLANA_SPONSOR_KEY_PATH: ".keys/sponsor.json",
  SOLANA_CURRENCY_MINT: "",
  FAIRTIX_DEMO_EVENT: "",
  FAIRTIX_EXCLUDED_EVENTS: "",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3034",
};
// A local validator uses newly generated test keys, never a remote sponsor key.
contents = contents.replace(/^SOLANA_SPONSOR_KEY=.*\n?/m, "");
for (const [key, value] of Object.entries(settings)) {
  const pattern = new RegExp(`^${key}=.*$`, "m");
  contents = pattern.test(contents)
    ? contents.replace(pattern, `${key}=${value}`)
    : `${contents.trimEnd()}\n${key}=${value}\n`;
}
writeFileSync(file, contents, { mode: 0o600 });
console.log(
  "Local validator configuration saved to .env.local. No network transaction was sent.",
);
