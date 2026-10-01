import type { Metadata } from "next";
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { Shell } from "@/components/shell";
import { getSnapshot, network } from "@/lib/server";
import { ADMIN } from "@/lib/chain";
import type { Snapshot } from "@/lib/types";
import "./globals.css";
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"],
  variable: "--font-heading",
  display: "swap",
});
const plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});
const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
});
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: {
    default: "Fairtix · Tickets with a resale cap",
    template: "%s · Fairtix",
  },
  description:
    "Student event tickets with an organizer-set resale cap. Buy a ticket, resell it within the cap, and pay the organizer a royalty. A Solana devnet demo.",
  robots: { index: false, follow: false },
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initial: Snapshot = await getSnapshot().catch((e) => ({
    owner: null,
    ready: false,
    network: network(),
    message: e instanceof Error ? e.message : "The test ledger is unavailable.",
    events: [],
    listings: [],
    tickets: {},
    proofs: [],
    balance: 0,
    demoEvent: null,
    sponsor: ADMIN.toBase58(),
  }));
  return (
    <html
      lang="en"
      className={`${archivo.variable} ${plex.variable} ${mono.variable}`}
    >
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <Providers initial={initial}>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}
