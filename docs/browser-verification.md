# Browser and setup verification

Verified on 2 October 2026. Chain outcomes below come from actual transactions, not simulated UI state.

## Public deployment

Both programs are deployed on Solana devnet. Their deployed bytes match the binaries used by the recorded [13-check chain suite](chain-verification.json); addresses and binary hashes are in [the deployment report](devnet-deployment.json).

The project owner confirmed email login and a transaction signed with the embedded wallet. The rejected transaction was independently visible in the attempt log.

After the reported RPC 429, server calls were serialized, retries added for HTTP and JSON-RPC throttling, and confirmation moved to HTTP polling. Public purchases, rejected listings, signed direct-transfer attempts, permitted listings and cancellation were retested. Receipts are in [the public HTTP/browser report](devnet-http-verification.json).

The shared standard devnet RPC is retained for this submission at the project owner's request. It can still throttle under load. Event/listing reads are shared for up to two seconds within a server process; owner balances are fetched separately. Attempt-log reads use their own endpoint and a one-second cache. Confirmed transactions invalidate both caches in the process that confirms them. Errors are not cached.

## Seller and buyer demo

The `/demo` route shows the seller and buyer on one screen. No email, wallet extension, account picker or navigation between ticket pages is needed. Listing and purchasing remain separate actions.

An anonymous browser connected to public devnet completed a rejected €60 listing, a signed direct-transfer rejection, a €27.50 listing and a buyer purchase. Reloading after listing preserved the exact listing and price. All five receipts finalized. The resale moved one ticket to the buyer and settled €25.58 to the seller, €1.37 to the organizer and €0.55 to Fairtix in one transaction. The [split demo report](split-demo-verification.json) contains transaction signatures and independently checked token-balance changes. The price rejection, permitted listing and buyer purchase were then repeated on the live site. All four public receipts finalized, with the same ownership change and payment split. Reloading the completed public demo restored its results.

The demo regression suite checks signatures from both browser-owned participants, price preservation and recovery after lost primary, listing and resale responses. Retrying replays the same signed transaction instead of making a duplicate purchase. Unexpected rejection codes are not presented as successful cap enforcement. Storage failure stops setup before any network action.

The attempt-log response handling distinguishes a failed HTTP request from an actual empty log, retains previously loaded proofs on failure, and provides a retry action. The resilience suite covers HTTP 503 and non-JSON responses explicitly.

## Clean checkout

A separate directory contained only repository files and a fresh `npm ci` install. The README's default interface-preview configuration served an explicitly disabled example with `ready: false`, no ownership and no connected ledger. TypeScript, the ten RPC/resilience checks and the production build passed.

The full local procedure was then executed with newly generated keys, Agave 4.3.0 and Anchor CLI 0.32.1. Both programs compiled, deployed to a fresh validator and seeded successfully. All 13 chain checks and all nine HTTP checks passed. These local program addresses are separate from the public deployment's addresses.

An intermittent consumed-response error found during the clean run was corrected by draining each upstream RPC response once and returning a fresh response body to the Solana client.

The current interface checks and public captures are recorded in [submission verification](submission-verification.json) and `docs/screenshots`. The home page follows Jet HR's composition, with condensed Mona Sans headings, an integrated header and a compact action panel. Home and demo were checked at widths of 1280 and 390 pixels. Document width matched viewport width. The hero contains no ticket; the demo uses two columns on desktop and stacks seller above buyer on mobile. The clean-checkout and full chain procedures above predate these interface revisions and remain setup and program verification.

The example is now “Football match” in both the event account and mint metadata. A new public browser run rejected a €60 listing, listed at €27.50 and completed the resale. Event creation and all four demo transactions finalized. Independent token-balance checks confirmed the ownership change and payment split. The current event's receipts and metadata are recorded under `footballExample` in [the split demo report](split-demo-verification.json).

## Submission materials

Deck hashes and link checks are in [the material verification report](devnet-materials-verification.json).

The eight-slide deck contains no invented organizer endorsement or pilot commitment. Native PowerPoint and Google Slides application behavior has not been tested.
