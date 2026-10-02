import { loadEnvConfig } from "@next/env";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { createMint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { CONFIG, createInstruction, transaction } from "../src/lib/chain";
import {
  connection,
  guard,
  serverProgram,
  sponsor,
  network,
} from "../src/lib/server";

loadEnvConfig(process.cwd());
async function main() {
  await guard();
  const rpc = connection(),
    payer = sponsor();
  const provider = new AnchorProvider(rpc, new Wallet(payer), {
    commitment: "confirmed",
  });
  const program = serverProgram();
  let currency;
  if (await rpc.getAccountInfo(CONFIG)) {
    currency = (await program.account.config.fetch(CONFIG)).currencyMint;
  } else {
    const file = ".keys/currency.json";
    const key = existsSync(file)
      ? Keypair.fromSecretKey(
          Uint8Array.from(JSON.parse(readFileSync(file, "utf8"))),
        )
      : Keypair.generate();
    if (!existsSync(file))
      writeFileSync(file, JSON.stringify([...key.secretKey]), { mode: 0o600 });
    currency = (await rpc.getAccountInfo(key.publicKey))
      ? key.publicKey
      : await createMint(
          rpc,
          payer,
          payer.publicKey,
          null,
          2,
          key,
          { commitment: "confirmed" },
          TOKEN_2022_PROGRAM_ID,
        );
    await program.methods
      .initializeConfig()
      .accountsStrict({
        admin: payer.publicKey,
        config: CONFIG,
        currencyMint: currency,
        systemProgram: new (await import("@solana/web3.js")).PublicKey(
          "11111111111111111111111111111111",
        ),
      })
      .rpc();
  }
  const previousExample = process.env.FAIRTIX_DEMO_EVENT;
  let example = previousExample;
  if (example) {
    const current = await program.account.event.fetchNullable(
      new PublicKey(example),
    );
    if (!current || current.name !== "Football match") example = undefined;
  }
  if (!example) {
    const file = ".keys/organizer.json";
    const organizer = existsSync(file)
      ? Keypair.fromSecretKey(
          Uint8Array.from(JSON.parse(readFileSync(file, "utf8"))),
        )
      : Keypair.generate();
    if (!existsSync(file))
      writeFileSync(file, JSON.stringify([...organizer.secretKey]), {
        mode: 0o600,
      });
    const seedFile = ".keys/football-example-event.json";
    const eventId = existsSync(seedFile)
      ? JSON.parse(readFileSync(seedFile, "utf8")).id
      : String(Date.now());
    if (!existsSync(seedFile))
      writeFileSync(seedFile, JSON.stringify({ id: eventId }) + "\n", {
        mode: 0o600,
      });
    const { instruction, event } = await createInstruction(
      program,
      payer.publicKey,
      organizer.publicKey,
      new BN(eventId),
      {
        name: "Football match",
        venue: "Vallendar",
        date: Math.floor(
          new Date("2026-11-06T19:00:00+01:00").getTime() / 1000,
        ),
        facePrice: 2500,
        supply: 400,
        capBps: 1000,
        royaltyBps: 500,
      },
      "https://fairtix-whu.vercel.app/api/metadata?name=Football%20match",
    );
    const existing = await program.account.event.fetchNullable(event);
    if (existing && existing.name !== "Football match")
      throw new Error(
        "The saved example event belongs to a different fixture.",
      );
    const signature = existing
      ? null
      : await provider.sendAndConfirm(transaction([instruction]), [organizer]);
    example = event.toBase58();
    console.log(`Example event created: ${example}\nTransaction: ${signature}`);
  }
  let env = readFileSync(".env.local", "utf8")
    .replace(
      /^SOLANA_CURRENCY_MINT=.*$/m,
      `SOLANA_CURRENCY_MINT=${currency.toBase58()}`,
    )
    .replace(/^FAIRTIX_DEMO_EVENT=.*$/m, `FAIRTIX_DEMO_EVENT=${example}`);
  if (previousExample && previousExample !== example) {
    const excluded = new Set(
      (process.env.FAIRTIX_EXCLUDED_EVENTS || "").split(",").filter(Boolean),
    );
    excluded.add(previousExample);
    const line = `FAIRTIX_EXCLUDED_EVENTS=${[...excluded].join(",")}`;
    env = /^FAIRTIX_EXCLUDED_EVENTS=/m.test(env)
      ? env.replace(/^FAIRTIX_EXCLUDED_EVENTS=.*$/m, line)
      : env.trimEnd() + "\n" + line + "\n";
  }
  writeFileSync(".env.local", env, { mode: 0o600 });
  writeFileSync(
    "chain/deployment.json",
    JSON.stringify(
      {
        network: network(),
        market: program.programId.toBase58(),
        currency: currency.toBase58(),
        exampleEvent: example,
        seededAt: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
  console.log(`Seed complete (${network()}). No real money is used.`);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
