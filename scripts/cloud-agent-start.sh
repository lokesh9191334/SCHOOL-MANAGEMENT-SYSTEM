#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

api_ready() {
  curl -sf "http://127.0.0.1:5000/api/students" >/dev/null 2>&1
}

if ! api_ready; then
  node server.js &
  api_pid=$!

  for _ in $(seq 1 60); do
    if api_ready; then
      break
    fi
    if ! kill -0 "$api_pid" 2>/dev/null; then
      echo "API server exited before becoming ready" >&2
      exit 1
    fi
    sleep 0.5
  done

  if ! api_ready; then
    echo "API server did not become ready on port 5000" >&2
    exit 1
  fi
fi

exec npm run dev -- --host 0.0.0.0 --port 5173
