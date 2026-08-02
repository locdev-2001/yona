#!/usr/bin/env bash

# Yona application deployment (no CI/CD).
#
# One-time server provisioning is intentionally out of scope: PHP-FPM/Nginx,
# PostgreSQL, Redis, Node/pnpm, Composer and the long-running process manager
# must already exist. After that, run this file from anywhere:
#
#   ./deploy.sh
#
# Optional environment variables:
#   DEPLOY_BRANCH=main               Git branch to deploy.
#   DEPLOY_REMOTE=origin             Git remote to fetch.
#   DEPLOY_MAINTENANCE=1             Use Laravel maintenance mode.
#   DEPLOY_SEED_PLANS=0              Opt in to the idempotent PlanSeeder.
#   DEPLOY_ZALO_BRIDGE=1             1, 0 or auto. Auto = bridge .env exists.
#   DEPLOY_HEALTHCHECK=1             Check APP_URL/up after deployment.
#   DEPLOY_HEALTH_URL=https://...    Override the health-check URL.
#   DEPLOY_DRY_RUN=1                 Print mutating commands without running them.
#   DEPLOY_ALLOW_ROOT=1              Root is the chosen aaPanel deploy user.
#   DEPLOY_PHP_FPM_SERVICE=php8.4-fpm
#                                      systemd service; set empty to skip it.
#   DEPLOY_PHP_FPM_INIT_SCRIPT=      Auto-detects /etc/init.d/php-fpm-84;
#                                      an explicit value takes precedence.
#   DEPLOY_USE_COREPACK=1            Resolve the repo-pinned pnpm via Corepack.
#   DEPLOY_PHP_BIN=php               Command/path overrides.
#   DEPLOY_NODE_BIN=node
#   DEPLOY_COMPOSER_BIN=composer
#   DEPLOY_PNPM_BIN=pnpm

set -Eeuo pipefail
IFS=$'\n\t'

DEFAULT_PHP_FPM_INIT_SCRIPT=''
if [[ -x /etc/init.d/php-fpm-84 ]]; then
    DEFAULT_PHP_FPM_INIT_SCRIPT='/etc/init.d/php-fpm-84'
fi

readonly SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
readonly APP_DIR="${DEPLOY_APP_DIR:-$SCRIPT_DIR}"
readonly ENV_FILE="$APP_DIR/.env"
readonly BRIDGE_DIR="$APP_DIR/services/zalo-bridge"
readonly LOCK_FILE="$APP_DIR/storage/framework/cache/yona-deploy.lock"

readonly DEPLOY_BRANCH="${DEPLOY_BRANCH:-main}"
readonly DEPLOY_REMOTE="${DEPLOY_REMOTE:-origin}"
readonly DEPLOY_MAINTENANCE="${DEPLOY_MAINTENANCE:-1}"
readonly DEPLOY_SEED_PLANS="${DEPLOY_SEED_PLANS:-0}"
readonly DEPLOY_ZALO_BRIDGE="${DEPLOY_ZALO_BRIDGE:-1}"
readonly DEPLOY_HEALTHCHECK="${DEPLOY_HEALTHCHECK:-1}"
readonly DEPLOY_DRY_RUN="${DEPLOY_DRY_RUN:-0}"
readonly DEPLOY_ALLOW_ROOT="${DEPLOY_ALLOW_ROOT:-1}"
readonly DEPLOY_PHP_FPM_SERVICE="${DEPLOY_PHP_FPM_SERVICE-php8.4-fpm}"
readonly DEPLOY_PHP_FPM_INIT_SCRIPT="${DEPLOY_PHP_FPM_INIT_SCRIPT-$DEFAULT_PHP_FPM_INIT_SCRIPT}"
readonly DEPLOY_USE_COREPACK="${DEPLOY_USE_COREPACK:-1}"

readonly PHP_BIN="${DEPLOY_PHP_BIN:-php}"
readonly NODE_BIN="${DEPLOY_NODE_BIN:-node}"
readonly COMPOSER_BIN="${DEPLOY_COMPOSER_BIN:-composer}"
readonly PNPM_BIN="${DEPLOY_PNPM_BIN:-pnpm}"

