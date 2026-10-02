# Browser verification

## Initial local-validator run

Verified on 2 October 2026 using the local validator and actual browser controls.

The home-page €60 attempt failed against the €27.50 cap. The seller retained the ticket. A signed direct transfer failed in the transfer hook. A listing at €27.50 succeeded, and a second demo account bought it. Checkout displayed the €27.50 paid, the buyer held the ticket, and the organizer received another €1.37. The organizer’s total increased from €2.74 to €4.11 on the final recorded resale.

An organizer created an €18 event with 80 tickets and a 20% resale cap. The resulting event page displayed €21.60 as its maximum resale price. Cancellation and unauthorized cancellation are covered by the chain suite.

Home, event, ticket management, organizer and creation views were checked at 390px. Home and creation were also checked at 320px. Document width matched viewport width. The resale dialog is centered and scrolls on small screens. Screenshots are in `docs/screenshots`.

The 89-second walkthrough joins captured browser states with cuts. It is labeled as a local validator demo and is not a continuous screen recording. No transaction state, signature or result was simulated for the recording.

Local validator history is ephemeral. The JSON verification report records a successful test run; old transaction receipts can be pruned. These historical receipts are separate from the subsequent devnet verification.

## Initial public preview

The production build at https://fairtix-whu.vercel.app was verified on 2 October. Its state endpoint reports devnet with `ready: false`; it contains no ticket ownership, balance or transaction proofs. The example ticket is explicitly labeled as a preview. Purchase, resale-test and event-creation buttons are disabled. The organizer view does not display sales counters.

The home page and materials page were checked at 390px, with no horizontal overflow. The deployed heading uses Archivo with width axis 90. The walkthrough loads with an 89-second duration and plays through the native video controls. The PDF, PowerPoint and MP4 downloads match the reviewed local artifacts byte for byte. Results are in `public-preview-verification.json`; final preview screenshots are in `docs/screenshots`.

## Public devnet deployment

Both programs were deployed on 2 October 2026. The deployed bytes match the tested binaries. The complete 13-check chain suite passed on devnet, including over-cap rejection, direct-transfer rejection, immutable token-account ownership, escrow cancellation, rollback on underfunded payment and atomic payout. Eight HTTP checks passed against a local interface connected to devnet. A separate read-only network check confirmed that the sponsor rejects the mainnet genesis hash.

The Privy email modal was verified on the public app. The project owner subsequently confirmed successful email sign-in. The project owner also confirmed that the signed-in account completed the €60 attempt and displayed Over the cap; its rejected receipt was independently visible in the organizer log.

The devnet walkthrough uses the local browser interface connected to the actual public deployment. It shows a refused €60 listing, a refused signed direct transfer, a listing at €27.50, a purchase by another account, and €1.37 in organizer royalties. Public Explorer receipts are linked from each result. The recording uses cuts between captured states and contains no simulated transactions.

After a public RPC 429 report, server transaction confirmation was switched from WebSocket subscriptions to HTTP status polling. RPC calls share a serialized queue, with bounded retries for both HTTP 429 and JSON-RPC error 429. Each snapshot now reads the marketplace accounts once and derives the credit balance from the same token-account query used for tickets. A ready anonymous snapshot supplied by the server is reused on hydration. Three regression checks cover both 429 response formats, request serialization and the plain retry message.

The repaired public deployment was retested with a fresh anonymous account. Funding, primary purchase, a rejected €60 listing, direct-transfer recipient setup and rejected transfer all completed without a 429 error. A legal €27.50 listing appeared in escrow on My tickets. Public receipts are in `devnet-http-verification.json`. The public RPC remains a shared test service; a dedicated devnet endpoint would be appropriate before a busy public demo.

Cancellation on the repaired public deployment also completed successfully, returned the ticket to the owner, and removed the listing. The seven-slide deck and 89-second video were updated with devnet evidence and the confirmed email-wallet status.

The final devnet home and materials page were checked at a 390px viewport, with matching document width and no horizontal overflow. The video metadata reports 89 seconds. Final mobile captures are in `docs/screenshots/public-devnet-home-mobile.jpg` and `public-devnet-project-mobile.jpg`.
