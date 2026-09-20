#!/usr/bin/env bash

# Yona application deployment (no CI/CD).
#
# One-time server provisioning is intentionally out of scope: PHP-FPM/Nginx,
# PostgreSQL, Redis, Node/pnpm, Composer và process manager (queue worker,
# Reverb, cron scheduler) phải tồn tại sẵn. Sau đó chạy file này từ bất kỳ đâu:
#
#   ./deploy.sh
#
# Optional environment variables:
#   DEPLOY_BRANCH=main               Git branch to deploy.
#   DEPLOY_REMOTE=origin             Git remote to fetch.
#   DEPLOY_MAINTENANCE=1             Use Laravel maintenance mode.
#   DEPLOY_FRESH_DB=0                1 = XOÁ SẠCH database rồi migrate lại.
#   DEPLOY_FRESH_DB_CONFIRM=         Bắt buộc khi FRESH_DB=1: đúng tên DB_DATABASE.
#   DEPLOY_SEED_DEMO=0               Chạy DatabaseSeeder (workspace demo Acme Inc).
#   DEPLOY_ZALO_BRIDGE=auto          1, 0 hoặc auto. Auto = bridge .env tồn tại.
#   DEPLOY_MANAGE_SERVICES=1         Tự dựng supervisor (queue+reverb), cron
#                                      scheduler và pm2 startup. 0 = tự lo tay.
#   DEPLOY_RUNTIME_USER=www          User chạy queue worker/Reverb/scheduler.
#   DEPLOY_SUPERVISOR_CONF_DIR=/etc/supervisor/conf.d
#   DEPLOY_SUPERVISORCTL=            Đè lệnh supervisorctl (mặc định: tự dò aaPanel).
#   DEPLOY_FORCE_REBUILD=0           1 = cài lại dependency và build FE dù không
#                                      có file nào đổi giữa hai revision.
#   DEPLOY_HEALTHCHECK=1             Check APP_URL/up after deployment.
#   DEPLOY_HEALTH_URL=https://...    Override the health-check URL.
#   DEPLOY_DRY_RUN=1                 Print mutating commands without running them.
#   DEPLOY_ALLOW_ROOT=1              Root is the chosen aaPanel deploy user.
#   DEPLOY_RUNTIME_GROUP=www         PHP-FPM/Supervisor runtime group.
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
readonly DEPLOY_FRESH_DB="${DEPLOY_FRESH_DB:-0}"
readonly DEPLOY_FRESH_DB_CONFIRM="${DEPLOY_FRESH_DB_CONFIRM:-}"
readonly DEPLOY_SEED_DEMO="${DEPLOY_SEED_DEMO:-0}"
readonly DEPLOY_ZALO_BRIDGE="${DEPLOY_ZALO_BRIDGE:-auto}"
readonly DEPLOY_MANAGE_SERVICES="${DEPLOY_MANAGE_SERVICES:-1}"
readonly DEPLOY_RUNTIME_USER="${DEPLOY_RUNTIME_USER:-www}"
readonly DEPLOY_SUPERVISOR_CONF_DIR="${DEPLOY_SUPERVISOR_CONF_DIR:-/etc/supervisor/conf.d}"
readonly DEPLOY_FORCE_REBUILD="${DEPLOY_FORCE_REBUILD:-0}"
readonly DEPLOY_HEALTHCHECK="${DEPLOY_HEALTHCHECK:-1}"
readonly DEPLOY_DRY_RUN="${DEPLOY_DRY_RUN:-0}"
readonly DEPLOY_ALLOW_ROOT="${DEPLOY_ALLOW_ROOT:-1}"
readonly DEPLOY_RUNTIME_GROUP="${DEPLOY_RUNTIME_GROUP:-www}"
readonly DEPLOY_PHP_FPM_SERVICE="${DEPLOY_PHP_FPM_SERVICE-php8.4-fpm}"
readonly DEPLOY_PHP_FPM_INIT_SCRIPT="${DEPLOY_PHP_FPM_INIT_SCRIPT-$DEFAULT_PHP_FPM_INIT_SCRIPT}"
readonly DEPLOY_USE_COREPACK="${DEPLOY_USE_COREPACK:-1}"

