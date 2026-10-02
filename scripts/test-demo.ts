import assert from "node:assert/strict";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  ResaleDemo,
  type DemoRequest,
  type DemoStorage,
} from "../src/lib/resale-demo";
import type {
  ActionInput,
  EventView,
  Prepared,
  Receipt,
  Snapshot,
} from "../src/lib/types";

const event: EventView = {
  address: Keypair.generate().publicKey.toBase58(),
  mint: Keypair.generate().publicKey.toBase58(),
  organizer: Keypair.generate().publicKey.toBase58(),
  name: "Demo test",
  venue: "Test venue",
  date: 1_793_988_000,
  facePrice: 2500,
  capBps: 1000,
  royaltyBps: 500,
  supply: 400,
  sold: 0,
  resales: 0,
  royaltiesEarned: 0,
  eventId: "1",
  example: true,
};
function memoryStorage(): DemoStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
  };
}
function backend() {
  const sponsor = Keypair.generate();
  const actions = new Map<string, ActionInput>();
  const receipts = new Map<string, Receipt>();
  const balances = new Map<string, number>();
  const tickets = new Map<string, number>();
  const listings = new Map<string, { seller: string; price: number }>();
  const submitted: string[] = [];
  let lost: ActionInput["action"] | null = null;
  let wrongCap = false;
  let purchases = 0;
  let resales = 0;
  let prepared = 0;
  const api: DemoRequest = async <T>(
    path: string,
    body?: unknown,
  ): Promise<T> => {
    let result: unknown;
    const data = body as Record<string, unknown>;
    if (path.startsWith("/api/state")) {
      const owner = new URL(path, "https://test.example").searchParams.get(
        "owner",
      )!;
      result = {
        ready: true,
        balance: balances.get(owner) || 0,
        tickets: { [event.address]: tickets.get(owner) || 0 },
      } as Snapshot;
    } else if (path === "/api/faucet") {
      balances.set(String(data.owner), 10000);
      result = { ok: true };
    } else if (path === "/api/recipient") result = { ok: true };
    else if (path === "/api/prepare") {
      const input = body as ActionInput;
      const blockhash = Keypair.generate().publicKey.toBase58();
      const tx = new Transaction({
        feePayer: sponsor.publicKey,
        recentBlockhash: blockhash,
      });
      tx.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(input.owner),
          toPubkey: sponsor.publicKey,
          lamports: 1,
        }),
      );
      tx.partialSign(sponsor);
      actions.set(blockhash, input);
      prepared++;
      result = {
        transaction: tx
          .serialize({ requireAllSignatures: false })
          .toString("base64"),
        lastValidBlockHeight: 100,
        address: blockhash,
      } satisfies Prepared;
    } else if (path === "/api/relay") {
      const wire = String(data.transaction);
      submitted.push(wire);
      const tx = Transaction.from(Buffer.from(wire, "base64"));
      assert(
        tx.verifySignatures(),
        "Both sponsor and actor must sign the transaction",
      );
      const input = actions.get(tx.recentBlockhash!)!;
      let receipt = receipts.get(wire);
      if (!receipt) {
        receipt = { ok: true, signature: `receipt-${receipts.size + 1}` };
        if (input.action === "primary") {
          purchases++;
          tickets.set(input.owner, (tickets.get(input.owner) || 0) + 1);
          balances.set(
            input.owner,
            (balances.get(input.owner) || 0) - event.facePrice,
          );
        } else if (input.action === "list") {
          if (input.price > 2750)
            receipt = {
              ...receipt,
              ok: false,
              code: wrongCap ? "Rejected" : "OverCap",
              error: wrongCap ? "Network rejection" : "Over cap",
            };
          else {
            listings.set(tx.recentBlockhash!, {
              seller: input.owner,
              price: input.price,
            });
            tickets.set(input.owner, (tickets.get(input.owner) || 0) - 1);
          }
        } else if (input.action === "direct")
          receipt = { ...receipt, ok: false, code: "TransferNotAllowed" };
        else if (input.action === "resale") {
          const listing = listings.get(input.listing)!;
          assert(listing, "Buy the exact listing created by the seller");
          assert.notEqual(listing.seller, input.owner);
          tickets.set(input.owner, (tickets.get(input.owner) || 0) + 1);
          balances.set(
            input.owner,
            (balances.get(input.owner) || 0) - listing.price,
          );
          listings.delete(input.listing);
          resales++;
        }
        receipts.set(wire, receipt);
        if (lost === input.action) {
          lost = null;
          throw new Error("Response lost after confirmation");
        }
      }
      result = receipt;
    } else throw new Error(`Unexpected request ${path}`);
    return result as T;
  };
  return {
    api,
    submitted,
    tickets,
    get purchases() {
      return purchases;
    },
    get resales() {
      return resales;
    },
    get prepared() {
      return prepared;
    },
    loseNext(action: ActionInput["action"]) {
      lost = action;
    },
    rejectWrongCode() {
      wrongCap = true;
    },
  };
}

