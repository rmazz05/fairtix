import { Keypair, Transaction } from "@solana/web3.js";
import { readResponse } from "./client-http";
import {
  maxPrice,
  type ActionInput,
  type EventView,
  type Prepared,
  type Receipt,
  type Snapshot,
} from "./types";

type Step = "primary" | "cap" | "direct" | "listing" | "sale";
export type DemoProgress = {
  primary?: Receipt;
  cap?: Receipt & { price: number };
  direct?: Receipt;
  listing?: Receipt & { address: string; price: number };
  sale?: Receipt;
};
type StoredDemo = {
  seller: number[];
  buyer: number[];
  progress: DemoProgress;
  pending?: {
    step: Step;
    transaction: string;
    address?: string;
    price?: number;
  };
};
export type DemoStorage = Pick<Storage, "getItem" | "setItem">;
export type DemoRequest = <T>(path: string, body?: unknown) => Promise<T>;
const request: DemoRequest = async <T>(path: string, body?: unknown) => {
  const response = await fetch(
    path,
    body === undefined
      ? { cache: "no-store" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
  );
  return readResponse<T>(response);
};

/** Uses browser-owned test keys and the same signed transactions as checkout. */
export class ResaleDemo {
  private readonly key: string;
  private readonly seller: Keypair;
  private readonly buyer: Keypair;
  private stored: StoredDemo;
  readonly cap: number;
  readonly rejectedPrice: number;

  constructor(
    readonly event: EventView,
    private readonly storage: DemoStorage,
    private readonly api: DemoRequest = request,
    private readonly update: (
      progress: DemoProgress,
      status?: string,
    ) => void = () => {},
  ) {
    this.key = `fairtix-resale-demo-v1:${event.address}`;
    this.cap = maxPrice(event);
    this.rejectedPrice = Math.max(6000, this.cap + 100);
    const saved = storage.getItem(this.key);
    this.stored = saved
      ? JSON.parse(saved)
      : {
          seller: [...Keypair.generate().secretKey],
          buyer: [...Keypair.generate().secretKey],
          progress: {},
        };
    this.seller = Keypair.fromSecretKey(Uint8Array.from(this.stored.seller));
    this.buyer = Keypair.fromSecretKey(Uint8Array.from(this.stored.buyer));
    if (!saved) this.storage.setItem(this.key, JSON.stringify(this.stored));
  }

  get progress(): DemoProgress {
    return { ...this.stored.progress };
  }
  get addresses() {
    return {
      seller: this.seller.publicKey.toBase58(),
      buyer: this.buyer.publicKey.toBase58(),
    };
  }

  private save(status?: string) {
    this.storage.setItem(this.key, JSON.stringify(this.stored));
    this.update(this.progress, status);
  }

  private accept(
    step: Step,
    receipt: Receipt,
    address?: string,
    price?: number,
  ) {
    if (step === "cap" && (receipt.ok || receipt.code !== "OverCap"))
      throw new Error(
        receipt.error ||
          "The price test did not return an over-cap rejection. Try again.",
      );
    if (
      step === "direct" &&
      (receipt.ok || receipt.code !== "TransferNotAllowed")
    )
      throw new Error(
        receipt.error ||
          "The transfer test did not return a blocked transfer. Try again.",
      );
    if (step !== "cap" && step !== "direct" && !receipt.ok)
      throw new Error(
        receipt.error || "The ticket action could not be completed. Try again.",
      );
    if (!receipt.signature)
      throw new Error("The transaction receipt is missing. Try again.");
    if (step === "listing") {
      if (!address)
        throw new Error("The resale listing is missing. Try again.");
      this.stored.progress.listing = { ...receipt, address, price: price! };
    } else if (step === "cap")
      this.stored.progress.cap = { ...receipt, price: price! };
    else this.stored.progress[step] = receipt;
  }

  private async recover() {
    const pending = this.stored.pending;
    if (!pending) return;
    this.update(this.progress, "Checking the previous transaction…");
    // Replay identical signed bytes after a lost response. Never sign a second purchase.
    await this.relay(pending);
  }

  private async relay(pending: NonNullable<StoredDemo["pending"]>) {
    let receipt: Receipt;
    try {
      receipt = await this.api<Receipt>("/api/relay", {
        transaction: pending.transaction,
      });
    } catch (error) {
      // A conclusively expired transaction can be prepared again on the next click.
      if (
        error instanceof Error &&
        /expired|blockhash not found/i.test(error.message)
      ) {
        delete this.stored.pending;
        this.save();
      }
      throw error;
    }
    delete this.stored.pending;
    try {
      this.accept(pending.step, receipt, pending.address, pending.price);
    } finally {
      this.save();
    }
  }

  private async send(
    step: Step,
    input: ActionInput,
    signer: Keypair,
    status: string,
  ) {
    this.update(this.progress, status);
    const prepared = await this.api<Prepared>("/api/prepare", input);
    const tx = Transaction.from(
      Uint8Array.from(atob(prepared.transaction), (c) => c.charCodeAt(0)),
    );
    tx.partialSign(signer);
    const transaction = btoa(String.fromCharCode(...tx.serialize()));
    this.stored.pending = {
      step,
      transaction,
      address: prepared.address,
      price: input.action === "list" ? input.price : undefined,
    };
    // Persist before broadcasting so a refresh or connection failure can resume safely.
    this.save(status);
    await this.relay(this.stored.pending);
  }

  private async state(owner: string) {
    const snapshot = await this.api<Snapshot>(`/api/state?owner=${owner}`);
    if (!snapshot.ready)
      throw new Error(
        snapshot.message || "The demo is temporarily unavailable. Try again.",
      );
    return snapshot;
  }

  private async ticket() {
    if (this.stored.progress.listing || this.stored.progress.sale) return;
    this.update(this.progress, "Getting the demo ticket…");
    const state = await this.state(this.addresses.seller);
    if ((state.tickets[this.event.address] || 0) > 0) return;
    if (state.balance < this.event.facePrice)
      await this.api("/api/faucet", { owner: this.addresses.seller });
    await this.send(
      "primary",
      {
        owner: this.addresses.seller,
        action: "primary",
        event: this.event.address,
      },
      this.seller,
      "Getting the demo ticket…",
    );
  }

  async tryPrice(price = this.rejectedPrice) {
    await this.recover();
    if (this.stored.progress.cap?.price === price || this.stored.progress.sale)
      return this.progress;
    if (this.stored.progress.listing)
      throw new Error(
        "The ticket is already listed at the allowed price. Complete the sale to continue.",
      );
    await this.ticket();
    await this.send(
      "cap",
      {
        owner: this.addresses.seller,
        action: "list",
        event: this.event.address,
        price,
      },
      this.seller,
      "Checking the asking price…",
    );
    return this.progress;
  }

  async tryTransfer() {
    await this.recover();
    if (this.stored.progress.direct || this.stored.progress.sale)
      return this.progress;
    if (this.stored.progress.listing)
      throw new Error(
        "The ticket is already listed. Complete the sale to continue.",
      );
    await this.ticket();
    this.update(this.progress, "Preparing the transfer…");
    await this.api("/api/recipient", {
      destination: this.addresses.buyer,
      event: this.event.address,
    });
    await this.send(
      "direct",
      {
        owner: this.addresses.seller,
        action: "direct",
        event: this.event.address,
        destination: this.addresses.buyer,
      },
      this.seller,
      "Checking the direct transfer…",
    );
    return this.progress;
  }

  async list(price: number) {
    await this.recover();
    if (this.stored.progress.sale || this.stored.progress.listing)
      return this.progress;
    if (!Number.isSafeInteger(price) || price < 1)
      throw new Error("Enter a valid asking price.");
    if (price > this.cap) return this.tryPrice(price);
    await this.ticket();
    await this.send(
      "listing",
      {
        owner: this.addresses.seller,
        action: "list",
        event: this.event.address,
        price,
      },
      this.seller,
      "Listing the ticket…",
    );
    return this.progress;
  }

  async buy() {
    await this.recover();
    if (this.stored.progress.sale) return this.progress;
    const listing = this.stored.progress.listing;
    if (!listing) throw new Error("List the ticket on the seller side first.");
    this.update(this.progress, "Preparing the buyer…");
    const buyer = await this.state(this.addresses.buyer);
    if (buyer.balance < listing.price)
      await this.api("/api/faucet", { owner: this.addresses.buyer });
    await this.send(
      "sale",
      {
        owner: this.addresses.buyer,
        action: "resale",
        listing: listing.address,
      },
      this.buyer,
      "Completing the resale…",
    );
    return this.progress;
  }

  restart() {
    if (
      this.stored.pending ||
      (this.stored.progress.listing && !this.stored.progress.sale)
    )
      throw new Error("Complete the current sale before starting again.");
    this.stored.progress = {};
    this.save();
  }
}
