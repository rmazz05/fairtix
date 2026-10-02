# Browser verification

Verified on 2 October 2026 using the local validator and actual browser controls.

The home-page €60 attempt failed against the €27.50 cap. The seller retained the ticket. A signed direct transfer failed in the transfer hook. A listing at €27.50 succeeded, and a second demo account bought it. Checkout displayed the €27.50 paid, the buyer held the ticket, and the organizer received another €1.37. The organizer’s total increased from €2.74 to €4.11 on the final recorded resale.

An organizer created an €18 event with 80 tickets and a 20% resale cap. The resulting event page displayed €21.60 as its maximum resale price. Cancellation and unauthorized cancellation are covered by the chain suite.

Home, event, ticket management, organizer and creation views were checked at 390px. Home and creation were also checked at 320px. Document width matched viewport width. The resale dialog is centered and scrolls on small screens. Screenshots are in `docs/screenshots`.

The 89-second walkthrough joins captured browser states with cuts. It is labeled as a local validator demo and is not a continuous screen recording. No transaction state, signature or result was simulated for the recording.

Local validator history is ephemeral. The JSON verification report records a successful test run; old transaction receipts can be pruned. Public devnet receipts must be recorded again after deployment. Privy email sign-in has not been runtime-tested because an application ID has not been supplied.

## Public preview

The production build at https://fairtix-whu.vercel.app was verified on 2 October. Its state endpoint reports devnet with `ready: false`; it contains no ticket ownership, balance or transaction proofs. The example ticket is explicitly labeled as a preview. Purchase, resale-test and event-creation buttons are disabled. The organizer view does not display sales counters.

The home page and materials page were checked at 390px, with no horizontal overflow. The deployed heading uses Archivo with width axis 90. The walkthrough loads with an 89-second duration and plays through the native video controls. The PDF, PowerPoint and MP4 downloads match the reviewed local artifacts byte for byte. Results are in `public-preview-verification.json`; final preview screenshots are in `docs/screenshots`.