async function main() {
  const storage = memoryStorage(),
    chain = backend();
  let demo = new ResaleDemo(event, storage, chain.api);
  const addresses = demo.addresses;
  chain.loseNext("primary");
  await assert.rejects(demo.list(6000), /Response lost/);
  const primaryWire = chain.submitted[0];
  demo = new ResaleDemo(event, storage, chain.api);
  assert.deepEqual(
    demo.addresses,
    addresses,
    "Reload must keep both participants",
  );
  await demo.list(6000);
  assert.equal(
    chain.submitted[1],
    primaryWire,
    "Recovery must replay identical bytes",
  );
  assert.equal(
    chain.purchases,
    1,
    "A lost purchase response must not mint a second ticket",
  );
  assert.equal(demo.progress.cap?.code, "OverCap");
  assert.equal(chain.tickets.get(addresses.seller), 1);
  await demo.tryTransfer();
  assert.equal(demo.progress.direct?.code, "TransferNotAllowed");
  assert.equal(chain.tickets.get(addresses.seller), 1);
  chain.loseNext("list");
  await assert.rejects(demo.list(2500), /Response lost/);
  demo = new ResaleDemo(event, storage, chain.api);
  await demo.list(2750);
  assert.equal(
    demo.progress.listing?.price,
    2500,
    "A retry must preserve the price already recorded on chain",
  );
  assert.equal(
    chain.resales,
    0,
    "Listing must not automatically buy on the user's behalf",
  );
  chain.loseNext("resale");
  await assert.rejects(demo.buy(), /Response lost/);
  demo = new ResaleDemo(event, storage, chain.api);
  await demo.buy();
  assert.equal(
    chain.resales,
    1,
    "A lost resale response must not purchase twice",
  );
  assert.equal(chain.tickets.get(addresses.buyer), 1);
  assert.equal(chain.tickets.get(addresses.seller), 0);
  assert(demo.progress.sale?.signature);
  const before = chain.prepared;
  await demo.buy();
  assert.equal(chain.prepared, before, "A completed sale must be idempotent");
  demo.restart();
  assert.deepEqual(demo.progress, {});
  const wrong = backend(),
    incorrect = new ResaleDemo(event, memoryStorage(), wrong.api);
  wrong.rejectWrongCode();
  await assert.rejects(incorrect.list(6000), /Network rejection/);
  assert.equal(
    incorrect.progress.cap,
    undefined,
    "A network rejection must not be presented as proof of the cap",
  );
  await assert.rejects(incorrect.buy(), /seller side first/);
  const blockedStorage: DemoStorage = {
    getItem: () => null,
    setItem: () => {
      throw new Error("Storage blocked");
    },
  };
  assert.throws(
    () => new ResaleDemo(event, blockedStorage, chain.api),
    /Storage blocked/,
  );
  console.log(
    "Demo recovery checks passed: signed actors, over-cap rejection, direct-transfer rejection, separate list and buy, original-price preservation, reload recovery, lost purchase/resale responses, duplicate prevention, unexpected rejection and unavailable storage.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
