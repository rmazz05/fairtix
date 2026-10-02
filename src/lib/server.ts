import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { BN, Program, Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createMintToInstruction,
  createTransferCheckedWithTransferHookInstruction,
  getAccount,
} from "@solana/spl-token";
import {
  type MarketProgram,
  ADMIN,
  CONFIG,
  MARKET,
  HOOK,
  ata,
  marketProgram,
  createInstruction,
  primaryInstruction,
  listInstruction,
  cancelInstruction,
  resaleInstruction,
  transaction,
} from "./chain";
import type {
  ActionInput,
  EventView,
  ListingView,
  Snapshot,
  Receipt,
  Prepared,
  Proof,
} from "./types";
import exampleTicket from "./example-event.json";
import { createReadCache } from "./read-cache";

let cachedRpc: { url: string; value: Connection } | undefined;
let rpcQueue: Promise<void> = Promise.resolve();
const pause = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));
export function connection() {
  const url = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
  if (cachedRpc?.url === url) return cachedRpc.value;
  const value = new Connection(url, {
    commitment: "confirmed",
    disableRetryOnRateLimit: true,
    fetch: (target, options) => {
      const request = rpcQueue.then(async () => {
        for (let attempt = 0; ; attempt++) {
          const response = await fetch(target, {
            ...options,
            signal: AbortSignal.timeout(8_000),
          });
          // Drain the response exactly once before reusing the connection.
          // Return a fresh body to web3.js, unaffected by a late fetch abort.
          // Some RPCs return JSON error 429 with HTTP 200.
          const body = await response.text();
          let limited = response.status === 429;
          try {
            limited ||= JSON.parse(body)?.error?.code === 429;
          } catch {}
          if (!limited || attempt === 3) {
            await pause(200);
            return new Response(body, {
              status: response.status,
              statusText: response.statusText,
              headers: { "Content-Type": "application/json" },
            });
          }
          await pause(750 * (attempt + 1));
        }
      });
      rpcQueue = request.then(
        () => undefined,
        () => undefined,
      );
      return request;
    },
  });
  cachedRpc = { url, value };
  return value;
}
export function sponsor() {
  const raw =
    process.env.SOLANA_SPONSOR_KEY ||
    (!process.env.VERCEL && process.env.SOLANA_SPONSOR_KEY_PATH
      ? readFileSync(process.env.SOLANA_SPONSOR_KEY_PATH, "utf8")
      : null);
  if (!raw) throw new Error("The test-credit sponsor is not configured yet.");
  const key = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(raw)));
  if (!key.publicKey.equals(ADMIN))
    throw new Error("The sponsor does not match this deployment.");
  return key;
}
export const network = (): "localnet" | "devnet" =>
  process.env.SOLANA_NETWORK === "localnet" && !process.env.VERCEL
    ? "localnet"
    : "devnet";
