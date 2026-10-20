#!/usr/bin/env bash
# livekit-server cho máy dev. Cổng, cặp key và địa chỉ webhook đều đọc từ .env của Yona
# (một nguồn), nên không file nào trong repo chứa secret. Cấu hình đi qua biến môi trường
# LIVEKIT_CONFIG thay vì cờ dòng lệnh để secret không hiện trong `ps`.
set -euo pipefail
cd "$(dirname "$0")/../.."

env_value() { sed -n "s/^$1=//p" .env | head -1 | tr -d '"'; }

port=$(env_value LIVEKIT_PORT)
key=$(env_value LIVEKIT_API_KEY)
secret=$(env_value LIVEKIT_API_SECRET)
app_url=$(env_value APP_URL)

if [ -z "$key" ] || [ -z "$secret" ]; then
    echo "Thiếu LIVEKIT_API_KEY/LIVEKIT_API_SECRET trong .env (sinh bằng: livekit-server generate-keys)" >&2
    exit 1
fi

command -v livekit-server > /dev/null || {
    echo "Chưa cài livekit-server: https://github.com/livekit/livekit/releases" >&2
    exit 1
}

export LIVEKIT_CONFIG="
port: ${port:-8613}
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50100
  use_external_ip: false
keys:
  ${key}: ${secret}
webhook:
  api_key: ${key}
  urls:
    - ${app_url}/webhooks/media/livekit
"

exec livekit-server --bind 127.0.0.1 --node-ip 127.0.0.1
