# Fairtix

Fairtix is a devnet ticket app for student clubs and small venues. An organizer sets a resale cap and royalty when creating an event. Token-2022 transfer hooks restrict ticket movements to marketplace escrow; the marketplace checks the price and pays everyone atomically.

The MVP has an event page, event creation, My tickets, and an organizer dashboard. Its three proof moments are a rejected over-cap listing, a rejected wallet-to-wallet transfer, and a completed resale with an organizer royalty. Prices represent test credits, never real euros. General-admission tickets use one mint per event. Tickets are minted on purchase, bounded by the event supply.

Email sign-in uses Privy when its public application ID is configured. A clearly marked demo account allows testing without an external wallet. The fee sponsor and test-credit faucet run only on localnet or verified Solana devnet.

Scope excludes real payments, check-in, seat maps, mainnet, and identity verification. Cash side deals remain possible. The development upgrade authority is retained and must be disclosed. A club quote may only appear when supplied by a real organizer with permission.

Source: Fairtix — PRD & Design Guide.pdf, supplied by Riccardo on 1 October 2026.
