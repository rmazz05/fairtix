import { getSnapshot } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const u = new URL(request.url);
    return Response.json(
      await getSnapshot(
        u.searchParams.get("owner") || undefined,
        u.searchParams.get("proof") === "1",
      ),
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return Response.json(
      {
        ready: false,
        error:
          e instanceof Error
            ? e.message
            : "The ticket ledger is unavailable. Try refreshing in a moment.",
      },
      { status: 503 },
    );
  }
}
