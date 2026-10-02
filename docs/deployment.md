# Deploying Fairtix

The public app already runs on Solana devnet. A new deployment must use its own test-only sponsor and program addresses. Do not use the interface preview for a working transaction demo.

## RPC

Create an account-scoped **Solana devnet** RPC endpoint with a provider such as Helius or QuickNode. Place its complete HTTPS URL in `.env.local` as `SOLANA_RPC_URL`. Provider URLs can contain credentials; keep them server-side and out of source, screenshots and issue reports.

```bash
npm run rpc:check
```

The check confirms the devnet genesis hash and reads the deployed marketplace. It never signs or sends a transaction and never prints the endpoint's credentials.

Server calls share a serialized queue, retry HTTP and JSON-RPC 429 responses, and confirm transactions by HTTP polling. Brief public read caches combine duplicate reads within a process. These reduce load but do not replace a provider's rate limit or guarantee service availability.

## Deploy the programs

Follow the README's full local setup in a separate checkout to generate your own keys and build both programs. For devnet, change `.env.local` to:

```dotenv
FAIRTIX_UI_ONLY=0
SOLANA_NETWORK=devnet
SOLANA_RPC_URL=YOUR_DEVNET_HTTPS_RPC_URL
SOLANA_SPONSOR_KEY_PATH=.keys/sponsor.json
FAIRTIX_DEMO_EVENT=
```

Fund the **public address** of `.keys/sponsor.json` from the Solana devnet faucet. The current two programs require about 3.41 test SOL in persistent rent, plus temporary deployment buffers; about 6 test SOL is sufficient for sequential deployments. This is test funding, not a purchase.

```bash
solana program deploy chain/target/deploy/fairtix_market.so --program-id .keys/market.json --keypair .keys/sponsor.json --url devnet
solana program deploy chain/target/deploy/fairtix_hook.so --program-id .keys/hook.json --keypair .keys/sponsor.json --url devnet
npm run seed
npm run test:chain
```

`seed` records your currency and example-event addresses. The frontend's program IDs and Anchor IDL must match the programs you deploy. The development upgrade authority remains with the deployment key; disclose this when describing enforcement guarantees.

## Host the web app

Use Node 22 and Next.js on Vercel. Set these server-only environment variables for each deployment environment:

| Variable                  | Value                                                                                    |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| `SOLANA_NETWORK`          | `devnet`                                                                                 |
| `SOLANA_RPC_URL`          | Your complete account-scoped devnet endpoint                                             |
| `SOLANA_SPONSOR_KEY`      | JSON secret-key array from your test-only sponsor, stored as a sensitive Vercel variable |
| `FAIRTIX_DEMO_EVENT`      | Example event address produced by seed                                                   |
| `FAIRTIX_PREVIEW`         | `0` for normal use; `1` can show a disabled example if the programs are missing          |
| `FAIRTIX_EXCLUDED_EVENTS` | Optional comma-separated automated-test event addresses                                  |

`SOLANA_SPONSOR_KEY_PATH` is only used locally. Never commit or display the sponsor key. The public application verifies devnet's genesis hash and disables localnet on Vercel. `FAIRTIX_UI_ONLY` is a local interface-preview setting and is ignored on Vercel.

Client configuration:

| Variable                   | Value                                |
| -------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_SITE_URL`     | Your app's HTTPS URL                 |
| `NEXT_PUBLIC_PRIVY_APP_ID` | Optional public Privy application ID |

These variables are embedded at build time, so changing them requires a new build. The private provider endpoint stays server-side; the Privy SDK's devnet connector uses the public Solana endpoint. Application submission and confirmation go through Fairtix's server RPC.

Run `npm run build`, deploy, then verify `/api/state` reports `ready: true` and `network: devnet`. Run the HTTP suite against the deployed URL and try a purchase, rejected listing and completed resale in the browser.

## Email sign-in

See [Privy setup](privy-setup.md) for email login, embedded Solana wallets and allowed origins. The frontend requires only the public App ID, not a Privy App Secret. Leaving the ID empty keeps the two browser demo accounts available.

## Troubleshooting

| Symptom                                 | Check                                                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Interface preview, buttons disabled     | Set `FAIRTIX_UI_ONLY=0`, start the validator or select a devnet RPC, and deploy/seed the programs.               |
| Sponsor not configured or mismatched    | Check your local key path or server secret and the admin address in the client/program configuration.            |
| Ledger busy / 429                       | Validate the devnet provider URL, quota and supported methods. Retry after a short pause.                        |
| Example event missing                   | Check `FAIRTIX_DEMO_EVENT` and rerun seed against the intended ledger.                                           |
| Email sign-in fails                     | Check the public App ID, allowed origin and Solana embedded-wallet configuration; rebuild after changing the ID. |
| Confirmation takes longer than expected | Check My tickets and the transaction receipt before submitting another purchase.                                 |