readonly PHP_BIN="${DEPLOY_PHP_BIN:-php}"
readonly NODE_BIN="${DEPLOY_NODE_BIN:-node}"
readonly COMPOSER_BIN="${DEPLOY_COMPOSER_BIN:-composer}"
readonly PNPM_BIN="${DEPLOY_PNPM_BIN:-pnpm}"

readonly CRON_FILE='/etc/cron.d/yona-scheduler'
readonly SUPERVISOR_QUEUE_PROGRAM='yona-horizon'
readonly SUPERVISOR_REVERB_PROGRAM='yona-reverb'
# Program không còn dùng: yona-queue là worker `queue:work` trước khi chuyển
# sang Horizon — để lại nghĩa là hai nguồn cùng lấy job từ một hàng đợi.
readonly SUPERVISOR_LEGACY_PROGRAMS=('yona-queue' 'yona-ssr')

readonly MINIMUM_PHP_VERSION='8.3.0'
readonly MINIMUM_NODE_MAJOR=22
readonly DEFAULT_BRIDGE_PORT=8612

readonly VITE_MANIFEST='public/build/manifest.json'
readonly SDK_BUNDLE='public/packs/js/sdk.js'
# Mọi thứ vite/tailwind đọc khi build. Lệch pattern này = build thừa hoặc thiếu.
readonly FRONTEND_INPUT_PATTERN='^(resources/|theme/|tailwind/|scripts/check-css-surfaces\.mjs$|package\.json$|pnpm-lock\.yaml$|vite\..*config\.js$|tailwind\..*config\.js$|postcss\.config\.js$|tsconfig.*\.json$)'
readonly COMPOSER_INPUT_PATTERN='^composer\.(json|lock)$'

MAINTENANCE_ACTIVE=0
CHANGED_FILES=''
STEP_TIMINGS=()
STARTED_AT="$(date +%s)"
OLD_REVISION=""
NEW_REVISION=""
DATABASE_WAS_RESET=0
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

