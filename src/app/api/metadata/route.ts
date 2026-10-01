import { network } from "@/lib/server";
export async function GET(request: Request) {
  const name =
    new URL(request.url).searchParams.get("name")?.slice(0, 96) ||
    "Fairtix event";
  return Response.json({
    name,
    symbol: "FTX",
    description:
      "Test-credit demo ticket. No real event admission. Resale is subject to the organizer's price cap and royalty.",
    external_url: "https://fairtix-whu.vercel.app",
    properties: {
      category: "ticket",
      network: network(),
      currency: "test credits",
    },
  });
}
