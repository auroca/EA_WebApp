#!/bin/sh
# This script generates /usr/share/nginx/html/env.js from environment variables
set -e

API_URL_VAL="${API_URL:-${VITE_API_URL:-}}"

ENV_FILE="/usr/share/nginx/html/env.js"

if [ -n "$API_URL_VAL" ]; then
  cat > "$ENV_FILE" <<EOF
window.__EA_API_URL__ = "${API_URL_VAL}";
EOF
else
  # Create an empty file so client can safely read the variable
  echo "window.__EA_API_URL__ = undefined;" > "$ENV_FILE"
fi

exec nginx -g 'daemon off;'