# Đo từng bước để biết maintenance window thật sự tiêu ở đâu, thay vì đoán.
step() {
    local label="$1"
    local started
    shift

    started="$(date +%s)"
    "$@"
    STEP_TIMINGS+=("$(printf '%6ss  %s' "$(( $(date +%s) - started ))" "$label")")
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

validate_database_reset() {
    local database_name

    is_enabled "$DEPLOY_FRESH_DB" || return 0

    database_name="$(env_value DB_DATABASE)"
    [[ -n "$database_name" ]] || fail 'DEPLOY_FRESH_DB=1 nhưng .env không khai DB_DATABASE.'

    [[ "$DEPLOY_FRESH_DB_CONFIRM" == "$database_name" ]] \
        || fail "DEPLOY_FRESH_DB=1 sẽ XOÁ SẠCH database '$database_name'. Xác nhận bằng DEPLOY_FRESH_DB_CONFIRM=$database_name."
}

validate_environment() {
    local app_env app_debug app_key app_url broadcast_connection cache_store
    local db_connection db_user queue_connection reverb_app_id reverb_app_key
    local reverb_app_secret reverb_scheme session_driver

    [[ -f "$ENV_FILE" ]] || fail "Thiếu $ENV_FILE. Tạo .env production trước khi deploy."
    [[ -f "$APP_DIR/artisan" ]] || fail "$APP_DIR không phải root của ứng dụng Yona."
    [[ -d "$APP_DIR/.git" ]] || fail "$APP_DIR không phải Git checkout."

    app_env="$(env_value APP_ENV)"
    app_debug="$(env_value APP_DEBUG)"
    app_key="$(env_value APP_KEY)"
    app_url="$(env_value APP_URL)"
    broadcast_connection="$(env_value BROADCAST_CONNECTION)"
    cache_store="$(env_value CACHE_STORE)"
    db_connection="$(env_value DB_CONNECTION)"
    db_user="$(env_value DB_USERNAME)"
    queue_connection="$(env_value QUEUE_CONNECTION)"
    reverb_app_id="$(env_value REVERB_APP_ID)"
    reverb_app_key="$(env_value REVERB_APP_KEY)"
    reverb_app_secret="$(env_value REVERB_APP_SECRET)"
    reverb_scheme="$(env_value REVERB_SCHEME)"
    session_driver="$(env_value SESSION_DRIVER)"

    validate_boolean DEPLOY_MAINTENANCE "$DEPLOY_MAINTENANCE"
    validate_boolean DEPLOY_FRESH_DB "$DEPLOY_FRESH_DB"
    validate_boolean DEPLOY_SEED_DEMO "$DEPLOY_SEED_DEMO"
    validate_boolean DEPLOY_FORCE_REBUILD "$DEPLOY_FORCE_REBUILD"
    validate_boolean DEPLOY_HEALTHCHECK "$DEPLOY_HEALTHCHECK"
    validate_boolean DEPLOY_DRY_RUN "$DEPLOY_DRY_RUN"
    validate_boolean DEPLOY_ALLOW_ROOT "$DEPLOY_ALLOW_ROOT"
    validate_boolean DEPLOY_USE_COREPACK "$DEPLOY_USE_COREPACK"
    validate_boolean DEPLOY_MANAGE_SERVICES "$DEPLOY_MANAGE_SERVICES"

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
    [[ "$db_connection" == 'pgsql' ]] || fail 'DB_CONNECTION phải là pgsql; schema dùng kiểu dữ liệu riêng của PostgreSQL.'
    [[ -n "$db_user" ]] || fail 'DB_USERNAME chưa được cấu hình.'
    [[ "$db_user" != 'postgres' ]] || fail 'Ứng dụng không được kết nối bằng PostgreSQL superuser postgres.'

    [[ "$queue_connection" == 'redis' ]] || fail 'QUEUE_CONNECTION phải là redis trên production.'
    [[ "$cache_store" == 'redis' ]] || fail 'CACHE_STORE phải là redis trên production.'
    [[ "$session_driver" == 'redis' ]] || fail 'SESSION_DRIVER phải là redis trên production.'
    [[ "$broadcast_connection" == 'reverb' ]] || fail 'BROADCAST_CONNECTION phải là reverb.'
    [[ -n "$reverb_app_id" && -n "$reverb_app_key" && -n "$reverb_app_secret" ]] \
        || fail 'Thiếu REVERB_APP_ID/KEY/SECRET.'
    [[ "$reverb_scheme" == 'https' ]] || fail 'REVERB_SCHEME phải là https trên production.'

    validate_database_reset

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
    require_command getent
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

    getent group "$DEPLOY_RUNTIME_GROUP" >/dev/null \
        || fail "Không tìm thấy runtime group: $DEPLOY_RUNTIME_GROUP"

    if manage_services_enabled; then
        local supervisorctl_binary
        supervisorctl_binary="$(supervisorctl_command)"
        supervisorctl_binary="${supervisorctl_binary%% *}"

        if ! command -v "$supervisorctl_binary" >/dev/null 2>&1 && [[ ! -x "$supervisorctl_binary" ]]; then
            if is_enabled "$DEPLOY_DRY_RUN"; then
                warn "Dry-run: không tìm thấy $supervisorctl_binary; deploy thật sẽ từ chối."
            else
                fail "Thiếu supervisorctl ($supervisorctl_binary). Cài Supervisor, đè bằng DEPLOY_SUPERVISORCTL, hoặc tắt bằng DEPLOY_MANAGE_SERVICES=0."
            fi
        fi

        if ! getent passwd "$DEPLOY_RUNTIME_USER" >/dev/null; then
            if is_enabled "$DEPLOY_DRY_RUN"; then
                warn "Dry-run: không có user $DEPLOY_RUNTIME_USER; deploy thật sẽ từ chối."
            else
                fail "Không tìm thấy runtime user: $DEPLOY_RUNTIME_USER"
            fi
        fi

        [[ "$EUID" -eq 0 ]] || require_command sudo
    fi

    "$PHP_BIN" -r "exit(version_compare(PHP_VERSION, '$MINIMUM_PHP_VERSION', '>=') ? 0 : 1);" \
        || fail "Yona yêu cầu PHP >= $MINIMUM_PHP_VERSION."

    if ! "$NODE_BIN" -e "
        const major = Number(process.versions.node.split('.')[0]);
        process.exit(major >= $MINIMUM_NODE_MAJOR ? 0 : 1);
    "; then
        if is_enabled "$DEPLOY_DRY_RUN"; then
            warn "Dry-run đang dùng Node.js < $MINIMUM_NODE_MAJOR; deploy thật sẽ từ chối."
        else
            fail "Yona yêu cầu Node.js >= $MINIMUM_NODE_MAJOR."
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

# Cache biên dịch của bản trước trỏ tới provider/route/view không còn tồn tại.
# Phải xóa bằng rm chứ không bằng artisan: chính artisan sẽ chết khi nạp chúng.
clear_stale_caches() {
    log 'Xóa cache biên dịch của bản trước'
    run find "$APP_DIR/bootstrap/cache" -maxdepth 1 -name '*.php' -delete
    run find "$APP_DIR/storage/framework/views" -maxdepth 1 -name '*.php' -delete
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

# Deploy tại chỗ dùng lại đúng một checkout, nên thứ không đổi giữa hai revision
# thì không cần dựng lại. Trên 30 commit gần nhất composer.lock đổi 0 lần còn
# frontend đổi ~18 lần: bỏ được bước nào là rút ngắn maintenance window bấy nhiêu.
record_changed_files() {
    local new_revision

    # Chạy lại trên cùng revision nghĩa là đang sửa một bản deploy hỏng — lúc đó
    # "không có gì đổi" là kết luận sai, phải dựng lại tất cả.
    if is_enabled "$DEPLOY_FORCE_REBUILD" || is_enabled "$DEPLOY_DRY_RUN"; then
        CHANGED_FILES='__all__'
        return 0
    fi

    new_revision="$(git rev-parse --short HEAD)"
    if [[ "$OLD_REVISION" == "$new_revision" ]]; then
        CHANGED_FILES='__all__'
        return 0
    fi

    CHANGED_FILES="$(git diff --name-only "$OLD_REVISION" "$new_revision")"
}

changed_matching() {
    if [[ "$CHANGED_FILES" == '__all__' ]]; then
        return 0
    fi

    printf '%s\n' "$CHANGED_FILES" | grep -qE "$1"
}

# Bundle thiếu thì phải build lại bất kể git nói gì: lần deploy trước có thể
# chết giữa chừng và để lại public/build dở dang.
frontend_build_needed() {
    [[ -f "$APP_DIR/$VITE_MANIFEST" && -f "$APP_DIR/$SDK_BUNDLE" ]] || return 0

    changed_matching "$FRONTEND_INPUT_PATTERN"
}

install_dependencies() {
    if [[ ! -f "$APP_DIR/vendor/autoload.php" ]] || changed_matching "$COMPOSER_INPUT_PATTERN"; then
        log 'Cài PHP dependencies production'
        run "$COMPOSER_BIN" install \
            --no-dev \
            --no-interaction \
            --prefer-dist \
            --optimize-autoloader
    else
        # Lớp PHP mới không nằm trong classmap của bản trước thì autoload trượt,
        # nên dù bỏ qua install vẫn phải dựng lại classmap.
        log 'composer.lock không đổi; chỉ dựng lại classmap'
        run "$COMPOSER_BIN" dump-autoload \
            --no-dev \
            --optimize \
            --no-interaction
    fi

    if frontend_build_needed; then
        log 'Cài frontend build dependencies'
        run_pnpm install --frozen-lockfile --prod=false
    else
        log 'Frontend không đổi; bỏ qua cài devDependencies.'
    fi
}

assert_i18n_bundles_current() {
    log 'Đối chiếu bundle i18n với lang/'
    if ! run "$PHP_BIN" artisan i18n:generate --check --no-interaction; then
        fail 'Bundle i18n lệch lang/. Chạy `php artisan i18n:generate` rồi commit trước khi deploy.'
    fi
}

build_frontend() {
    if ! frontend_build_needed; then
        log 'Frontend không đổi; giữ nguyên bundle đã build.'
        return 0
    fi

    log 'Build frontend (dashboard, widget, survey, portal, superadmin, landing, SDK)'
    run_pnpm run build
}

# Migration tạo index trgm (gin_trgm_ops) nên thiếu extension là chết giữa
# chừng, để lại schema dở dang. Tạo extension cần superuser, không phải role app.
ensure_database_extensions() {
    local database_name psql_bin

    if is_enabled "$DEPLOY_DRY_RUN"; then
        log 'Dry-run: bỏ qua kiểm tra extension PostgreSQL.'
        return 0
    fi

    database_name="$(env_value DB_DATABASE)"
    psql_bin="$(command -v psql 2>/dev/null || true)"
    if [[ -z "$psql_bin" && -x /www/server/pgsql/bin/psql ]]; then
        psql_bin='/www/server/pgsql/bin/psql'
    fi

    if [[ -z "$psql_bin" ]]; then
        warn 'Không tìm thấy psql nên không kiểm tra được extension pg_trgm.'
        return 0
    fi

    if postgres_query "$psql_bin" "$database_name" "SELECT 1 FROM pg_extension WHERE extname = 'pg_trgm'" | grep -q '^1$'; then
        return 0
    fi

    log 'Cài extension pg_trgm cho database'
    postgres_query "$psql_bin" "$database_name" 'CREATE EXTENSION IF NOT EXISTS pg_trgm' >/dev/null \
        || fail "Không tạo được extension pg_trgm. Chạy bằng superuser: psql -d $database_name -c 'CREATE EXTENSION pg_trgm'"
}

postgres_query() {
    local psql_bin="$1"
    local database_name="$2"
    local statement="$3"

    if [[ "$EUID" -eq 0 ]]; then
        sudo -u postgres "$psql_bin" -d "$database_name" -Atc "$statement" 2>/dev/null
    else
        sudo -n -u postgres "$psql_bin" -d "$database_name" -Atc "$statement" 2>/dev/null
    fi
}

deploy_database() {
    if is_enabled "$DEPLOY_FRESH_DB"; then
        log "XOÁ SẠCH database '$(env_value DB_DATABASE)' và dựng lại schema từ đầu"
        run "$PHP_BIN" artisan migrate:fresh \
            --force \
            --no-interaction
        DATABASE_WAS_RESET=1
    else
        log 'Chạy forward-only migrations'
        run "$PHP_BIN" artisan migrate \
            --force \
            --no-interaction
    fi

    if is_enabled "$DEPLOY_SEED_DEMO"; then
        log 'Seed workspace demo (DatabaseSeeder)'
        run "$PHP_BIN" artisan db:seed \
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

prepare_runtime_permissions() {
    log "Chuẩn hóa quyền runtime cho group $DEPLOY_RUNTIME_GROUP"
    run chgrp "$DEPLOY_RUNTIME_GROUP" "$ENV_FILE"
    run chmod 0640 "$ENV_FILE"
    run chgrp -R "$DEPLOY_RUNTIME_GROUP" "$APP_DIR/storage" "$APP_DIR/bootstrap/cache"
    run chmod -R ug+rwX "$APP_DIR/storage" "$APP_DIR/bootstrap/cache"
    run find "$APP_DIR/storage" "$APP_DIR/bootstrap/cache" -type d -exec chmod g+s {} +
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

    bridge_port="$(bridge_env_value BRIDGE_HTTP_PORT)"
    [[ -n "$bridge_port" ]] || bridge_port="$DEFAULT_BRIDGE_PORT"

    log "HTTP readiness Zalo bridge trên 127.0.0.1:$bridge_port"
    run curl --fail --silent --show-error --max-time 10 \
        --retry 15 --retry-delay 2 --retry-connrefused \
        --output /dev/null \
        "http://127.0.0.1:$bridge_port/"

    ensure_pm2_startup
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

manage_services_enabled() {
    is_enabled "$DEPLOY_MANAGE_SERVICES"
}

# Bậc thang quyền: root chạy thẳng, còn lại mượn sudo không mật khẩu.
run_privileged() {
    if [[ "$EUID" -eq 0 ]]; then
        run "$@"
    else
        run sudo -n "$@"
    fi
}

supervisorctl_command() {
    if [[ -n "${DEPLOY_SUPERVISORCTL:-}" ]]; then
        printf '%s' "$DEPLOY_SUPERVISORCTL"
        return 0
    fi

    if [[ -x /www/server/panel/pyenv/bin/supervisorctl && -f /etc/supervisor/supervisord.conf ]]; then
        printf '%s' '/www/server/panel/pyenv/bin/supervisorctl -c /etc/supervisor/supervisord.conf'
        return 0
    fi

    printf '%s' 'supervisorctl'
}

run_supervisorctl() {
    local -a command_parts
    IFS=' ' read -r -a command_parts <<< "$(supervisorctl_command)"

    run_privileged "${command_parts[@]}" "$@"
}

# Ghi file hệ thống chỉ khi nội dung lệch; trả 0 nếu đã thay đổi.
install_system_file() {
    local target="$1"
    local mode="$2"
    local content="$3"
    local staged

    if [[ -f "$target" ]] && printf '%s\n' "$content" | cmp -s - "$target"; then
        return 1
    fi

    staged="$(mktemp)"
    printf '%s\n' "$content" > "$staged"

    log "Cập nhật $target"
    run_privileged install -o root -g root -m "$mode" "$staged" "$target"
    rm -f "$staged"

    return 0
}

# Danh sách tier lấy từ Makefile để dev và production dùng chung một nguồn.
supervisor_program_config() {
    local program="$1"
    local command_line="$2"
    local stop_wait="$3"
    local numprocs="$4"
    local process_name=''
    local runtime_home

    runtime_home="$(getent passwd "$DEPLOY_RUNTIME_USER" | cut -d: -f6)"
    [[ -n "$runtime_home" ]] || runtime_home="/home/$DEPLOY_RUNTIME_USER"

    if [[ "$numprocs" -gt 1 ]]; then
        process_name='process_name=%(program_name)s_%(process_num)02d'$'\n'
    fi

    cat <<CONFIG
; File này do deploy.sh sinh ra. Sửa tay sẽ bị ghi đè ở lần deploy sau.
[program:$program]
directory=$APP_DIR
command=$command_line
${process_name}numprocs=$numprocs
user=$DEPLOY_RUNTIME_USER
autostart=true
autorestart=true
startsecs=5
startretries=5
stopwaitsecs=$stop_wait
stopasgroup=true
killasgroup=true
redirect_stderr=true
stdout_logfile=$APP_DIR/storage/logs/$program.log
stdout_logfile_maxbytes=20MB
stdout_logfile_backups=5
umask=002
environment=HOME="$runtime_home",USER="$DEPLOY_RUNTIME_USER",PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
CONFIG
}

# Gỡ program không còn dùng: yona-queue (đã thay bằng yona-horizon) và yona-ssr
# (inertia:start-ssr đã biến mất). Để lại là chạy trùng hoặc restart-loop.
remove_legacy_supervisor_programs() {
    local program config

    for program in "${SUPERVISOR_LEGACY_PROGRAMS[@]}"; do
        config="$DEPLOY_SUPERVISOR_CONF_DIR/$program.conf"
        [[ -f "$config" ]] || continue

        log "Gỡ program Supervisor không còn dùng: $program"
        run_supervisorctl stop "$program" || true
        run_privileged rm -f "$config"
        run_supervisorctl reread
        run_supervisorctl update
    done
}

# Cảnh báo khi có nơi khác cũng dựng worker/Reverb cho chính app này: hai nguồn
# cùng chạy nghĩa là job bị xử lý hai lần.
warn_duplicate_supervisor_programs() {
    local config basename_config

    [[ -d "$DEPLOY_SUPERVISOR_CONF_DIR" ]] || return 0

    while IFS= read -r config; do
        basename_config="$(basename "$config")"
        case "$basename_config" in
            "$SUPERVISOR_QUEUE_PROGRAM.conf"|"$SUPERVISOR_REVERB_PROGRAM.conf") continue ;;
        esac

        if grep -qF "$APP_DIR" "$config" 2>/dev/null \
            && grep -qE 'artisan (queue:work|queue:listen|horizon|reverb:start)' "$config" 2>/dev/null; then
            warn "Supervisor đã có $basename_config cũng chạy worker/Reverb cho $APP_DIR — gỡ thủ công để tránh chạy trùng."
        fi
    done < <(find "$DEPLOY_SUPERVISOR_CONF_DIR" -maxdepth 1 -type f -name '*.conf' -print)
}

# Scheduler chạy hai lần nghĩa là job định kỳ bắn đôi.
warn_duplicate_scheduler_cron() {
    local config user

    while IFS= read -r config; do
        [[ "$config" != "$CRON_FILE" ]] || continue
        if grep -qF "$APP_DIR" "$config" 2>/dev/null && grep -qF 'schedule:run' "$config" 2>/dev/null; then
            warn "Đã có cron scheduler khác cho $APP_DIR: $config — gỡ thủ công để tránh chạy trùng."
        fi
    done < <(find /etc/cron.d -maxdepth 1 -type f -print 2>/dev/null)

    for user in root "$DEPLOY_RUNTIME_USER"; do
        if crontab -l -u "$user" 2>/dev/null | grep -qF 'schedule:run'; then
            warn "crontab của user $user cũng có schedule:run — kiểm tra để tránh scheduler chạy trùng."
        fi
    done
}

ensure_supervisor_programs() {
    local php_path queue_command reverb_command reverb_host reverb_port changed=0

    php_path="$(command -v "$PHP_BIN")"
    reverb_host="$(env_value REVERB_SERVER_HOST)"
    [[ -n "$reverb_host" ]] || reverb_host='127.0.0.1'
    reverb_port="$(env_value REVERB_SERVER_PORT)"
    [[ -n "$reverb_port" ]] || reverb_port='8611'

    # Horizon là master process: nó tự đẻ worker theo config/horizon.php (tier,
    # maxProcesses, timeout). Supervisor chỉ nuôi đúng một master.
    queue_command="$php_path artisan horizon"
    reverb_command="$php_path artisan reverb:start --host=$reverb_host --port=$reverb_port --no-interaction"

    run_privileged mkdir -p "$DEPLOY_SUPERVISOR_CONF_DIR"

    remove_legacy_supervisor_programs
    warn_duplicate_supervisor_programs

    install_system_file \
        "$DEPLOY_SUPERVISOR_CONF_DIR/$SUPERVISOR_QUEUE_PROGRAM.conf" 0644 \
        "$(supervisor_program_config "$SUPERVISOR_QUEUE_PROGRAM" "$queue_command" 180 1)" \
        && changed=1

    install_system_file \
        "$DEPLOY_SUPERVISOR_CONF_DIR/$SUPERVISOR_REVERB_PROGRAM.conf" 0644 \
        "$(supervisor_program_config "$SUPERVISOR_REVERB_PROGRAM" "$reverb_command" 30 1)" \
        && changed=1

    if [[ "$changed" -eq 1 ]]; then
        log 'Nạp lại config Supervisor'
        run_supervisorctl reread
        run_supervisorctl update
    fi

    log 'Đảm bảo queue worker và Reverb đang chạy'
    run_supervisorctl start "$SUPERVISOR_QUEUE_PROGRAM:*" || true
    run_supervisorctl start "$SUPERVISOR_REVERB_PROGRAM" || true
}

ensure_scheduler_cron() {
    local php_path

    warn_duplicate_scheduler_cron

    php_path="$(command -v "$PHP_BIN")"

    install_system_file "$CRON_FILE" 0644 "$(cat <<CRON
# File này do deploy.sh sinh ra. Sửa tay sẽ bị ghi đè ở lần deploy sau.
* * * * * $DEPLOY_RUNTIME_USER cd $APP_DIR && $php_path artisan schedule:run >> $APP_DIR/storage/logs/scheduler.log 2>&1
CRON
)" || true
}

ensure_system_services() {
    manage_services_enabled || {
        log 'Bỏ qua dựng supervisor/cron theo DEPLOY_MANAGE_SERVICES=0.'
        return 0
    }

    ensure_supervisor_programs
    ensure_scheduler_cron
}

# pm2 chỉ tự sống lại sau reboot khi đã đăng ký unit systemd cho đúng user đang
# giữ daemon — chính là user đang chạy deploy.
ensure_pm2_startup() {
    manage_services_enabled || return 0

    if [[ "$EUID" -ne 0 ]]; then
        warn "Không phải root nên bỏ qua pm2 startup. Chạy một lần: sudo pm2 startup systemd -u $(id -un) --hp $HOME"
        return 0
    fi

    local current_user unit other_unit

    current_user="$(id -un)"
    unit="pm2-$current_user"

    while IFS= read -r other_unit; do
        [[ "$other_unit" != "$unit.service" ]] || continue
        warn "Đã có unit $other_unit chạy pm2 dưới user khác — hai daemon cùng dựng bridge sẽ trùng nhau."
    done < <(systemctl list-unit-files --no-legend 'pm2-*.service' 2>/dev/null | awk '{ print $1 }')

    if systemctl is-enabled --quiet "$unit" 2>/dev/null; then
        log "pm2 đã đăng ký tự khởi động ($unit); chỉ lưu lại danh sách process."
    else
        log 'Đăng ký pm2 tự khởi động sau reboot'
        run_pnpm --dir "$BRIDGE_DIR" exec pm2 startup systemd -u "$current_user" --hp "$HOME"
    fi

    run_pnpm --dir "$BRIDGE_DIR" exec pm2 save
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
    # horizon:terminate cho worker chạy nốt job hiện tại rồi thoát; supervisor
    # dựng lại master với mã mới. `queue:restart` không đụng được master Horizon.
    log 'Yêu cầu Horizon khởi động lại graceful'
    run "$PHP_BIN" artisan horizon:terminate --no-interaction

    log 'Yêu cầu Reverb khởi động lại graceful'
    run "$PHP_BIN" artisan reverb:restart --no-interaction

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

# `public/packs/js/sdk.js` là tệp nhúng trên website khách: tên cố định (đoạn
# script do WebWidget::web_widget_script sinh trỏ thẳng vào đó) nên không hash
# được, và CDN cache nó theo URL. Deploy xong mà edge còn giữ bản cũ thì khách
# vẫn chạy mã cũ — đã xảy ra thật 20/09/2026, bản sửa nằm ở origin suốt 12 tiếng
# mà không ai biết. So Last-Modified của URL thường với URL kèm tham số phá cache:
# lệch nhau nghĩa là edge còn bẩn.
verify_cdn_fresh() {
    local app_url url moc_edge moc_goc
    is_enabled "$DEPLOY_HEALTHCHECK" || return 0

    app_url="$(env_value APP_URL)"
    [[ -n "$app_url" ]] || return 0
    url="${app_url%/}/packs/js/sdk.js"

    if is_enabled "$DEPLOY_DRY_RUN"; then
        print_command curl --fail --silent --head --max-time 10 "$url"
        return 0
    fi

    moc_edge="$(sdk_last_modified "$url")" || return 0
    moc_goc="$(sdk_last_modified "$url?cache_bust=$(date +%s)")" || return 0

    if [[ -z "$moc_edge" || -z "$moc_goc" ]]; then
        warn 'Không đọc được Last-Modified của sdk.js; bỏ qua kiểm CDN.'
        return 0
    fi

    [[ "$moc_edge" == "$moc_goc" ]] && return 0

    # Không fail cả lần deploy: ứng dụng vẫn chạy đúng, chỉ widget trên site
    # khách là còn cũ. Nhưng phải hét lên, vì im lặng chính là cái bẫy lần trước.
    warn "CDN còn phát sdk.js cũ — edge: $moc_edge | origin: $moc_goc"
    warn "  Purge cache cho $url rồi kiểm lại, nếu không bản sửa widget sẽ không tới khách."
}

sdk_last_modified() {
    curl --fail --silent --show-error --head --max-time 10 \
        -A 'yona-deploy/1.0 (verify-cdn)' "$1" 2>/dev/null \
        | tr -d '\r' | awk 'tolower($1) == "last-modified:" { $1 = ""; sub(/^ /, ""); print }'
}

report_post_deploy_steps() {
    [[ "$DATABASE_WAS_RESET" -eq 1 ]] || return 0

    log 'Database vừa dựng lại từ đầu — tài khoản cũ không còn. Bước tiếp theo:'
    log "  $PHP_BIN artisan super-admin:create <email> --name=\"Tên\" --password=<mật khẩu>"
    log '  Đăng nhập /superadmin, tạo workspace đầu tiên, rồi kết nối lại Zalo bằng QR.'
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

    step 'fetch'          fetch_code
    step 'maintenance on' enable_maintenance_mode
    step 'activate'       activate_code
    step 'clear caches'   clear_stale_caches
    record_changed_files
    step 'dependencies'   install_dependencies
    step 'i18n check'     assert_i18n_bundles_current
    step 'build frontend' build_frontend
    step 'db extensions'  ensure_database_extensions
    step 'migrate'        deploy_database
    step 'laravel cache'  prepare_laravel
    step 'permissions'    prepare_runtime_permissions
    step 'zalo bridge'    deploy_zalo_bridge
    step 'services'       ensure_system_services
    step 'restart'        restart_application_processes
    step 'maintenance off' disable_maintenance_mode
    step 'health check'   health_check
    step 'cdn sdk.js'     verify_cdn_fresh

    NEW_REVISION="$(git rev-parse --short HEAD)"
    duration="$(( $(date +%s) - STARTED_AT ))"
    log "Deploy thành công: $OLD_REVISION -> $NEW_REVISION (${duration}s)"
    printf '%s\n' "${STEP_TIMINGS[@]}" >&2
    report_post_deploy_steps
}

main "$@"
