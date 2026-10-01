import assert from "node:assert/strict";
import { Transaction } from "@solana/web3.js";
import ids from "../src/lib/program-ids.json";

const base = process.env.FAIRTIX_TEST_URL || "http://127.0.0.1:3034";
const owner = ids.admin;
async function post(path: string, body: unknown, origin = base) {
  const response = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}
async function main() {
  const state = await fetch(`${base}/api/state`).then((r) => r.json());
  assert(
    state.ready,
    "Start the funded local demo before running the HTTP checks.",
  );
  const event = state.events.find((e: { example: boolean }) => e.example);
  assert(event);
  assert.equal(state.owner, null);
  assert.equal(state.balance, 0);
  assert.equal(state.network, "localnet");
  const crossOrigin = await post(
    "/api/prepare",
    { owner, action: "primary", event: event.address },
    "https://unrelated.example",
  );
  assert.equal(crossOrigin.status, 400);
  assert.match(crossOrigin.body.error, /Open Fairtix directly/);
  const malformed = await post("/api/prepare", {
    owner: "invalid",
    action: "primary",
    event: event.address,
  });
  assert.equal(malformed.status, 400);
  const details = {
    name: "HTTP validation",
    venue: "Test venue",
    date: 1_799_432_400,
    facePrice: 2500,
    supply: 100,
    capBps: 2501,
    royaltyBps: 500,
  };
  const badCap = await post("/api/prepare", {
    owner,
    action: "create",
    details,
  });
  assert.equal(badCap.status, 400);
  assert.match(badCap.body.error, /Check the ticket price/);
  const badName = await post("/api/prepare", {
    owner,
    action: "create",
    details: { ...details, capBps: 1000, name: "🎫".repeat(30) },
  });
  assert.equal(badName.status, 400);
  assert.match(badName.body.error, /96 bytes/);
  const prepared = await post("/api/prepare", {
    owner: event.organizer,
    action: "primary",
    event: event.address,
  });
  assert.equal(prepared.status, 200);
  const tx = Transaction.from(Buffer.from(prepared.body.transaction, "base64"));
  assert.equal(tx.feePayer?.toBase58(), ids.admin);
  assert(
    tx.signatures.some(
      (s) => s.publicKey.toBase58() === ids.admin && s.signature,
    ),
  );
  assert(
    tx.signatures.some(
      (s) => s.publicKey.toBase58() === event.organizer && !s.signature,
    ),
  );
  const unsigned = await post("/api/relay", {
    transaction: prepared.body.transaction,
  });
  assert.equal(unsigned.status, 400);
  assert.match(unsigned.body.error, /valid signature/);
  const metadata = await fetch(`${base}/api/metadata?name=Friday`).then((r) =>
    r.json(),
  );
  assert.match(metadata.description, /test|demo/i);
  console.log(
    "7 HTTP checks passed: live state, origin, account input, cap, UTF-8 names, sponsor signature and unsigned relay rejection.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
