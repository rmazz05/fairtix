import assert from "node:assert/strict";
import { connection } from "../src/lib/server";
import { requestErrorMessage } from "../src/lib/http";

const genesis = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const originalFetch = globalThis.fetch;
let requests = 0,
  active = 0,
  maximumActive = 0;
globalThis.fetch = async (_input, options) => {
  active++;
  maximumActive = Math.max(maximumActive, active);
  const { id } = JSON.parse(String(options?.body));
  const attempt = ++requests;
  await new Promise((resolve) => setTimeout(resolve, 20));
  active--;
  const limited = {
    jsonrpc: "2.0",
    id,
    error: { code: 429, message: "Connection rate limits exceeded" },
  };
  return Response.json(
    attempt <= 2 ? limited : { jsonrpc: "2.0", id, result: genesis },
    { status: attempt === 1 ? 429 : 200 },
  );
};
async function main() {
  try {
    assert.equal(await connection().getGenesisHash(), genesis);
    assert.equal(
      requests,
      3,
      "Retry both HTTP 429 and HTTP 200 / JSON-RPC 429",
    );
    assert.deepEqual(
      await Promise.all([
        connection().getGenesisHash(),
        connection().getGenesisHash(),
        connection().getGenesisHash(),
      ]),
      [genesis, genesis, genesis],
    );
    assert.equal(
      maximumActive,
      1,
      "Concurrent callers share the HTTP request queue",
    );
    const message = requestErrorMessage(
      new Error(
        '429 Too Many Requests: {"jsonrpc":"2.0","error":{"code":429,"message":"Connection rate limits exceeded"}}',
      ),
    );
    assert.match(message, /Wait a few seconds/);
    assert.doesNotMatch(message, /jsonrpc|429|Connection rate/);
    console.log(
      "3 RPC regression checks passed: HTTP/JSON 429 recovery, serialized requests, plain retry message.",
    );
  } finally {
    globalThis.fetch = originalFetch;
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
