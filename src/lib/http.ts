const requests = new Map<string, { count: number; until: number }>();
export function checkRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host"))
    throw new Error("Open Fairtix directly to make a ticket request.");
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const now = Date.now(),
    existing = requests.get(ip);
  const window =
    existing && existing.until > now
      ? existing
      : { count: 0, until: now + 60_000 };
  if (++window.count > 40)
    throw new Error("Too many test requests. Wait a minute and try again.");
  requests.set(ip, window);
  if (requests.size > 2000)
    for (const [key, value] of requests)
      if (value.until < now) requests.delete(key);
}
export function requestErrorMessage(error: unknown) {
  if (!(error instanceof Error))
    return "The request could not be completed. Try again.";
  if (
    /429|too many requests|rate.limit|fetch failed|ETIMEDOUT|TimeoutError|ECONNRESET/i.test(
      error.message,
    )
  )
    return "Solana's test network is busy. Wait a few seconds, then try again.";
  return error.message;
}
export function errorResponse(error: unknown) {
  return Response.json(
    {
      ok: false,
      error: requestErrorMessage(error),
    },
    { status: 400 },
  );
}
