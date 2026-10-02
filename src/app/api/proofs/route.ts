import { getProofs } from "@/lib/server";
import { requestErrorMessage } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(
      { proofs: await getProofs() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      { error: requestErrorMessage(error) },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
