#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v solana-test-validator >/dev/null || { echo "Install Agave 4.3.0 or newer so solana-test-validator is on PATH."; exit 1; }
exec solana-test-validator --ledger chain/.ledger --rpc-port 8920 --faucet-port 9920 --gossip-port 11200 --dynamic-port-range 11201-11250 --bind-address 127.0.0.1 "$@"