let guardPromise: Promise<void> | undefined;
export async function guard() {
  if (process.env.FAIRTIX_UI_ONLY === "1" && !process.env.VERCEL)
    throw new Error("Interface preview. Chain actions are disabled.");
  guardPromise ??= (async () => {
    const url = new URL(
      process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com",
    );
    if (network() === "localnet") {
      if (!["localhost", "127.0.0.1"].includes(url.hostname))
        throw new Error("Localnet must use a local RPC.");
    } else if (
      (await connection().getGenesisHash()) !==
      "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG"
    ) {
      throw new Error("Fairtix only sponsors transactions on Solana devnet.");
    }
  })().catch((error) => {
    guardPromise = undefined;
    throw error;
  });
  return guardPromise;
}
export function serverProgram() {
  return marketProgram(connection(), new Wallet(sponsor()));
}
type EventAccount = {
  organizer: PublicKey;
  mint: PublicKey;
  eventId: BN;
  facePrice: BN;
  capBps: number;
  royaltyBps: number;
  supply: number;
  sold: number;
  resales: number;
  royaltiesEarned: BN;
  date: BN;
  name: string;
  venue: string;
};
type ListingAccount = {
  event: PublicKey;
  seller: PublicKey;
  escrow: PublicKey;
  rentPayer: PublicKey;
  nonce: BN;
  price: BN;
  createdAt: BN;
};
export function eventView(address: PublicKey, a: EventAccount): EventView {
  return {
    address: address.toBase58(),
    mint: a.mint.toBase58(),
    organizer: a.organizer.toBase58(),
    eventId: a.eventId.toString(),
    name: a.name,
    venue: a.venue,
    date: Number(a.date.toString()),
    facePrice: a.facePrice.toNumber(),
    capBps: a.capBps,
    royaltyBps: a.royaltyBps,
    supply: a.supply,
    sold: a.sold,
    resales: a.resales,
    royaltiesEarned: a.royaltiesEarned.toNumber(),
    example: address.toBase58() === process.env.FAIRTIX_DEMO_EVENT,
  };
}
export function listingView(
  address: PublicKey,
  a: ListingAccount,
): ListingView {
  return {
    address: address.toBase58(),
    event: a.event.toBase58(),
    seller: a.seller.toBase58(),
    escrow: a.escrow.toBase58(),
    rentPayer: a.rentPayer.toBase58(),
    nonce: a.nonce.toString(),
    price: a.price.toNumber(),
    createdAt: a.createdAt.toNumber(),
  };
}
export async function loadEvent(program: MarketProgram, key: string) {
  return eventView(
    new PublicKey(key),
    (await program.account.event.fetch(new PublicKey(key))) as EventAccount,
  );
}
export async function loadListing(program: MarketProgram, key: string) {
  return listingView(
    new PublicKey(key),
    (await program.account.listing.fetch(new PublicKey(key))) as ListingAccount,
  );
}
export async function config(program: MarketProgram) {
  return (await program.account.config.fetch(CONFIG)) as {
    currencyMint: PublicKey;
    treasury: PublicKey;
  };
}
export async function balance(mint: PublicKey, owner: PublicKey) {
  try {
    return Number(
      (
        await getAccount(
          connection(),
          ata(mint, owner),
          "confirmed",
          TOKEN_2022_PROGRAM_ID,
        )
      ).amount,
    );
  } catch (e) {
    if (
      e instanceof Error &&
      ["TokenAccountNotFoundError", "TokenInvalidAccountOwnerError"].includes(
        e.name,
      )
    )
      return 0;
    throw e;
  }
}

async function readLedger(): Promise<{
  snapshot: Snapshot;
  currency: string | null;
}> {
  const base: Snapshot = {
    owner: null,
    ready: false,
    network: network(),
    events: [],
    listings: [],
    tickets: {},
    balance: 0,
    proofs: [],
    demoEvent: process.env.FAIRTIX_DEMO_EVENT || null,
    sponsor: ADMIN.toBase58(),
  };
  if (process.env.FAIRTIX_PREVIEW === "1") {
    base.events = [exampleTicket];
    base.demoEvent = exampleTicket.address;
  }
  if (process.env.FAIRTIX_UI_ONLY === "1" && !process.env.VERCEL)
    return {
      currency: null,
      snapshot: {
        ...base,
        events: [exampleTicket],
        demoEvent: exampleTicket.address,
        message:
          "Interface preview. No ledger is connected; purchases and transfers are disabled.",
      },
    };
  try {
    await guard();
  } catch {
    throw new Error("The test ledger is unavailable. Try again in a moment.");
  }
  const rpc = connection();
  const deployment = await rpc.getMultipleAccountsInfo([MARKET, HOOK, CONFIG]);
  if (
    !deployment[0]?.executable ||
    !deployment[1]?.executable ||
    !deployment[2]?.owner.equals(MARKET)
  )
    return {
      currency: null,
      snapshot: {
        ...base,
        message:
          "Preview. The live demo is awaiting devnet deployment. Purchases are disabled.",
      },
    };
  const program = serverProgram();
  const currency = program.coder.accounts.decode(
    "config",
    deployment[2]!.data,
  ) as { currencyMint: PublicKey };
  // Read event and listing accounts together instead of querying the same
  // program twice. The config was already read in the deployment check.
  const accounts = await rpc.getProgramAccounts(MARKET);
  const discriminator = (name: string) =>
    Buffer.from(
      program.idl.accounts!.find((a) => a.name === name)!.discriminator,
    );
  const eventTag = discriminator("event"),
    listingTag = discriminator("listing");
  const events = accounts.filter((a) =>
    a.account.data.subarray(0, 8).equals(eventTag),
  );
  const listings = accounts.filter((a) =>
    a.account.data.subarray(0, 8).equals(listingTag),
  );
  const excluded = new Set(
    (process.env.FAIRTIX_EXCLUDED_EVENTS || "").split(","),
  );
  base.events = events
    .map((r) =>
      eventView(
        r.pubkey,
        program.coder.accounts.decode("event", r.account.data) as EventAccount,
      ),
    )
    .filter((e) => !excluded.has(e.address))
    .sort((a, b) => Number(b.example) - Number(a.example) || a.date - b.date);
  base.listings = listings.map((r) =>
    listingView(
      r.pubkey,
      program.coder.accounts.decode(
        "listing",
        r.account.data,
      ) as ListingAccount,
    ),
  );
  return {
    snapshot: { ...base, ready: true },
    currency: currency.currencyMint.toBase58(),
  };
}
const ledgerReads = createReadCache(readLedger, 2_000);
const proofReads = createReadCache(async () => {
  await guard();
  const event = process.env.FAIRTIX_DEMO_EVENT;
  return event ? recentProofs(new PublicKey(event)) : [];
}, 1_000);

