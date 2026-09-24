#!/usr/bin/env bash
# Đọc DB production (PostgreSQL, chỉ đọc) của yona.vn qua SSH tunnel.
#
#   prod-db.sh "SELECT ..."          chạy câu truy vấn (tối đa PROD_DB_MAX_ROWS dòng in ra, mặc định 500)
#   prod-db.sh --csv "SELECT ..."    như trên, xuất CSV để xử lý tiếp
#   prod-db.sh --tables              bảng đọc được
#   prod-db.sh --describe <bảng>     cột đọc được của một bảng
#   prod-db.sh --close               đóng tunnel
#
# Quyền chỉ đọc do chính DB khoá (role SELECT-only, cột bí mật bị ẩn); script còn đặt thêm
# phiên read-only và timeout 30 giây. Cấu hình: nhóm PROD_DB_* trong .env của repo
# (mẫu ở .env.example, dựng phía server ở references/prod-db-setup.md).
set -euo pipefail

SOCKET=${XDG_RUNTIME_DIR:-/tmp}/yona-prod-db.sock

usage() { sed -n '2,12p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }
die() { echo "LỖI: $*" >&2; exit 1; }

cd "$(dirname "$0")"
# shellcheck source=../../../../scripts/lib/prod-env.sh
source "$(git rev-parse --show-toplevel)/scripts/lib/prod-env.sh"
require_prod_env PROD_DB_SSH_HOST PROD_DB_SSH_PORT PROD_DB_SSH_USER PROD_DB_SSH_KEY PROD_DB_NAME PROD_DB_USER PROD_DB_PASSWORD

MAX_ROWS=${PROD_DB_MAX_ROWS:-500}
REMOTE_PORT=${PROD_DB_PORT:-5432}
LOCAL_PORT=${PROD_DB_LOCAL_PORT:-15432}

ssh_base=(ssh -S "$SOCKET" -p "$PROD_DB_SSH_PORT" -i "${PROD_DB_SSH_KEY/#\~/$HOME}" -o IdentitiesOnly=yes "$PROD_DB_SSH_USER@$PROD_DB_SSH_HOST")

[[ $# -ge 1 ]] || usage

if [[ $1 == --close ]]; then
  "${ssh_base[@]}" -O exit 2>/dev/null || true
  exit 0
fi

open_tunnel() {
  "${ssh_base[@]}" -O check 2>/dev/null && return
  "${ssh_base[@]}" -f -N -M -o ControlPersist=15m -o ExitOnForwardFailure=yes -o BatchMode=yes \
    -L "$LOCAL_PORT:127.0.0.1:$REMOTE_PORT" \
    || die "không mở được tunnel tới $PROD_DB_SSH_HOST:$PROD_DB_SSH_PORT (user $PROD_DB_SSH_USER)"
}

psql_ro() {
  PGPASSWORD=$PROD_DB_PASSWORD \
  PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=30s' \
    psql "host=127.0.0.1 port=$LOCAL_PORT dbname=$PROD_DB_NAME user=$PROD_DB_USER sslmode=disable" \
      -X -q -v ON_ERROR_STOP=1 -P pager=off "$@"
}

limit_rows() {
  awk -v max="$MAX_ROWS" 'NR <= max + 4 { print; next } END { if (NR > max + 4) printf "… cắt bớt: %d dòng, chỉ in %d. Thêm WHERE/LIMIT hoặc đặt PROD_DB_MAX_ROWS.\n", NR, max + 4 > "/dev/stderr" }'
}

open_tunnel

case $1 in
  --tables)
    psql_ro -c "SELECT table_name, COUNT(*) AS readable_columns FROM information_schema.columns
                WHERE table_schema = 'public' GROUP BY table_name ORDER BY table_name" ;;
  --describe)
    [[ ${2:-} =~ ^[A-Za-z0-9_]+$ ]] || usage
    psql_ro -c "SELECT column_name, data_type, is_nullable FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = '$2' ORDER BY ordinal_position" ;;
  --csv)
    [[ -n ${2:-} ]] || usage
    psql_ro --csv -c "$2" | limit_rows ;;
  *)
    psql_ro -c "$1" | limit_rows ;;
esac
