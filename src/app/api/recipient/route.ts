import { prepareRecipient } from "@/lib/server";
import { checkRequest, errorResponse } from "@/lib/http";
export async function POST(request: Request) {
  try {
    checkRequest(request);
    const body = await request.json();
    const signature = await prepareRecipient(body.destination, body.event);
    return Response.json({ ok: true, signature });
  } catch (e) {
    return errorResponse(e);
  }
}
