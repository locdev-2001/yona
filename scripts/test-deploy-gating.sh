#!/usr/bin/env bash
# Kiểm tra logic bỏ-qua-cài-đặt/bỏ-qua-build của deploy.sh mà không chạy deploy thật.
#
# Quyết định sai ở đây nghĩa là production chạy bundle cũ hoặc classmap cũ, nên
# nó cần một bài test chứ không chỉ đọc mắt.
#
#   bash scripts/test-deploy-gating.sh
set -Eeuo pipefail

APP_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"

# Lôi đúng các hằng và hàm cần kiểm tra ra khỏi deploy.sh.
eval "$(sed -n '/^readonly VITE_MANIFEST/,/^readonly COMPOSER_INPUT_PATTERN/p' "$APP_DIR/deploy.sh")"
eval "$(sed -n '/^changed_matching()/,/^}/p' "$APP_DIR/deploy.sh")"
eval "$(sed -n '/^frontend_build_needed()/,/^}/p' "$APP_DIR/deploy.sh")"

failures=0

expect() { # expect <mô tả> <exit code kỳ vọng> <lệnh...>
    local description="$1" expected="$2" actual=0
    shift 2

    "$@" || actual=$?

    if [[ "$actual" -ne "$expected" ]]; then
        printf 'FAIL %s (kỳ vọng %s, nhận %s)\n' "$description" "$expected" "$actual"
        failures=1
    else
        printf 'ok   %s\n' "$description"
    fi
}

CHANGED_FILES=$'app/Models/Contact.php\ntests/Feature/ContactTest.php'
expect 'chỉ đổi PHP: không build frontend' 1 frontend_build_needed
expect 'chỉ đổi PHP: không cài lại composer' 1 changed_matching "$COMPOSER_INPUT_PATTERN"

CHANGED_FILES='resources/js/widget/main.tsx'
expect 'đổi tsx: build frontend' 0 frontend_build_needed

CHANGED_FILES='tailwind/surfaces.cjs'
expect 'đổi scope tailwind theo bề mặt: build frontend' 0 frontend_build_needed

CHANGED_FILES='tailwind.config.js'
expect 'đổi tailwind.config.js: build frontend' 0 frontend_build_needed

CHANGED_FILES='vite.sdk.config.js'
expect 'đổi vite.sdk.config.js: build frontend' 0 frontend_build_needed

CHANGED_FILES='pnpm-lock.yaml'
expect 'đổi lockfile npm: build frontend' 0 frontend_build_needed

CHANGED_FILES='composer.lock'
expect 'đổi composer.lock: cài lại composer' 0 changed_matching "$COMPOSER_INPUT_PATTERN"

CHANGED_FILES='__all__'
expect 'deploy lại cùng revision: dựng lại tất cả' 0 frontend_build_needed

# Lần deploy trước có thể chết giữa chừng và để lại bundle dở dang.
CHANGED_FILES='README.md'
APP_DIR="$(mktemp -d)"
expect 'thiếu bundle: build lại dù git nói không đổi' 0 frontend_build_needed
rmdir "$APP_DIR"

exit "$failures"
