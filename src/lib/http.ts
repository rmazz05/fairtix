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
export function errorResponse(error: unknown) {
  return Response.json(
    {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "The request could not be completed. Try again.",
    },
    { status: 400 },
  );
}