export async function getProofs() {
  return proofReads.read();
}

export async function getSnapshot(
  owner?: string,
  withProof = false,
): Promise<Snapshot> {
  const ledger = await ledgerReads.read();
  const base: Snapshot = {
    ...ledger.snapshot,
    owner: owner || null,
    tickets: {},
    proofs: [],
  };
  if (!base.ready) return base;
  const rpc = connection();
  if (owner) {
    const key = new PublicKey(owner);
    const tokenAccounts = await rpc.getTokenAccountsByOwner(key, {
      programId: TOKEN_2022_PROGRAM_ID,
    });
    for (const account of tokenAccounts.value) {
      const mint = new PublicKey(
        account.account.data.subarray(0, 32),
      ).toBase58();
      const amount = Number(account.account.data.readBigUInt64LE(64));
      if (mint === ledger.currency) base.balance += amount;
      const event = base.events.find((e) => e.mint === mint);
      if (event && amount > 0)
        base.tickets[event.address] =
          (base.tickets[event.address] || 0) + amount;
    }
  }
  if (withProof && base.demoEvent) base.proofs = await getProofs();
  return { ...base, ready: true };
}
async function recentProofs(event: PublicKey): Promise<Proof[]> {
  const rpc = connection();
  const signatures = await rpc.getSignaturesForAddress(event, { limit: 16 });
  const proofs: Proof[] = [];
  for (const item of signatures) {
    if (!item.err) continue;
    const receipt = await rpc.getTransaction(item.signature, {
      maxSupportedTransactionVersion: 0,
      commitment: "confirmed",
    });
    const logs = receipt?.meta?.logMessages?.join("\n") || "";
    const kind = logs.includes("OverCap")
      ? "over-cap"
      : logs.includes("TransferNotAllowed")
        ? "direct-transfer"
        : null;
    if (kind)
      proofs.push({
        signature: item.signature,
        kind,
        date: item.blockTime || 0,
      });
    if (proofs.length === 5) break;
  }
  return proofs;
}

