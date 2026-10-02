#!/usr/bin/env bash
# Đọc log production qua API Log Viewer (Bearer token chỉ đọc, chỉ GET).
#
#   prod-logs.sh files                          danh sách tệp log (identifier, tên, cỡ, mới nhất trước)
#   prod-logs.sh search <file> <query> [page]   tìm trong một tệp; query như ô tìm kiếm, vd "IMAP" hoặc "log-index:337"
#   prod-logs.sh <link /logs?file=…&query=…>   dán thẳng link copy từ giao diện Log Viewer
#
# Cấu hình: LOG_VIEWER_API_TOKEN trong .env của repo — cùng giá trị với .env production.
set -euo pipefail

readonly LOG_URL=${LOG_URL:-https://yona.vn}
ENV_FILE=$(git rev-parse --show-toplevel)/.env
TOKEN=${LOG_VIEWER_API_TOKEN:-$(grep -E '^LOG_VIEWER_API_TOKEN=' "$ENV_FILE" 2>/dev/null | tail -n 1 | cut -d= -f2- | tr -d "\"'" || true)}
[[ -n $TOKEN ]] || { echo "LỖI: thiếu LOG_VIEWER_API_TOKEN trong $ENV_FILE" >&2; exit 1; }

[[ $# -ge 1 ]] || { sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

api_get() {
  curl -fsS -G -H "Authorization: Bearer $TOKEN" -H 'Accept: application/json' "${LOG_URL%/}/logs/api/$1" "${@:2}"
}

print_files() {
  jq -r '.[] | [.identifier, .name, .size_formatted] | @tsv'
}

# Một dòng (query log-index:N) in đủ context kèm stack trace; danh sách thì cắt context cho gọn.
print_logs() {
  local context_limit=$1
  jq -r --argjson limit "$context_limit" '
    (.logs // [])[] |
    "#\(.index) [\(.datetime // "")] \(.level_name // "") \(.message // "")"
    + (if (.context // {}) != {} and (.context // []) != [] then
        "\n  context: " + (.context | tojson | if $limit > 0 then .[0:$limit] else . end)
      else "" end)
    + "\n",
    "-- trang \(.pagination.current_page // 1)/\(.pagination.last_page // 1), \(.pagination.total // 0) dòng"
      + (if .hasMoreResults then " · mới quét \(.percentScanned)% tệp, chạy lại để quét tiếp" else "" end)
      + (if .query_error then " · lỗi query: \(.query_error)" else "" end)'
}

context_limit_for() {
  [[ $1 == log-index:* ]] && echo 0 || echo 300
}

search_logs() {
  local file=$1 query=$2 page=${3:-1}
  api_get logs --data-urlencode "file=$file" --data-urlencode "query=$query" --data-urlencode "page=$page" | print_logs "$(context_limit_for "$query")"
}

case $1 in
  files)  api_get files | print_files ;;
  search) [[ $# -ge 3 ]] || { echo "Dùng: prod-logs.sh search <file> <query> [page]" >&2; exit 2; }; search_logs "$2" "$3" "${4:-1}" ;;
  http*)
    query_string=${1#*\?}
    [[ $query_string != "$1" ]] || { echo "Link không có tham số file/query" >&2; exit 2; }
    query=$(python3 -c 'import sys, urllib.parse; print(urllib.parse.parse_qs(sys.argv[1]).get("query", [""])[0])' "$query_string")
    api_get "logs?$query_string" | print_logs "$(context_limit_for "$query")" ;;
  *) echo "Không hiểu '$1'. Dùng: files | search <file> <query> [page] | <link>" >&2; exit 2 ;;
esac
