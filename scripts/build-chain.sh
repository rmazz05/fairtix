#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
command -v cargo-build-sbf >/dev/null || { echo "Install Agave 4.3.0 or newer so cargo-build-sbf is on PATH."; exit 1; }
command -v anchor >/dev/null || { echo "Install Anchor CLI 0.32.1 so anchor is on PATH."; exit 1; }
# Build individually: a workspace-wide build unifies the hook's CPI dependency
# and would compile the marketplace without its own entrypoint.
cargo-build-sbf --manifest-path chain/programs/fairtix_market/Cargo.toml --arch v3
cargo-build-sbf --manifest-path chain/programs/fairtix_hook/Cargo.toml --arch v3
cd chain
mkdir -p target/idl target/types
anchor idl build --program-name fairtix_market --out target/idl/fairtix_market.json --out-ts target/types/fairtix_market.ts
cd ..
mkdir -p src/lib/idl
cp chain/target/idl/fairtix_market.json src/lib/idl/fairtix_market.json
cp chain/target/types/fairtix_market.ts src/lib/idl/fairtix_market.ts
cp chain/program-ids.json src/lib/program-ids.json