export async function prepare(input: ActionInput): Promise<Prepared> {
  await guard();
  const payer = sponsor(),
    owner = new PublicKey(input.owner),
    program = serverProgram();
  let ix, address: string | undefined;
  const before: TransactionInstruction[] = [];
  const ensureAta = (mint: PublicKey, holder: PublicKey) =>
    before.push(
      createAssociatedTokenAccountIdempotentInstruction(
        payer.publicKey,
        ata(mint, holder),
        holder,
        mint,
        TOKEN_2022_PROGRAM_ID,
      ),
    );
  if (input.action === "create") {
    const d = input.details;
    if (
      !d ||
      typeof d.name !== "string" ||
      typeof d.venue !== "string" ||
      !d.name.trim() ||
      !d.venue.trim()
    )
      throw new Error("Enter an event name and venue.");
    if (Buffer.byteLength(d.name) > 96 || Buffer.byteLength(d.venue) > 96)
      throw new Error("Shorten the event name or venue and try again.");
    if (
      !Number.isSafeInteger(d.facePrice) ||
      d.facePrice < 1 ||
      !Number.isSafeInteger(d.supply) ||
      d.supply < 1 ||
      d.supply > 10_000 ||
      !Number.isSafeInteger(d.capBps) ||
      d.capBps < 0 ||
      d.capBps > 2500 ||
      !Number.isSafeInteger(d.royaltyBps) ||
      d.royaltyBps < 0 ||
      d.royaltyBps > 1000 ||
      !Number.isSafeInteger(d.date) ||
      d.date < 1 ||
      d.date > 4_102_444_800
    )
      throw new Error(
        "Check the ticket price, quantity, cap, royalty and date.",
      );
    const id = new BN(randomBytes(8), "le");
    const result = await createInstruction(
      program,
      payer.publicKey,
      owner,
      id,
      d,
      `${process.env.NEXT_PUBLIC_SITE_URL || "https://fairtix-whu.vercel.app"}/api/metadata?name=${encodeURIComponent(d.name).slice(0, 96)}`,
    );
    ix = result.instruction;
    address = result.event.toBase58();
  } else if (input.action === "primary") {
    const e = await loadEvent(program, input.event),
      c = await config(program);
    ensureAta(new PublicKey(e.mint), owner);
    ensureAta(c.currencyMint, new PublicKey(e.organizer));
    ensureAta(c.currencyMint, c.treasury);
    ix = await primaryInstruction(
      program,
      payer.publicKey,
      owner,
      e,
      c.currencyMint,
      c.treasury,
    );
  } else if (input.action === "list") {
    if (
      !Number.isSafeInteger(input.price) ||
      input.price < 1 ||
      input.price > 100_000_000
    )
      throw new Error(
        "Enter a price in euros, with no more than two decimal places.",
      );
    const result = await listInstruction(
      program,
      payer.publicKey,
      owner,
      await loadEvent(program, input.event),
      new BN(randomBytes(8), "le"),
      input.price,
    );
    ix = result.instruction;
    address = result.listing.toBase58();
  } else if (input.action === "cancel" || input.action === "resale") {
    const l = await loadListing(program, input.listing),
      e = await loadEvent(program, l.event);
    if (input.action === "cancel") {
      ensureAta(new PublicKey(e.mint), owner);
      ix = await cancelInstruction(program, owner, e, l);
    } else {
      const c = await config(program);
      ensureAta(new PublicKey(e.mint), owner);
      ensureAta(c.currencyMint, new PublicKey(l.seller));
      ensureAta(c.currencyMint, new PublicKey(e.organizer));
      ensureAta(c.currencyMint, c.treasury);
      ix = await resaleInstruction(
        program,
        payer.publicKey,
        owner,
        e,
        l,
        c.currencyMint,
        c.treasury,
      );
    }
  } else if (input.action === "direct") {
    const e = await loadEvent(program, input.event),
      mint = new PublicKey(e.mint),
      destination = new PublicKey(input.destination),
      rpc = connection();
    const destAccount = ata(mint, destination);
    if (!(await rpc.getAccountInfo(destAccount)))
      throw new Error(
        "The test recipient needs a ticket account first. Use the demo transfer test.",
      );
    ix = await createTransferCheckedWithTransferHookInstruction(
      rpc,
      ata(mint, owner),
      mint,
      destAccount,
      owner,
      1n,
      0,
      [],
      "confirmed",
      TOKEN_2022_PROGRAM_ID,
    );
  } else throw new Error("Choose a valid ticket action.");
  const block = await connection().getLatestBlockhash();
  const tx = transaction([...before, ix]);
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = block.blockhash;
  tx.partialSign(payer);
  return {
    transaction: tx
      .serialize({ requireAllSignatures: false })
      .toString("base64"),
    lastValidBlockHeight: block.lastValidBlockHeight,
    address,
  };
}