MAINTENANCE_ACTIVE=0
STARTED_AT="$(date +%s)"
OLD_REVISION=""
NEW_REVISION=""
REMOTE_REF="FETCH_HEAD"

log() {
    printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

warn() {
    printf '[%s] WARNING: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >&2
}

fail() {
    printf '[%s] ERROR: %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >&2
    exit 1
}

is_enabled() {
    case "${1,,}" in
        1|true|yes|on) return 0 ;;
        *) return 1 ;;
    esac
}

print_command() {
    printf '  +'
    printf ' %q' "$@"
    printf '\n'
}

run() {
    if is_enabled "$DEPLOY_DRY_RUN"; then
        print_command "$@"
        return 0
    fi

    "$@"
}

run_pnpm() {
    if is_enabled "$DEPLOY_USE_COREPACK"; then
        run corepack pnpm "$@"
    else
        run "$PNPM_BIN" "$@"
    fi
}

validate_boolean() {
    local name="$1"
    local value="$2"

    case "${value,,}" in
        1|true|yes|on|0|false|no|off) ;;
        *) fail "$name chỉ nhận 1/0, true/false, yes/no hoặc on/off." ;;
    esac
}

env_file_value() {
    local file="$1"
    local key="$2"
    local value

    value="$(awk -F= -v key="$key" '
        $1 == key {
            sub(/^[^=]*=/, "")
            print
            exit
        }
    ' "$file" | tr -d '\r')"

    if [[ "$value" == \"*\" && "$value" == *\" ]]; then
        value="${value:1:${#value}-2}"
    elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
        value="${value:1:${#value}-2}"
    fi

    printf '%s' "$value"
}

env_value() {
    env_file_value "$ENV_FILE" "$1"
}

bridge_env_value() {
    env_file_value "$BRIDGE_DIR/.env" "$1"
}

zalo_bridge_enabled() {
    case "${DEPLOY_ZALO_BRIDGE,,}" in
        auto) [[ -f "$BRIDGE_DIR/.env" ]] ;;
        1|true|yes|on) return 0 ;;
        0|false|no|off) return 1 ;;
        *) return 1 ;;
    esac
}

