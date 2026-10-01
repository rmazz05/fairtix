import { loadEnvConfig } from "@next/env";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
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
  let example = process.env.FAIRTIX_DEMO_EVENT;
  if (
    !example ||
    !(await rpc.getAccountInfo(
      new (await import("@solana/web3.js")).PublicKey(example),
    ))
  ) {
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
    const seedFile = ".keys/example-event.json";
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
        name: "Friday, after lectures",
        venue: "Vallendar · example venue",
        date: Math.floor(
          new Date("2026-11-06T19:00:00+01:00").getTime() / 1000,
        ),
        facePrice: 2500,
        supply: 400,
        capBps: 1000,
        royaltyBps: 500,
      },
      "https://fairtix-whu.vercel.app/api/metadata?name=Friday%2C%20after%20lectures",
    );
    const signature = await provider.sendAndConfirm(
      transaction([instruction]),
      [organizer],
    );
    example = event.toBase58();
    console.log(`Example event created: ${example}\nTransaction: ${signature}`);
  }
  const env = readFileSync(".env.local", "utf8")
    .replace(
      /^SOLANA_CURRENCY_MINT=.*$/m,
      `SOLANA_CURRENCY_MINT=${currency.toBase58()}`,
    )
    .replace(/^FAIRTIX_DEMO_EVENT=.*$/m, `FAIRTIX_DEMO_EVENT=${example}`);
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
