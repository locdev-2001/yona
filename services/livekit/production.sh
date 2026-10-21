#!/usr/bin/env bash
# livekit-server cho production (chạy dưới supervisor, xem docs/deployment.md mục 14). Mọi giá
# trị đọc từ .env của Yona, không file nào trong repo chứa secret; cấu hình đi qua LIVEKIT_CONFIG
# để secret không hiện trong `ps`. Khác bản dev: lấy IP công khai, mở dải UDP rộng, bật TURN.
set -euo pipefail
cd "$(dirname "$0")/../.."

env_value() { sed -n "s/^$1=//p" .env | head -1 | tr -d '"'; }

port=$(env_value LIVEKIT_PORT)
key=$(env_value LIVEKIT_API_KEY)
secret=$(env_value LIVEKIT_API_SECRET)
app_url=$(env_value APP_URL)
turn_domain=$(env_value LIVEKIT_TURN_DOMAIN)
turn_cert=$(env_value LIVEKIT_TURN_CERT_FILE)
turn_key=$(env_value LIVEKIT_TURN_KEY_FILE)

if [ -z "$key" ] || [ -z "$secret" ]; then
    echo "Thiếu LIVEKIT_API_KEY/LIVEKIT_API_SECRET trong .env (sinh bằng: livekit-server generate-keys)" >&2
    exit 1
fi

case "$app_url" in
    https://*) ;;
    *) echo "APP_URL phải là https:// để webhook của LiveKit tới được Laravel" >&2; exit 1 ;;
esac

command -v livekit-server > /dev/null || {
    echo "Chưa cài livekit-server: https://github.com/livekit/livekit/releases" >&2
    exit 1
}

# TURN/TLS chỉ bật khi đã có tên miền và chứng chỉ; thiếu thì vẫn chạy với TURN/UDP + ICE TCP.
turn_tls=""
if [ -n "$turn_domain" ] && [ -r "$turn_cert" ] && [ -r "$turn_key" ]; then
    turn_tls="
  domain: ${turn_domain}
  tls_port: 5349
  cert_file: ${turn_cert}
  key_file: ${turn_key}"
fi

# room.auto_create tắt: phòng chỉ mở qua CreateRoom của CallService (có trần người, hẹn giờ
# đóng); vé cũ không dựng lại được phòng đã đóng. Cổng HTTP/WebSocket (LIVEKIT_PORT) chỉ nghe
# trong máy, nginx đưa wss://rtc.<domain> vào; UDP/TCP media và TURN mở ra ngoài qua firewall.
export LIVEKIT_CONFIG="
port: ${port:-7880}
log_level: info
room:
  auto_create: false
  empty_timeout: 60
  departure_timeout: 20
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 60000
  use_external_ip: true
turn:
  enabled: true
  udp_port: 3478${turn_tls}
keys:
  ${key}: ${secret}
webhook:
  api_key: ${key}
  urls:
    - ${app_url}/webhooks/media/livekit
"

exec livekit-server
