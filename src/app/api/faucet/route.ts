import { faucet } from "@/lib/server";
import { checkRequest, errorResponse } from "@/lib/http";
export async function POST(request: Request) {
  try {
    checkRequest(request);
    const body = await request.json();
    return Response.json(await faucet(body.owner));
  } catch (e) {
    return errorResponse(e);
  }
}
