#!/usr/bin/env bash
# Đính kèm ảnh/tài liệu vào một công việc trên dash (MCP không gửi được file nhị phân).
#
#   dash-attach.sh <task_id> <file>... [-m "bình luận markdown"]
#
# Có -m: tạo một bình luận và gắn các file vào bình luận đó. Không có: file thành đính kèm của công việc.
# Địa chỉ và token lấy từ cấu hình MCP `yona-dash` của Claude Code (~/.claude.json);
# ghi đè bằng biến môi trường YONA_DASH_MCP_URL và YONA_DASH_MCP_TOKEN.
set -euo pipefail

usage() { sed -n '2,8p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

[[ $# -lt 2 ]] && usage

task_id=$1; shift
comment=""
files=()

while [[ $# -gt 0 ]]; do
  case $1 in
    -m) comment=${2:?thiếu nội dung sau -m}; shift 2 ;;
    *)  [[ -f $1 ]] || { echo "Không thấy file: $1" >&2; exit 1; }; files+=("$1"); shift ;;
  esac
done

[[ ${#files[@]} -eq 0 ]] && usage

read -r mcp_url token < <(python3 - <<'PY'
import json, os, sys
url, token = os.environ.get('YONA_DASH_MCP_URL'), os.environ.get('YONA_DASH_MCP_TOKEN')
if not (url and token):
    config = json.load(open(os.path.expanduser('~/.claude.json')))
    servers = [config.get('mcpServers', {})] + [p.get('mcpServers', {}) for p in config.get('projects', {}).values()]
    server = next((s['yona-dash'] for s in servers if 'yona-dash' in s), None)
    if not server:
        sys.exit('Chưa cấu hình MCP yona-dash (claude mcp add ...) và không có YONA_DASH_MCP_URL/YONA_DASH_MCP_TOKEN.')
    url = url or server['url']
    token = token or server.get('headers', {}).get('Authorization', '').removeprefix('Bearer ').strip()
print(url, token)
PY
)

upload_url=${mcp_url%/mcp}/upload
args=(-sS -H "Authorization: Bearer $token" -F "task_id=$task_id")
[[ -n $comment ]] && args+=(-F "comment=$comment")
for file in "${files[@]}"; do args+=(-F "file[]=@$file"); done

curl "${args[@]}" -w '\n' "$upload_url"
