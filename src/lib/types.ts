export type EventView = {
  address: string;
  mint: string;
  organizer: string;
  name: string;
  venue: string;
  date: number;
  facePrice: number;
  capBps: number;
  royaltyBps: number;
  supply: number;
  sold: number;
  resales: number;
  royaltiesEarned: number;
  eventId: string;
  example: boolean;
};
export type ListingView = {
  address: string;
  event: string;
  seller: string;
  escrow: string;
  rentPayer: string;
  nonce: string;
  price: number;
  createdAt: number;
};
export type Proof = {
  signature: string;
  kind: "over-cap" | "direct-transfer" | "sale";
  date: number;
};
export type Snapshot = {
  owner: string | null;
  ready: boolean;
  network: "localnet" | "devnet";
  message?: string;
  events: EventView[];
  listings: ListingView[];
  tickets: Record<string, number>;
  balance: number;
  proofs: Proof[];
  demoEvent: string | null;
  sponsor: string;
};
export type EventInput = {
  name: string;
  venue: string;
  date: number;
  facePrice: number;
  supply: number;
  capBps: number;
  royaltyBps: number;
};
export type ActionInput = { owner: string } & (
  | { action: "create"; details: EventInput }
  | { action: "primary"; event: string }
  | { action: "list"; event: string; price: number }
  | { action: "cancel" | "resale"; listing: string }
  | { action: "direct"; event: string; destination: string }
);
export type Prepared = {
  transaction: string;
  lastValidBlockHeight: number;
  address?: string;
};
export type Receipt = {
  signature?: string;
  ok: boolean;
  error?: string;
  code?:
    | "OverCap"
    | "TransferNotAllowed"
    | "SoldOut"
    | "InsufficientFunds"
    | "Rejected";
};
export function euros(cents: number) {
  return new Intl.NumberFormat("en-IE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}
export function maxPrice(event: Pick<EventView, "facePrice" | "capBps">) {
  return Math.floor((event.facePrice * (10_000 + event.capBps)) / 10_000);
}
export function shortAddress(address: string) {
  return `${address.slice(0, 5)}…${address.slice(-5)}`;
}
export function eventDate(date: number) {
  const value = new Date(date * 1000);
  if (!Number.isFinite(value.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(value);
}
