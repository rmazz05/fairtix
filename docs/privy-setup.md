# Email sign-in

The public Fairtix application is configured with Privy App ID `cmuqk9pml01eu0clbtwxi7mln`. The project owner confirmed successful email sign-in and an embedded-wallet transaction on 2 October 2026. No App Secret is used by the frontend. The steps below apply when configuring another deployment.

1. Sign in at https://dashboard.privy.io and create an app named Fairtix.
2. Enable email as a login method and Solana embedded wallets. Choose automatic wallet creation for users without wallets.
3. Add the allowed origins `http://localhost:3034`, `http://127.0.0.1:3034` and `https://fairtix-whu.vercel.app`.
4. Copy the public App ID into `.env.local` as `NEXT_PUBLIC_PRIVY_APP_ID`. It is safe to share the App ID; do not share the App Secret.
5. Restart the local server. For Vercel, set the same public variable and redeploy because Next.js embeds it at build time.

The SDK signs the transaction with the user's embedded Solana wallet. The server sponsors fees. The sponsor signature must survive client signing, and the relay checks every signature before submission.

Until an app ID is configured, the app offers a labeled demo account with a browser-generated test key. That account is intended only for test credits and is not email authentication.

Reference: https://docs.privy.io/basics/react/setup and https://docs.privy.io/wallets/using-wallets/solana/sign-a-transaction