async function confirmOverHttp(signature: string, blockhash: string) {
  const rpc = connection();
  const until = Date.now() + 30_000;
  for (let attempt = 0; Date.now() < until; attempt++) {
    const { value } = await rpc.getSignatureStatuses([signature], {
      searchTransactionHistory: true,
    });
    const status = value[0];
    if (
      status &&
      (status.confirmationStatus === "confirmed" ||
        status.confirmationStatus === "finalized")
    ) {
      ledgerReads.invalidate();
      proofReads.invalidate();
      return status;
    }
    if (attempt % 4 === 3 && !(await rpc.isBlockhashValid(blockhash)).value)
      throw new Error("The transaction expired. Refresh and try again.");
    await pause(750);
  }
  throw new Error(
    "Confirmation is taking longer than expected. Check My tickets before trying again.",
  );
}
async function sendSponsored(tx: Transaction) {
  const payer = sponsor(),
    rpc = connection();
  const block = await rpc.getLatestBlockhash();
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = block.blockhash;
  tx.sign(payer);
  const signature = await rpc.sendRawTransaction(tx.serialize(), {
    maxRetries: 2,
  });
  const status = await confirmOverHttp(signature, block.blockhash);
  if (status.err)
    throw new Error("The test-credit request was rejected. Try again.");
  return signature;
}
export async function relay(encoded: string): Promise<Receipt> {
  await guard();
  if (encoded.length > 3000) throw new Error("The transaction is too large.");
  const tx = Transaction.from(Buffer.from(encoded, "base64"));
  if (!tx.feePayer?.equals(sponsor().publicKey) || !tx.verifySignatures(true))
    throw new Error(
      "The transaction is missing a valid signature. Sign it again.",
    );
  const rpc = connection();
  // Send rejected demo attempts as real transactions so their failure is verifiable.
  const signature = await rpc.sendRawTransaction(tx.serialize(), {
    skipPreflight: true,
    maxRetries: 2,
  });
  // HTTP polling avoids opening a WebSocket for every serverless request.
  const result = await confirmOverHttp(signature, tx.recentBlockhash!);
  if (!result.err) return { ok: true, signature };
  const receipt = await rpc.getTransaction(signature, {
    maxSupportedTransactionVersion: 0,
  });
  const logs = receipt?.meta?.logMessages?.join("\n") || "";
  const code = logs.includes("OverCap")
    ? "OverCap"
    : logs.includes("TransferNotAllowed")
      ? "TransferNotAllowed"
      : logs.includes("SoldOut")
        ? "SoldOut"
        : logs.includes("insufficient funds")
          ? "InsufficientFunds"
          : "Rejected";
  return {
    ok: false,
    signature,
    code,
    error:
      code === "TransferNotAllowed"
        ? "This ticket can only change hands through Fairtix, so the price cap holds."
        : code === "OverCap"
          ? "The asking price is above this event's resale cap."
          : code === "InsufficientFunds"
            ? "Your demo balance is too low. Add €100, then try again."
            : code === "SoldOut"
              ? "This event is sold out."
              : "The ticket action was rejected. Refresh the event and try again.",
  };
}
export async function faucet(ownerString: string): Promise<Receipt> {
  await guard();
  const payer = sponsor(),
    owner = new PublicKey(ownerString),
    program = serverProgram(),
    c = await config(program);
  if ((await balance(c.currencyMint, owner)) >= 10_000) return { ok: true };
  const tx = transaction([
    createAssociatedTokenAccountIdempotentInstruction(
      payer.publicKey,
      ata(c.currencyMint, owner),
      owner,
      c.currencyMint,
      TOKEN_2022_PROGRAM_ID,
    ),
    createMintToInstruction(
      c.currencyMint,
      ata(c.currencyMint, owner),
      payer.publicKey,
      10_000,
      [],
      TOKEN_2022_PROGRAM_ID,
    ),
  ]);
  const signature = await sendSponsored(tx);
  return { ok: true, signature };
}
export async function prepareRecipient(destination: string, eventKey: string) {
  await guard();
  const payer = sponsor(),
    owner = new PublicKey(destination),
    e = await loadEvent(serverProgram(), eventKey),
    mint = new PublicKey(e.mint);
  return sendSponsored(
    transaction([
      createAssociatedTokenAccountIdempotentInstruction(
        payer.publicKey,
        ata(mint, owner),
        owner,
        mint,
        TOKEN_2022_PROGRAM_ID,
      ),
    ]),
  );
}
