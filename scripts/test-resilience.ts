import assert from "node:assert/strict";
import { createReadCache } from "../src/lib/read-cache";
import { readResponse } from "../src/lib/client-http";

async function main() {
  let reads = 0;
  const cache = createReadCache(async () => ({ count: ++reads }), 10);
  const [first, second] = await Promise.all([cache.read(), cache.read()]);
  assert.equal(reads, 1, "Concurrent reads must share one upstream request");
  assert.deepEqual(first, second);
  await new Promise((resolve) => setTimeout(resolve, 15));
  assert.equal(
    (await cache.read()).count,
    2,
    "Expired data must be read again",
  );
  cache.invalidate();
  assert.equal(
    (await cache.read()).count,
    3,
    "Transactions must invalidate cached data",
  );

  let failedReads = 0;
  const recovering = createReadCache(async () => {
    if (++failedReads === 1) throw new Error("temporary failure");
    return "recovered";
  }, 1000);
  await assert.rejects(recovering.read(), /temporary failure/);
  assert.equal(
    await recovering.read(),
    "recovered",
    "Failed reads must not poison retry",
  );

  await assert.rejects(
    readResponse(
      Response.json({ error: "Network is busy. Try again." }, { status: 503 }),
    ),
    /Network is busy/,
    "An error response must not become an empty attempt log",
  );
  assert.deepEqual(
    await readResponse(Response.json({ proofs: [] })),
    { proofs: [] },
    "A genuine empty log remains valid",
  );
  await assert.rejects(
    readResponse(
      new Response("<html>Service unavailable</html>", { status: 503 }),
    ),
    /unreadable response/,
  );
  console.log(
    "7 resilience checks passed: shared reads, expiry, invalidation, recovery, HTTP errors, empty logs and non-JSON responses.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
