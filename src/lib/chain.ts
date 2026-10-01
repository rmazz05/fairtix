import { AnchorProvider, BN, Program, type Wallet } from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  ComputeBudgetProgram,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import type { FairtixMarket } from "./idl/fairtix_market";
import marketIdl from "./idl/fairtix_market.json";
import ids from "./program-ids.json";
import type { EventView, ListingView, EventInput } from "./types";

export type MarketProgram = Program<FairtixMarket>;
export const MARKET = new PublicKey(ids.market);
export const HOOK = new PublicKey(ids.hook);
export const ADMIN = new PublicKey(ids.admin);
export const CONFIG = PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  MARKET,
)[0];
export const ata = (mint: PublicKey, owner: PublicKey) =>
  getAssociatedTokenAddressSync(mint, owner, true, TOKEN_2022_PROGRAM_ID);
export const metaList = (mint: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("extra-account-metas"), mint.toBuffer()],
    HOOK,
  )[0];
export const eventPda = (organizer: PublicKey, id: BN) =>
  PublicKey.findProgramAddressSync(
    [
      Buffer.from("event"),
      organizer.toBuffer(),
      id.toArrayLike(Buffer, "le", 8),
    ],
    MARKET,
  )[0];
export const mintPda = (event: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), event.toBuffer()],
    MARKET,
  )[0];
export const listingPda = (event: PublicKey, seller: PublicKey, nonce: BN) =>
  PublicKey.findProgramAddressSync(
    [
      Buffer.from("listing"),
      event.toBuffer(),
      seller.toBuffer(),
      nonce.toArrayLike(Buffer, "le", 8),
    ],
    MARKET,
  )[0];
export function marketProgram(connection: Connection, wallet: Wallet) {
  return new Program<FairtixMarket>(
    marketIdl as FairtixMarket,
    new AnchorProvider(connection, wallet, { commitment: "confirmed" }),
  );
}
export function commonAccounts(
  currency: PublicKey,
  treasury: PublicKey,
  owner: PublicKey,
  sponsor: PublicKey,
) {
  return {
    payer: sponsor,
    config: CONFIG,
    currencyMint: currency,
    treasury,
    buyer: owner,
    buyerCurrency: ata(currency, owner),
    treasuryCurrency: ata(currency, treasury),
    tokenProgram: TOKEN_2022_PROGRAM_ID,
    associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  };
}
export async function createInstruction(
  program: MarketProgram,
  sponsor: PublicKey,
  organizer: PublicKey,
  id: BN,
  details: EventInput,
  uri: string,
) {
  const event = eventPda(organizer, id),
    ticketMint = mintPda(event);
  const instruction = await program.methods
    .createEvent(
      id,
      details.name,
      details.venue,
      new BN(details.date),
      new BN(details.facePrice),
      details.supply,
      details.capBps,
      details.royaltyBps,
      uri,
    )
    .accountsStrict({
      payer: sponsor,
      organizer,
      event,
      ticketMint,
      extraAccountMetaList: metaList(ticketMint),
      hookProgram: HOOK,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  return { instruction, event };
}
export async function primaryInstruction(
  program: MarketProgram,
  sponsor: PublicKey,
  owner: PublicKey,
  event: EventView,
  currency: PublicKey,
  treasury: PublicKey,
) {
  const mint = new PublicKey(event.mint),
    organizer = new PublicKey(event.organizer);
  return program.methods
    .buyPrimary()
    .accountsStrict({
      ...commonAccounts(currency, treasury, owner, sponsor),
      event: new PublicKey(event.address),
      ticketMint: mint,
      organizer,
      buyerTicket: ata(mint, owner),
      organizerCurrency: ata(currency, organizer),
    })
    .instruction();
}
export async function listInstruction(
  program: MarketProgram,
  sponsor: PublicKey,
  owner: PublicKey,
  event: EventView,
  nonce: BN,
  price: number,
) {
  const eventKey = new PublicKey(event.address),
    mint = new PublicKey(event.mint),
    listing = listingPda(eventKey, owner, nonce);
  const instruction = await program.methods
    .list(nonce, new BN(price))
    .accountsStrict({
      payer: sponsor,
      seller: owner,
      event: eventKey,
      ticketMint: mint,
      listing,
      escrow: ata(mint, listing),
      sellerTicket: ata(mint, owner),
      extraAccountMetaList: metaList(mint),
      hookProgram: HOOK,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .instruction();
  return { instruction, listing };
}
export async function cancelInstruction(
  program: MarketProgram,
  owner: PublicKey,
  event: EventView,
  listing: ListingView,
) {
  const mint = new PublicKey(event.mint);
  return program.methods
    .cancel()
    .accountsStrict({
      seller: owner,
      event: new PublicKey(event.address),
      ticketMint: mint,
      listing: new PublicKey(listing.address),
      escrow: new PublicKey(listing.escrow),
      sellerTicket: ata(mint, owner),
      rentPayer: new PublicKey(listing.rentPayer),
      extraAccountMetaList: metaList(mint),
      hookProgram: HOOK,
      tokenProgram: TOKEN_2022_PROGRAM_ID,
    })
    .instruction();
}
export async function resaleInstruction(
  program: MarketProgram,
  sponsor: PublicKey,
  owner: PublicKey,
  event: EventView,
  listing: ListingView,
  currency: PublicKey,
  treasury: PublicKey,
) {
  const mint = new PublicKey(event.mint),
    seller = new PublicKey(listing.seller),
    organizer = new PublicKey(event.organizer);
  return program.methods
    .buyResale()
    .accountsStrict({
      ...commonAccounts(currency, treasury, owner, sponsor),
      event: new PublicKey(event.address),
      ticketMint: mint,
      seller,
      organizer,
      listing: new PublicKey(listing.address),
      escrow: new PublicKey(listing.escrow),
      rentPayer: new PublicKey(listing.rentPayer),
      buyerTicket: ata(mint, owner),
      sellerCurrency: ata(currency, seller),
      organizerCurrency: ata(currency, organizer),
      extraAccountMetaList: metaList(mint),
      hookProgram: HOOK,
    })
    .instruction();
}
export function transaction(instructions: TransactionInstruction[]) {
  return new Transaction().add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 350_000 }),
    ...instructions,
  );
}
