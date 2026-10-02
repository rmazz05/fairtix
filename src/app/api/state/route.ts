import { getSnapshot } from "@/lib/server";
import { requestErrorMessage } from "@/lib/http";
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
        error: requestErrorMessage(e),
      },
      { status: 503 },
    );
  }
}
