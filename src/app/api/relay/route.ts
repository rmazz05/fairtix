import { relay } from "@/lib/server";
import { checkRequest, errorResponse } from "@/lib/http";
export async function POST(request: Request) {
  try {
    checkRequest(request);
    const body = await request.json();
    if (typeof body.transaction !== "string")
      throw new Error("Sign a ticket transaction first.");
    return Response.json(await relay(body.transaction));
  } catch (e) {
    return errorResponse(e);
  }
}
