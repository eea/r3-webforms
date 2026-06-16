#!/usr/bin/env bash
# generate-client.sh
# Generates a typed TypeScript API client from the BFF's OpenAPI spec.
#
# Steps:
#   1. dotnet build apps/api
#   2. Start the API in the background
#   3. Download the OpenAPI spec from http://localhost:3000/swagger/v1/swagger.json
#   4. Stop the API
#   5. Run openapi-ts → apps/pams/src/services/api-client/
#   6. Copy to apps/fgases/src/services/api-client/
#
# Run from the repo root:
#   bash scripts/generate-client.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_SPEC="$REPO_ROOT/apps/api/api.json"
PAMS_OUT="$REPO_ROOT/apps/pams/src/services/api-client"
FGASES_OUT="$REPO_ROOT/apps/fgases/src/services/api-client"
API_PID=""

cleanup() {
  if [ -n "$API_PID" ] && kill -0 "$API_PID" 2>/dev/null; then
    echo "==> Stopping API (pid $API_PID)..."
    kill "$API_PID"
    wait "$API_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# 1. Build
echo "==> Building API..."
dotnet build "$REPO_ROOT/apps/api" --nologo

# 2. Start API in background (Development env so Swagger is active)
echo "==> Starting API in background..."
ASPNETCORE_ENVIRONMENT=Development \
  dotnet run --project "$REPO_ROOT/apps/api" --no-build &
API_PID=$!

# 3. Wait until /health responds
echo "==> Waiting for API to be ready..."
MAX_WAIT=30
WAITED=0
until curl -sf http://localhost:3000/health > /dev/null 2>&1; do
  sleep 1
  WAITED=$((WAITED + 1))
  if [ "$WAITED" -ge "$MAX_WAIT" ]; then
    echo "ERROR: API did not start within ${MAX_WAIT}s"
    exit 1
  fi
done
echo "    Ready after ${WAITED}s"

# 4. Download spec
echo "==> Downloading OpenAPI spec..."
curl -sf http://localhost:3000/swagger/v1/swagger.json -o "$API_SPEC"
echo "    Saved to $API_SPEC"

# 5. Stop API early (no longer needed)
cleanup
API_PID=""

# 6. Generate TypeScript client
echo "==> Generating TypeScript client..."
cd "$REPO_ROOT"
pnpm exec openapi-ts

# 7. Copy to fgases
echo "==> Copying client to apps/fgases/src/services/api-client/..."
mkdir -p "$FGASES_OUT"
cp -r "$PAMS_OUT/." "$FGASES_OUT/"

echo ""
echo "Done. Generated files in $PAMS_OUT:"
ls "$PAMS_OUT"
