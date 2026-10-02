import { loadEnvConfig } from "@next/env";
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { BN, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  AuthorityType,
  createSetAuthorityInstruction,
  createBurnCheckedInstruction,
  getAccount,
  getMint,
  getTransferHook,
  getImmutableOwner,
} from "@solana/spl-token";
import { ata, createInstruction, transaction, HOOK } from "../src/lib/chain";
import {
  connection,
  sponsor,
  serverProgram,
  config,
  balance,
  loadEvent,
  loadListing,
  prepare,
  relay,
  faucet,
  prepareRecipient,
} from "../src/lib/server";
import type { ActionInput, Receipt } from "../src/lib/types";

loadEnvConfig(process.cwd());
if (process.env.SOLANA_NETWORK === "devnet") {
  const originalFetch = globalThis.fetch;
  let nextRequest = 0;
  globalThis.fetch = async (input, options) => {
    const wait = Math.max(0, nextRequest - Date.now());
    nextRequest = Date.now() + wait + 500;
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
    return originalFetch(input, options);
  };
}
async function main() {
  const payer = sponsor(),
    rpc = connection(),
    program = serverProgram();
  const provider = new AnchorProvider(rpc, new Wallet(payer), {
    commitment: "confirmed",
  });
  const organizer = Keypair.generate(),
    seller = Keypair.generate(),
    buyer = Keypair.generate(),
    stranger = Keypair.generate();
  const results: { check: string; signature?: string }[] = [];
  const pass = (check: string, receipt?: Receipt) => {
    results.push({ check, signature: receipt?.signature });
    console.log(`PASS ${check}`);
  };
  async function action(
    actor: Keypair,
    input: Omit<ActionInput, "owner"> | Record<string, unknown>,
  ) {
    const p = await prepare({
      ...input,
      owner: actor.publicKey.toBase58(),
    } as ActionInput);
    const tx = (await import("@solana/web3.js")).Transaction.from(
      Buffer.from(p.transaction, "base64"),
    );
    tx.partialSign(actor);
    return relay(tx.serialize().toString("base64"));
  }
  const details = {
    name: "Integration test",
    venue: "Automated test",
    date: Math.floor(Date.now() / 1000) + 86_400,
    facePrice: 2500,
    supply: 2,
    capBps: 1000,
    royaltyBps: 500,
  };
  const creation = await createInstruction(
    program,
    payer.publicKey,
    organizer.publicKey,
    new BN(Date.now()),
    details,
    "https://fairtix-whu.vercel.app/api/metadata",
  );
  const envBefore = readFileSync(".env.local", "utf8");
  const excludedBefore = new Set(
    (process.env.FAIRTIX_EXCLUDED_EVENTS || "").split(",").filter(Boolean),
  );
  excludedBefore.add(creation.event.toBase58());
  const exclusionLine = `FAIRTIX_EXCLUDED_EVENTS=${[...excludedBefore].join(",")}`;
  writeFileSync(
    ".env.local",
    /^FAIRTIX_EXCLUDED_EVENTS=/m.test(envBefore)
      ? envBefore.replace(/^FAIRTIX_EXCLUDED_EVENTS=.*$/m, exclusionLine)
      : `${envBefore.trimEnd()}\n${exclusionLine}\n`,
    { mode: 0o600 },
  );
  const createdSig = await provider.sendAndConfirm(
    transaction([creation.instruction]),
    [organizer],
  );
  const event = await loadEvent(program, creation.event.toBase58());
  const mint = new PublicKey(event.mint),
    currency = (await config(program)).currencyMint;
  const mintInfo = await getMint(rpc, mint, "confirmed", TOKEN_2022_PROGRAM_ID);
  assert(getTransferHook(mintInfo)?.programId.equals(HOOK));
  assert.equal(mintInfo.decimals, 0);
  assert.equal(mintInfo.supply, 0n);
  pass("event mint uses the transfer hook; unsold tickets are not minted", {
    ok: true,
    signature: createdSig,
  });
  await faucet(seller.publicKey.toBase58());
  await faucet(buyer.publicKey.toBase58());
  const primary = await action(seller, {
    action: "primary",
    event: event.address,
  });
  assert(primary.ok, JSON.stringify(primary));
  assert.equal(await balance(mint, seller.publicKey), 1);
  assert.equal(await balance(currency, seller.publicKey), 7500);
  assert.equal(await balance(currency, organizer.publicKey), 2425);
  pass(
    "primary purchase atomically delivers one ticket and pays 97% to the organizer",
    primary,
  );
  const sellerAccount = await getAccount(
    rpc,
    ata(mint, seller.publicKey),
    "confirmed",
    TOKEN_2022_PROGRAM_ID,
  );
  assert(getImmutableOwner(sellerAccount));
  pass("ticket account ownership is immutable");
  const ownerSwap = transaction([
    createSetAuthorityInstruction(
      ata(mint, seller.publicKey),
      seller.publicKey,
      AuthorityType.AccountOwner,
      stranger.publicKey,
      [],
      TOKEN_2022_PROGRAM_ID,
    ),
  ]);
  const block = await rpc.getLatestBlockhash();
  ownerSwap.feePayer = payer.publicKey;
  ownerSwap.recentBlockhash = block.blockhash;
  ownerSwap.partialSign(payer, seller);
  const ownershipReceipt = await relay(
    ownerSwap.serialize().toString("base64"),
  );
  assert.equal(ownershipReceipt.ok, false);
  pass("changing the account owner cannot bypass the hook", ownershipReceipt);
  const over = await action(seller, {
    action: "list",
    event: event.address,
    price: 6000,
  });
  assert.equal(over.code, "OverCap");
  assert.equal(await balance(mint, seller.publicKey), 1);
  pass(
    "€60 listing rejected against €27.50 cap; ticket stays with seller",
    over,
  );
  await prepareRecipient(buyer.publicKey.toBase58(), event.address);
  const direct = await action(seller, {
    action: "direct",
    event: event.address,
    destination: buyer.publicKey.toBase58(),
  });
  assert.equal(direct.code, "TransferNotAllowed");
  assert.equal(await balance(mint, buyer.publicKey), 0);
  pass(
    "direct wallet-to-wallet transfer rejected by the Token-2022 hook",
    direct,
  );
  let listed = await prepare({
    owner: seller.publicKey.toBase58(),
    action: "list",
    event: event.address,
    price: 2575,
  });
  let tx = (await import("@solana/web3.js")).Transaction.from(
    Buffer.from(listed.transaction, "base64"),
  );
  tx.partialSign(seller);
  const listingReceipt = await relay(tx.serialize().toString("base64"));
  assert(listingReceipt.ok, JSON.stringify(listingReceipt));
  assert.equal(await balance(mint, seller.publicKey), 0);
  let listing = await loadListing(program, listed.address!);
  assert.equal(await balance(mint, new PublicKey(listing.address)), 1);
  pass("legal listing holds exactly one ticket in escrow", listingReceipt);
  const badCancel = await action(stranger, {
    action: "cancel",
    listing: listing.address,
  });
  assert.equal(badCancel.ok, false);
  assert(await rpc.getAccountInfo(new PublicKey(listing.address)));
  pass("another account cannot cancel the seller's listing", badCancel);
  const cancelled = await action(seller, {
    action: "cancel",
    listing: listing.address,
  });
  assert(cancelled.ok, JSON.stringify(cancelled));
  assert.equal(await balance(mint, seller.publicKey), 1);
  assert.equal(await rpc.getAccountInfo(new PublicKey(listing.address)), null);
  pass(
    "seller can cancel and recover their ticket; escrow and listing close",
    cancelled,
  );
  listed = await prepare({
    owner: seller.publicKey.toBase58(),
    action: "list",
    event: event.address,
    price: 2575,
  });
  tx = (await import("@solana/web3.js")).Transaction.from(
    Buffer.from(listed.transaction, "base64"),
  );
  tx.partialSign(seller);
  assert((await relay(tx.serialize().toString("base64"))).ok);
  listing = await loadListing(program, listed.address!);
  await faucet(stranger.publicKey.toBase58());
  await provider.sendAndConfirm(
    transaction([
      createBurnCheckedInstruction(
        ata(currency, stranger.publicKey),
        currency,
        stranger.publicKey,
        7600,
        2,
        [],
        TOKEN_2022_PROGRAM_ID,
      ),
    ]),
    [stranger],
  );
  const rollbackBefore = await Promise.all([
    balance(currency, seller.publicKey),
    balance(currency, stranger.publicKey),
    balance(currency, organizer.publicKey),
    balance(currency, payer.publicKey),
  ]);
  const underfunded = await action(stranger, {
    action: "resale",
    listing: listing.address,
  });
  assert.equal(underfunded.ok, false);
  assert.deepEqual(
    await Promise.all([
      balance(currency, seller.publicKey),
      balance(currency, stranger.publicKey),
      balance(currency, organizer.publicKey),
      balance(currency, payer.publicKey),
    ]),
    rollbackBefore,
  );
  assert.equal(await balance(mint, new PublicKey(listing.address)), 1);
  pass(
    "an underfunded resale rolls back the first payment and leaves the ticket in escrow",
    underfunded,
  );
  const before = await Promise.all([
    balance(currency, seller.publicKey),
    balance(currency, buyer.publicKey),
    balance(currency, organizer.publicKey),
    balance(currency, payer.publicKey),
  ]);
  const resale = await action(buyer, {
    action: "resale",
    listing: listing.address,
  });
  assert(resale.ok, JSON.stringify(resale));
  const after = await Promise.all([
    balance(currency, seller.publicKey),
    balance(currency, buyer.publicKey),
    balance(currency, organizer.publicKey),
    balance(currency, payer.publicKey),
  ]);
  assert.deepEqual(
    after.map((v, i) => v - before[i]),
    [2396, -2575, 128, 51],
  );
  assert.equal(await balance(mint, buyer.publicKey), 1);
  assert.equal(await balance(mint, seller.publicKey), 0);
  assert.equal(await rpc.getAccountInfo(new PublicKey(listing.address)), null);
  assert.equal((await loadEvent(program, event.address)).royaltiesEarned, 128);
  pass(
    "€25.75 resale pays €23.96 seller, €1.28 royalty, €0.51 platform atomically",
    resale,
  );
  assert((await action(buyer, { action: "primary", event: event.address })).ok);
  const soldOut = await action(buyer, {
    action: "primary",
    event: event.address,
  });
  assert.equal(soldOut.code, "SoldOut");
  assert.equal(
    (await getMint(rpc, mint, "confirmed", TOKEN_2022_PROGRAM_ID)).supply,
    2n,
  );
  pass("supply cannot exceed the organizer's limit", soldOut);
  const invalid = await createInstruction(
    program,
    payer.publicKey,
    organizer.publicKey,
    new BN(Date.now() + 1),
    { ...details, capBps: 2501 },
    "https://fairtix-whu.vercel.app/api/metadata",
  );
  const invalidTx = transaction([invalid.instruction]);
  invalidTx.feePayer = payer.publicKey;
  invalidTx.recentBlockhash = (await rpc.getLatestBlockhash()).blockhash;
  invalidTx.partialSign(payer, organizer);
  const badCap = await relay(invalidTx.serialize().toString("base64"));
  assert.equal(badCap.ok, false);
  assert(
    (
      await rpc.getTransaction(badCap.signature!, {
        maxSupportedTransactionVersion: 0,
      })
    )?.meta?.logMessages?.some((line) => line.includes("InvalidCap")),
  );
  pass("the marketplace program rejects an event cap above 25%", badCap);
  writeFileSync(
    "docs/chain-verification.json",
    JSON.stringify(
      {
        network: process.env.SOLANA_NETWORK,
        verifiedAt: new Date().toISOString(),
        event: event.address,
        results,
      },
      null,
      2,
    ) + "\n",
  );
  {
    const env = readFileSync(".env.local", "utf8");
    const excluded = new Set(
      (process.env.FAIRTIX_EXCLUDED_EVENTS || "").split(",").filter(Boolean),
    );
    excluded.add(event.address);
    const line = `FAIRTIX_EXCLUDED_EVENTS=${[...excluded].join(",")}`;
    writeFileSync(
      ".env.local",
      /^FAIRTIX_EXCLUDED_EVENTS=/m.test(env)
        ? env.replace(/^FAIRTIX_EXCLUDED_EVENTS=.*$/m, line)
        : `${env.trimEnd()}\n${line}\n`,
      { mode: 0o600 },
    );
  }
  console.log(`${results.length} checks passed.`);
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