validate_zalo_environment() {
    local main_webhook main_send main_ui bridge_webhook bridge_send bridge_ui

    [[ -f "$BRIDGE_DIR/.env" ]] \
        || fail "Zalo bridge đã bật nhưng thiếu $BRIDGE_DIR/.env."

    main_webhook="$(env_value ZALO_BRIDGE_WEBHOOK_SECRET)"
    main_send="$(env_value ZALO_BRIDGE_SEND_SECRET)"
    main_ui="$(env_value ZALO_BRIDGE_UI_SECRET)"
    bridge_webhook="$(bridge_env_value LARAVEL_WEBHOOK_SECRET)"
    bridge_send="$(bridge_env_value BRIDGE_SEND_SECRET)"
    bridge_ui="$(bridge_env_value BRIDGE_UI_SECRET)"

    [[ -n "$main_webhook" && -n "$main_send" && -n "$main_ui" ]] \
        || fail 'Thiếu một hoặc nhiều Zalo secret trong Laravel .env.'
    [[ -n "$bridge_webhook" && -n "$bridge_send" && -n "$bridge_ui" ]] \
        || fail 'Thiếu một hoặc nhiều secret trong services/zalo-bridge/.env.'
    [[ "$main_webhook" == "$bridge_webhook" ]] \
        || fail 'Zalo webhook secret không khớp giữa Laravel và bridge.'
    [[ "$main_send" == "$bridge_send" ]] \
        || fail 'Zalo send secret không khớp giữa Laravel và bridge.'
    [[ "$main_ui" == "$bridge_ui" ]] \
        || fail 'Zalo UI secret không khớp giữa Laravel và bridge.'
    [[ "$(bridge_env_value BRIDGE_HTTP_HOST)" == '127.0.0.1' ]] \
        || fail 'BRIDGE_HTTP_HOST phải là 127.0.0.1 trên production.'
    [[ "$(bridge_env_value LARAVEL_WEBHOOK_URL)" == https://* ]] \
        || fail 'LARAVEL_WEBHOOK_URL của bridge phải dùng HTTPS.'
}

require_command() {
    local command_name="$1"
    command -v "$command_name" >/dev/null 2>&1 || fail "Thiếu command bắt buộc: $command_name"
}

assert_clean_worktree() {
    local untracked_files

    if ! git diff --quiet -- .; then
        fail 'Working tree có thay đổi source chưa commit; không tự ghi đè.'
    fi

    if ! git diff --cached --quiet -- .; then
        fail 'Working tree có thay đổi source đã stage; không tự ghi đè.'
    fi

    untracked_files="$(git ls-files --others --exclude-standard)"
    [[ -z "$untracked_files" ]] || fail "Có file chưa track trong repo:\n$untracked_files"
}

validate_environment() {
    local app_env app_debug app_key app_url broadcast_connection cache_store
    local db_user db_owner queue_connection reverb_app_id reverb_app_key
    local reverb_app_secret reverb_scheme session_driver ssr_enabled

    [[ -f "$ENV_FILE" ]] || fail "Thiếu $ENV_FILE. Tạo .env production trước khi deploy."
    [[ -f "$APP_DIR/artisan" ]] || fail "$APP_DIR không phải root của ứng dụng Yona."
    [[ -d "$APP_DIR/.git" ]] || fail "$APP_DIR không phải Git checkout."

    app_env="$(env_value APP_ENV)"
    app_debug="$(env_value APP_DEBUG)"
    app_key="$(env_value APP_KEY)"
    app_url="$(env_value APP_URL)"
    broadcast_connection="$(env_value BROADCAST_CONNECTION)"
    cache_store="$(env_value CACHE_STORE)"
    db_user="$(env_value DB_USERNAME)"
    db_owner="$(env_value DB_PRIVILEGED_USERNAME)"
    queue_connection="$(env_value QUEUE_CONNECTION)"
    reverb_app_id="$(env_value REVERB_APP_ID)"
    reverb_app_key="$(env_value REVERB_APP_KEY)"
    reverb_app_secret="$(env_value REVERB_APP_SECRET)"
    reverb_scheme="$(env_value REVERB_SCHEME)"
    session_driver="$(env_value SESSION_DRIVER)"
    ssr_enabled="$(env_value INERTIA_SSR_ENABLED)"
    [[ -n "$ssr_enabled" ]] || ssr_enabled='true'

    validate_boolean DEPLOY_MAINTENANCE "$DEPLOY_MAINTENANCE"
    validate_boolean DEPLOY_SEED_PLANS "$DEPLOY_SEED_PLANS"
    validate_boolean DEPLOY_HEALTHCHECK "$DEPLOY_HEALTHCHECK"
    validate_boolean DEPLOY_DRY_RUN "$DEPLOY_DRY_RUN"
    validate_boolean DEPLOY_ALLOW_ROOT "$DEPLOY_ALLOW_ROOT"
    validate_boolean DEPLOY_USE_COREPACK "$DEPLOY_USE_COREPACK"
    validate_boolean INERTIA_SSR_ENABLED "$ssr_enabled"

    case "${DEPLOY_ZALO_BRIDGE,,}" in
        auto|1|true|yes|on|0|false|no|off) ;;
        *) fail 'DEPLOY_ZALO_BRIDGE chỉ nhận auto, 1 hoặc 0.' ;;
    esac

    if ! is_enabled "$DEPLOY_DRY_RUN"; then
        [[ "$app_env" == 'production' ]] || fail 'APP_ENV phải là production.'
        [[ "${app_debug,,}" == 'false' || "$app_debug" == '0' ]] || fail 'APP_DEBUG phải là false.'
    elif [[ "$app_env" != 'production' ]]; then
        warn "Dry-run đang dùng APP_ENV=$app_env; deploy thật sẽ bắt buộc production."
    fi

    [[ -n "$app_key" ]] || fail 'APP_KEY chưa được tạo.'
    [[ "$app_url" == https://* ]] || fail 'APP_URL production phải dùng HTTPS.'
    [[ -n "$db_user" ]] || fail 'DB_USERNAME chưa được cấu hình.'
    [[ -n "$db_owner" ]] || fail 'DB_PRIVILEGED_USERNAME chưa được cấu hình.'
    [[ "$db_user" != "$db_owner" ]] || fail 'Runtime và migration phải dùng hai database role khác nhau.'
    [[ "$db_user" != 'postgres' && "$db_owner" != 'postgres' ]] \
        || fail 'Ứng dụng không được kết nối bằng PostgreSQL superuser postgres.'

    [[ "$queue_connection" == 'redis' ]] || fail 'QUEUE_CONNECTION phải là redis để chạy Horizon.'
    [[ "$cache_store" == 'redis' ]] || fail 'CACHE_STORE phải là redis trên production.'
    [[ "$session_driver" == 'redis' ]] || fail 'SESSION_DRIVER phải là redis trên production.'
    [[ "$broadcast_connection" == 'reverb' ]] || fail 'BROADCAST_CONNECTION phải là reverb.'
    [[ -n "$reverb_app_id" && -n "$reverb_app_key" && -n "$reverb_app_secret" ]] \
        || fail 'Thiếu REVERB_APP_ID/KEY/SECRET.'
    [[ "$reverb_scheme" == 'https' ]] || fail 'REVERB_SCHEME phải là https trên production.'

    if zalo_bridge_enabled; then
        validate_zalo_environment
    fi
}

validate_prerequisites() {
    require_command git
    require_command flock
    require_command curl
    require_command "$PHP_BIN"
    require_command "$NODE_BIN"
    require_command "$COMPOSER_BIN"
    if is_enabled "$DEPLOY_USE_COREPACK"; then
        require_command corepack
    else
        require_command "$PNPM_BIN"
    fi

    if [[ -n "$DEPLOY_PHP_FPM_INIT_SCRIPT" ]]; then
        [[ -x "$DEPLOY_PHP_FPM_INIT_SCRIPT" ]] \
            || fail "PHP-FPM init script không executable: $DEPLOY_PHP_FPM_INIT_SCRIPT"
        if [[ "$EUID" -eq 0 ]]; then
            "$DEPLOY_PHP_FPM_INIT_SCRIPT" status >/dev/null \
                || fail "PHP-FPM không active: $DEPLOY_PHP_FPM_INIT_SCRIPT"
        else
            require_command sudo
            sudo -n "$DEPLOY_PHP_FPM_INIT_SCRIPT" status >/dev/null \
                || fail "Không có quyền sudo hoặc PHP-FPM không active: $DEPLOY_PHP_FPM_INIT_SCRIPT"
        fi
    elif [[ -n "$DEPLOY_PHP_FPM_SERVICE" ]]; then
        require_command systemctl
        [[ "$EUID" -eq 0 ]] || require_command sudo
        systemctl is-active --quiet "$DEPLOY_PHP_FPM_SERVICE" \
            || fail "PHP-FPM service không active: $DEPLOY_PHP_FPM_SERVICE"
    else
        warn 'DEPLOY_PHP_FPM_SERVICE đang trống; PHP-FPM/opcache sẽ không được reload.'
    fi

    if [[ "$EUID" -eq 0 ]] && ! is_enabled "$DEPLOY_ALLOW_ROOT"; then
        fail 'Không deploy bằng root. Dùng deploy user hoặc đặt DEPLOY_ALLOW_ROOT=1 có chủ đích.'
    fi

    "$PHP_BIN" -r 'exit(version_compare(PHP_VERSION, "8.4.0", ">=") ? 0 : 1);' \
        || fail 'Yona yêu cầu PHP >= 8.4.'

    if ! "$NODE_BIN" -e '
        const major = Number(process.versions.node.split(".")[0]);
        process.exit(major >= 22 ? 0 : 1);
    '; then
        if is_enabled "$DEPLOY_DRY_RUN"; then
            warn 'Dry-run đang dùng Node.js < 22; deploy thật sẽ từ chối.'
        else
            fail 'Yona yêu cầu Node.js >= 22.'
        fi
    fi

    [[ -w "$APP_DIR/storage" ]] || fail 'Deploy user không có quyền ghi storage/.'
    [[ -w "$APP_DIR/bootstrap/cache" ]] || fail 'Deploy user không có quyền ghi bootstrap/cache/.'
}

fetch_code() {
    local current_branch

    current_branch="$(git branch --show-current)"
    [[ "$current_branch" == "$DEPLOY_BRANCH" ]] \
        || fail "Server đang ở branch '$current_branch', cần '$DEPLOY_BRANCH'."

    assert_clean_worktree

    log "Fetch $DEPLOY_REMOTE/$DEPLOY_BRANCH"
    run git fetch --prune "$DEPLOY_REMOTE" "$DEPLOY_BRANCH"

    if is_enabled "$DEPLOY_DRY_RUN"; then
        return 0
    fi

    git rev-parse --verify "$REMOTE_REF^{commit}" >/dev/null 2>&1 \
        || fail "Không tìm thấy $REMOTE_REF sau khi fetch."

    git merge-base --is-ancestor HEAD "$REMOTE_REF" \
        || fail 'HEAD trên server có commit riêng hoặc đã lệch lịch sử; không tự reset.'
}

activate_code() {
    log "Kích hoạt revision từ $DEPLOY_REMOTE/$DEPLOY_BRANCH"
    run git merge --ff-only "$REMOTE_REF"
}

enable_maintenance_mode() {
    is_enabled "$DEPLOY_MAINTENANCE" || return 0

    if [[ ! -f "$APP_DIR/vendor/autoload.php" ]]; then
        log 'First deploy chưa có vendor/; bỏ qua maintenance mode.'
        return 0
    fi

    log 'Bật maintenance mode'
    run "$PHP_BIN" artisan down --retry=60 --refresh=15 --no-interaction
    MAINTENANCE_ACTIVE=1
}

install_dependencies() {
    log 'Cài PHP dependencies production'
    run "$COMPOSER_BIN" install \
        --no-dev \
        --no-interaction \
        --prefer-dist \
        --optimize-autoloader

    log 'Cài frontend build dependencies'
    run_pnpm install --frozen-lockfile --prod=false
}

build_frontend() {
    local ssr_enabled
    ssr_enabled="$(env_value INERTIA_SSR_ENABLED)"
    [[ -n "$ssr_enabled" ]] || ssr_enabled='true'

    if is_enabled "$ssr_enabled"; then
        log 'Build frontend + Inertia SSR bundle'
        run_pnpm run build:ssr
    else
        log 'Build frontend (SSR đã tắt)'
        run_pnpm run build
    fi
}

deploy_database() {
    log 'Chạy forward-only migrations bằng pgsql_privileged'
    run "$PHP_BIN" artisan migrate \
        --database=pgsql_privileged \
        --force \
        --no-interaction

    log 'Đồng bộ role và permission catalogs'
    run "$PHP_BIN" artisan db:seed \
        --class=PlatformPermissionSeeder \
        --force \
        --no-interaction
    run "$PHP_BIN" artisan db:seed \
        --class=AdminPermissionSeeder \
        --force \
        --no-interaction

    if is_enabled "$DEPLOY_SEED_PLANS"; then
        log 'Đồng bộ plan catalog'
        run "$PHP_BIN" artisan db:seed \
            --class=PlanSeeder \
            --force \
            --no-interaction
    fi
}

prepare_laravel() {
    log 'Tạo storage link và cache production'
    run "$PHP_BIN" artisan storage:link --no-interaction
    run "$PHP_BIN" artisan optimize:clear --no-interaction
    run "$PHP_BIN" artisan optimize --no-interaction
}

deploy_zalo_bridge() {
    local bridge_port

    zalo_bridge_enabled || {
        log 'Bỏ qua Zalo bridge theo cấu hình deploy.'
        return 0
    }

    log 'Cài và restart Zalo bridge'
    run_pnpm --dir "$BRIDGE_DIR" install --frozen-lockfile --prod
    run mkdir -p "$APP_DIR/storage/logs/zalo-bridge"

    run_pnpm --dir "$BRIDGE_DIR" exec pm2 startOrReload \
        "$BRIDGE_DIR/ecosystem.config.cjs" \
        --update-env

    bridge_port="$(awk -F= '$1 == "BRIDGE_HTTP_PORT" { print $2; exit }' "$BRIDGE_DIR/.env" | tr -d '\r')"
    [[ -n "$bridge_port" ]] || bridge_port=3710

    log "HTTP readiness Zalo bridge trên 127.0.0.1:$bridge_port"
    run curl --fail --silent --show-error --max-time 10 \
        --retry 15 --retry-delay 2 --retry-connrefused \
        --output /dev/null \
        "http://127.0.0.1:$bridge_port/"

    check_zalo_sessions "$bridge_port"
}

check_zalo_sessions() {
    local bridge_port="$1"
    local connection_id found=0 health session_file ui_secret unhealthy=0

    if is_enabled "$DEPLOY_DRY_RUN"; then
        log 'Dry-run: bỏ qua kiểm tra trạng thái các Zalo session.'
        return 0
    fi

    [[ -d "$BRIDGE_DIR/.sessions" ]] || {
        log 'Zalo bridge chưa có session đã lưu; sẽ kết nối bằng QR sau.'
        return 0
    }

    ui_secret="$(bridge_env_value BRIDGE_UI_SECRET)"
    while IFS= read -r session_file; do
        [[ "$(basename "$session_file")" =~ ^c([0-9]+)\.json$ ]] || continue
        connection_id="${BASH_REMATCH[1]}"
        found=1

        if health="$(curl --fail --silent --show-error --max-time 10 \
            -H "X-Bridge-UI-Secret: $ui_secret" \
            "http://127.0.0.1:$bridge_port/health?connection_id=$connection_id")" \
            && printf '%s' "$health" | "$NODE_BIN" -e '
                let body = "";
                process.stdin.on("data", chunk => body += chunk);
                process.stdin.on("end", () => {
                    try {
                        process.exit(JSON.parse(body).connected === true ? 0 : 1);
                    } catch {
                        process.exit(1);
                    }
                });
            '; then
            log "Zalo session connection_id=$connection_id đã kết nối."
        else
            unhealthy=1
            warn "Zalo session connection_id=$connection_id chưa kết nối; cần kiểm tra/scan QR."
        fi
    done < <(find "$BRIDGE_DIR/.sessions" -maxdepth 1 -type f -name 'c*.json' -print)

    [[ "$found" -eq 1 ]] || log 'Zalo bridge chưa có session đã lưu; sẽ kết nối bằng QR sau.'
    [[ "$unhealthy" -eq 0 ]] \
        || warn 'Deploy tiếp tục vì trạng thái đăng nhập Zalo là dữ liệu vận hành, không phải lỗi release.'
}

reload_php_fpm() {
    if [[ -n "$DEPLOY_PHP_FPM_INIT_SCRIPT" ]]; then
        log "Reload PHP-FPM bằng init script: $DEPLOY_PHP_FPM_INIT_SCRIPT"
        if [[ "$EUID" -eq 0 ]]; then
            run "$DEPLOY_PHP_FPM_INIT_SCRIPT" reload
        else
            run sudo -n "$DEPLOY_PHP_FPM_INIT_SCRIPT" reload
        fi
        return 0
    fi

    [[ -n "$DEPLOY_PHP_FPM_SERVICE" ]] || return 0

    log "Reload PHP-FPM service: $DEPLOY_PHP_FPM_SERVICE"
    if [[ "$EUID" -eq 0 ]]; then
        run systemctl reload "$DEPLOY_PHP_FPM_SERVICE"
    else
        run sudo -n systemctl reload "$DEPLOY_PHP_FPM_SERVICE"
    fi
}

restart_application_processes() {
    local queue_connection ssr_enabled
    queue_connection="$(env_value QUEUE_CONNECTION)"
    ssr_enabled="$(env_value INERTIA_SSR_ENABLED)"
    [[ -n "$ssr_enabled" ]] || ssr_enabled='true'

    if [[ "$queue_connection" == 'redis' ]]; then
        log 'Yêu cầu Horizon khởi động lại graceful'
        run "$PHP_BIN" artisan horizon:terminate --no-interaction
    fi

    log 'Yêu cầu Reverb khởi động lại graceful'
    run "$PHP_BIN" artisan reverb:restart --no-interaction

    if is_enabled "$ssr_enabled"; then
        log 'Yêu cầu Inertia SSR khởi động lại'
        run "$PHP_BIN" artisan inertia:stop-ssr --no-interaction
    fi

    reload_php_fpm
}

disable_maintenance_mode() {
    [[ "$MAINTENANCE_ACTIVE" -eq 1 ]] || return 0

    log 'Tắt maintenance mode'
    run "$PHP_BIN" artisan up --no-interaction
    MAINTENANCE_ACTIVE=0
}

health_check() {
    local app_url health_url
    is_enabled "$DEPLOY_HEALTHCHECK" || return 0

    app_url="$(env_value APP_URL)"
    health_url="${DEPLOY_HEALTH_URL:-${app_url%/}/up}"

    [[ "$health_url" != '/up' ]] \
        || fail 'Không thể health-check vì APP_URL và DEPLOY_HEALTH_URL đều trống.'

    log "Health check: $health_url"
    if is_enabled "$DEPLOY_DRY_RUN"; then
        print_command curl --fail --silent --show-error --max-time 10 \
            --retry 5 --retry-delay 2 "$health_url"
        return 0
    fi

    if ! curl --fail --silent --show-error --max-time 10 \
        --retry 5 --retry-delay 2 \
        "$health_url" >/dev/null; then
        if is_enabled "$DEPLOY_MAINTENANCE"; then
            warn 'Health check thất bại; đưa ứng dụng trở lại maintenance mode.'
            if "$PHP_BIN" artisan down --retry=60 --refresh=15 --no-interaction; then
                MAINTENANCE_ACTIVE=1
            else
                warn "CRITICAL: Không bật lại được maintenance mode. Chạy thủ công: $PHP_BIN artisan down"
            fi
        fi

        fail "Health check thất bại: $health_url"
    fi
}

on_exit() {
    local exit_code=$?

    if [[ "$exit_code" -ne 0 && "$MAINTENANCE_ACTIVE" -eq 1 ]]; then
        warn 'Deploy thất bại; ứng dụng được GIỮ ở maintenance mode để tránh chạy bản dở dang.'
        warn "Sửa lỗi rồi chạy lại $0. Không chạy 'artisan up' trước khi xác minh."
    fi
}

main() {
    local duration

    trap on_exit EXIT

    cd "$APP_DIR"
    validate_environment
    validate_prerequisites

    if is_enabled "$DEPLOY_DRY_RUN"; then
        log 'Dry-run: bỏ qua tạo và giữ deployment lock.'
    else
        mkdir -p "$(dirname "$LOCK_FILE")"
        exec 9>"$LOCK_FILE"
        flock -n 9 || fail 'Một tiến trình deploy khác đang chạy.'
    fi

    OLD_REVISION="$(git rev-parse --short HEAD)"
    log "Bắt đầu deploy $DEPLOY_BRANCH từ revision $OLD_REVISION"

    fetch_code
    enable_maintenance_mode
    activate_code
    install_dependencies
    build_frontend
    deploy_database
    prepare_laravel
    deploy_zalo_bridge
    restart_application_processes
    disable_maintenance_mode
    health_check

    NEW_REVISION="$(git rev-parse --short HEAD)"
    duration="$(( $(date +%s) - STARTED_AT ))"
    log "Deploy thành công: $OLD_REVISION -> $NEW_REVISION (${duration}s)"
}

main "$@"
