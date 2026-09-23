#!/usr/bin/env bash
# Kiểm tra bước `nginx 404` của deploy.sh trên một máy chủ giả, không deploy thật.
#
# Bước này tồn tại để bắt một vhost đè phản hồi của Laravel mà /up không thấy.
# Nó im lặng khi vhost hỏng thì cũng vô dụng như không có, nên cần một bài test
# cho mọi trạng thái: vhost đúng, nginx đè mọi 404, rule ảnh nuốt route Laravel
# đuôi ảnh, và các trạng thái áp runbook dở dang.
#
#   bash scripts/test-deploy-nginx-probe.sh
set -Eeuo pipefail

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

# Lôi đúng các hằng và hàm cần kiểm tra ra khỏi deploy.sh.
eval "$(grep '^readonly NOT_FOUND_PAGE_MARKER=' "$APP_DIR/deploy.sh")"
for function_name in warn is_enabled print_command verify_nginx_passes_laravel_errors \
    warn_if_static_rule_swallows is_laravel_not_found_page is_json_response; do
    eval "$(sed -n "/^${function_name}()/,/^}/p" "$APP_DIR/deploy.sh")"
done

DEPLOY_HEALTHCHECK=1
DEPLOY_DRY_RUN=0

# Máy chủ giả mô phỏng nginx của aaPanel: tiền tố đầu đường dẫn chọn một cấu hình
# vhost, phần còn lại là URL thật mà deploy.sh dò.
PORT_FILE="$(mktemp)"
python3 - "$PORT_FILE" <<'PY' &
import re
import sys
from http.server import BaseHTTPRequestHandler, HTTPServer

# Rule ảnh tĩnh aaPanel luôn sinh: `location ~ .*\.(gif|jpg|jpeg|png|bmp|swf)$`.
STATIC_IMAGE = re.compile(r'.*\.(gif|jpg|jpeg|png|bmp|swf)$')

# intercept: fastcgi_intercept_errors on · error_page: còn `error_page 404` ·
# prefixes: các `location ^~` đã thêm trong laravel-runtime.conf.
VHOSTS = {
    'healthy': {'intercept': False, 'error_page': False, 'prefixes': ('/attachments/', '/hc/')},
    'error-page-kept': {'intercept': False, 'error_page': True, 'prefixes': ('/attachments/', '/hc/')},
    'intercept': {'intercept': True, 'error_page': True, 'prefixes': ()},
    'static-rule': {'intercept': False, 'error_page': False, 'prefixes': ()},
    'attachments-only': {'intercept': False, 'error_page': False, 'prefixes': ('/attachments/',)},
    'half-applied': {'intercept': False, 'error_page': True, 'prefixes': ()},
}

NGINX_404 = (b'<html>\r\n<head><title>404 Not Found</title></head>\r\n<body>\r\n'
             b'<center><h1>404 Not Found</h1></center>\r\n<hr><center>nginx</center>\r\n</body>\r\n</html>\r\n', 'text/html')
LARAVEL_404 = (b'<!DOCTYPE html><html><body data-page="not_found"><div id="app"></div></body></html>',
               'text/html; charset=utf-8')
LARAVEL_JSON_404 = (b'{"error":"Resource could not be found"}', 'application/json')


def respond(vhost, path):
    """Mọi URL dò đều là thứ Laravel trả 404, câu hỏi chỉ là ai viết thân trang."""
    laravel = LARAVEL_JSON_404 if path.startswith('/api/') else LARAVEL_404
    swallowed = STATIC_IMAGE.match(path) and not path.startswith(vhost['prefixes'])

    if swallowed:
        # nginx không thấy tệp tĩnh. Còn error_page thì nó chuyển tiếp vào
        # index.php với REQUEST_URI gốc, Laravel viết thân trang, mã vẫn 404.
        return laravel if vhost['error_page'] and not vhost['intercept'] else NGINX_404

    if vhost['intercept'] and vhost['error_page']:
        return NGINX_404

    return laravel


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        mode, _, rest = self.path.lstrip('/').partition('/')
        body, content_type = respond(VHOSTS[mode], '/' + rest)

        self.send_response(404)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


