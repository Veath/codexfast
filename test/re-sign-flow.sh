#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

CODEXFAST_TEST_ROOT="${ROOT_DIR}" pnpm exec tsx "${ROOT_DIR}/test/re-sign-flow.mts"
