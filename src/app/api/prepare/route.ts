import { prepare } from "@/lib/server";
import { checkRequest, errorResponse } from "@/lib/http";
import type { ActionInput } from "@/lib/types";
export async function POST(request: Request) {
  try {
    checkRequest(request);
    return Response.json(await prepare((await request.json()) as ActionInput));
  } catch (e) {
    return errorResponse(e);
  }
}