server = HTTPServer(('127.0.0.1', 0), Handler)
with open(sys.argv[1], 'w') as port_file:
    port_file.write(str(server.server_port))
server.serve_forever()
PY
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null; rm -f "$PORT_FILE"' EXIT

for _ in $(seq 50); do
    [[ -s "$PORT_FILE" ]] && break
    sleep 0.1
done
PORT="$(cat "$PORT_FILE")"

failures=0

# probe <kiểu vhost> -> in ra mọi dòng cảnh báo mà bước kiểm phát ra.
probe() {
    APP_URL_UNDER_TEST="http://127.0.0.1:$PORT/$1"
    env_value() { printf '%s' "$APP_URL_UNDER_TEST"; }
    verify_nginx_passes_laravel_errors 2>&1 >/dev/null || true
}

expect_warnings() { # expect_warnings <mô tả> <kiểu vhost> <mẫu phải có...> -- <mẫu không được có...>
    local description="$1" mode="$2" output pattern must_match=1
    shift 2
    output="$(probe "$mode")"

    for pattern in "$@"; do
        if [[ "$pattern" == '--' ]]; then
            must_match=0
            continue
        fi

        if [[ "$must_match" -eq 1 && "$output" != *"$pattern"* ]] \
            || [[ "$must_match" -eq 0 && "$output" == *"$pattern"* ]]; then
            printf 'FAIL %s (mẫu %s "%s")\nOutput:\n%s\n' "$description" \
                "$([[ "$must_match" -eq 1 ]] && echo 'thiếu' || echo 'thừa')" "$pattern" "$output"
            failures=1
            return
        fi
    done

    printf 'ok   %s\n' "$description"
}

expect_warnings 'vhost đúng: không cảnh báo gì' healthy \
    -- 'WARNING'

expect_warnings 'đã thêm location nhưng còn error_page 404: vẫn chạy đúng, nhắc gỡ error_page' error-page-kept \
    'chuyển 404 của tệp tĩnh vào Laravel' 'error_page 404' \
    -- 'Route Laravel đuôi ảnh không tới được Laravel' 'đè trang 404 của Laravel' 'API lạ không trả JSON'

expect_warnings 'nginx đè mọi 404: cảnh báo trang 404 và API, chưa kết luận về route đuôi ảnh' intercept \
    'đè trang 404 của Laravel' 'API lạ không trả JSON' 'mục 7' \
    -- 'Route Laravel đuôi ảnh không tới được Laravel'

expect_warnings 'rule ảnh nuốt route đuôi ảnh: cảnh báo cả /attachments và /hc' static-rule \
    'Route Laravel đuôi ảnh không tới được Laravel' 'location ^~ /attachments/' 'location ^~ /hc/' \
    -- 'đè trang 404 của Laravel' 'API lạ không trả JSON' 'error_page 404'

expect_warnings 'mới thêm location cho /attachments: chỉ cảnh báo /hc' attachments-only \
    'location ^~ /hc/' 'lượt xem bài Help Center' \
    -- 'location ^~ /attachments/' 'đè trang 404 của Laravel'

# Chỉ tắt intercept mà quên location: ảnh thật nhận 404 dù id 0 vẫn ra trang Yona.
# Không được im lặng ở đây.
expect_warnings 'tắt intercept nhưng quên location và còn error_page: không im lặng' half-applied \
    'chuyển 404 của tệp tĩnh vào Laravel' 'chưa kiểm được' \
    -- 'đè trang 404 của Laravel'

DEPLOY_HEALTHCHECK=0
expect_warnings 'DEPLOY_HEALTHCHECK=0: bỏ qua' intercept \
    -- 'WARNING'

exit "$failures"
