#!/usr/bin/env bash
# Cổng deploy yona.vn cho AI và máy dev — cài lên server tại /usr/local/sbin/yona-deploy-gate (root:root 755)
# và buộc vào key SSH deploy bằng:
#
#   restrict,command="/usr/local/sbin/yona-deploy-gate" ssh-ed25519 AAAA… yona-deploy-<tên>
#
# Key đó chỉ gọi được đúng các hành động dưới đây; lệnh nào khác đều bị từ chối, không có shell.
#
#   status        commit đang chạy, nhánh, bản deploy gần nhất, dung lượng đĩa
#   plan          commit sẽ lên, migration mới, có sao lưu hay không — không đổi gì
#   dry-run       deploy.sh ở chế độ DEPLOY_DRY_RUN=1
#   deploy        (sao lưu nếu có migration mới) → deploy.sh → health; chạy tách khỏi SSH, rớt mạng không dừng giữa chừng
#   health        gọi APP_URL/up
#   deploy-log    log lần deploy gần nhất (hoặc `deploy-log <số dòng>`)
#   app-log       cuối tệp log ứng dụng mới nhất trong storage/logs (hoặc `app-log <số dòng>`, tối đa 2000)
#
# Không bao giờ: xoá/dựng lại DB, seed demo, reset hay rollback code — những việc đó người làm tay.
# Bản cài trên server là bản có hiệu lực; sửa file này trong repo không đổi quyền cho tới khi founder cài lại.
set -euo pipefail

readonly APP_DIR=/www/wwwroot/yona.vn
readonly BRANCH=main
readonly LOG_DIR=/var/log/yona-deploy
readonly BACKUP_DIR=/www/backup/yona
readonly KEEP_LOGS=30
readonly KEEP_BACKUPS=14
readonly MIGRATION_PATHS=(database/migrations)
readonly PSQL_BIN_DIR=/www/server/pgsql/bin
readonly LOCK_FILE=/run/yona-deploy-gate.lock

die() { echo "LỖI: $*" >&2; exit 1; }

# Qua SSH, sshd chỉ đưa lệnh người gọi gõ vào SSH_ORIGINAL_COMMAND; tham số dòng lệnh chỉ root trên server truyền được.
if (( $# > 0 )); then request="$*"; else request=${SSH_ORIGINAL_COMMAND:-status}; fi
read -r action argument extra <<< "$request"
# Gọi bằng key không bị buộc command= (ssh … yona-deploy-gate status) thì bỏ tên cổng ở đầu.
if [[ $action == "$(basename "$0")" || $action == "$0" ]]; then read -r action argument extra <<< "$argument${extra:+ $extra}"; fi
[[ -z ${extra:-} ]] || die "hành động nhận tối đa một tham số."

cd "$APP_DIR"

env_value() {
  grep -E "^$1=" .env | tail -1 | cut -d= -f2- | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}

line_count() {
  local requested=${1:-200}
  [[ $requested =~ ^[0-9]+$ ]] || die "số dòng phải là số nguyên."
  (( requested > 2000 )) && requested=2000
  echo "$requested"
}

pending_migrations() {
  git diff --name-only --diff-filter=A "HEAD" "origin/$BRANCH" -- "${MIGRATION_PATHS[@]}"
}

latest_log() {
  ls -1t "$LOG_DIR"/*.log 2>/dev/null | head -1
}

show_status() {
  echo "Commit đang chạy: $(git log -1 --format='%h %s (%cr)')"
  echo "Nhánh: $(git rev-parse --abbrev-ref HEAD)"
  git status --porcelain --untracked-files=no | sed 's/^/Thay đổi chưa commit: /'
  local last; last=$(latest_log || true)
  [[ -n $last ]] && echo "Deploy gần nhất: $(basename "$last" .log) — $(tail -1 "$last")"
  df -h "$APP_DIR" | tail -1 | awk '{print "Đĩa: dùng " $3 "/" $2 " (" $5 ")"}'
}

show_plan() {
  git fetch --quiet --prune origin "$BRANCH"
  local ahead; ahead=$(git rev-list --count "HEAD..origin/$BRANCH")
  echo "Commit sẽ lên ($ahead):"
  git log --format='  %h %s (%an, %cr)' "HEAD..origin/$BRANCH"
  if ! git merge-base --is-ancestor HEAD "origin/$BRANCH"; then
    echo "CẢNH BÁO: server có commit không nằm trong origin/$BRANCH — deploy.sh sẽ từ chối (chỉ fast-forward)."
  fi
  local migrations; migrations=$(pending_migrations)
  if [[ -n $migrations ]]; then
    echo "Migration mới — sẽ pg_dump trước khi deploy:"; sed 's/^/  /' <<< "$migrations"
  else
    echo "Không có migration mới — không sao lưu."
  fi
}

backup_database() {
  local db stamp file
  db=$(env_value DB_DATABASE)
  stamp=$(date +%Y%m%d-%H%M%S)
  file="$BACKUP_DIR/$db-$stamp-$(git rev-parse --short HEAD).dump"
  install -d -m 700 "$BACKUP_DIR"
  echo "==> Sao lưu $db → $file"
  sudo -u postgres "$PSQL_BIN_DIR/pg_dump" -Fc "$db" > "$file"
  chmod 600 "$file"
  ls -1t "$BACKUP_DIR"/*.dump | tail -n +$((KEEP_BACKUPS + 1)) | xargs -r rm -f
  echo "    xong ($(du -h "$file" | cut -f1))"
}

check_health() {
  local url code
  url="$(env_value APP_URL)/up"
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$url" || true)
  echo "Health $url → $code"
  [[ $code == 200 ]]
}

run_deploy() {
  exec 9>"$LOCK_FILE"
  flock -n 9 || die "đang có một lần deploy khác chạy."

  install -d -m 750 "$LOG_DIR"
  local log; log="$LOG_DIR/$(date +%Y%m%d-%H%M%S).log"
  # Lần deploy đầu thư mục log còn trống: ls thoát 2, pipefail + errexit sẽ dừng cổng mà không in gì.
  { ls -1t "$LOG_DIR"/*.log 2>/dev/null || true; } | tail -n +$((KEEP_LOGS + 1)) | xargs -r rm -f

  show_plan | tee "$log"
  local needs_backup=0
  [[ -n $(pending_migrations) ]] && needs_backup=1

  # Chạy tách khỏi phiên SSH: mất mạng giữa chừng không để server kẹt trong maintenance mode.
  setsid bash -c '
    set -o pipefail
    cd "$1"
    if [[ $2 == 1 ]]; then env -u SSH_ORIGINAL_COMMAND "$3" backup-db || { echo "KẾT QUẢ: THẤT BẠI (sao lưu lỗi, chưa deploy)"; exit 1; }; fi
    DEPLOY_BRANCH=main DEPLOY_FRESH_DB=0 DEPLOY_SEED_DEMO=0 DEPLOY_DRY_RUN=0 ./deploy.sh \
      && echo "KẾT QUẢ: THÀNH CÔNG $(git rev-parse --short HEAD)" \
      || { echo "KẾT QUẢ: THẤT BẠI — deploy.sh giữ maintenance mode; xem log phía trên"; exit 1; }
  ' _ "$APP_DIR" "$needs_backup" "$0" >> "$log" 2>&1 < /dev/null 9>&- &
  local pid=$!

  tail -n +1 -f --pid="$pid" "$log"
  wait "$pid"
}

case $action in
  status)     show_status ;;
  plan)       show_plan ;;
  dry-run)    git fetch --quiet --prune origin "$BRANCH"; DEPLOY_BRANCH=$BRANCH DEPLOY_DRY_RUN=1 DEPLOY_HEALTHCHECK=0 ./deploy.sh ;;
  deploy)     run_deploy ;;
  backup-db)  [[ -z ${SSH_ORIGINAL_COMMAND:-} ]] || die "hành động không được phép: 'backup-db'."; backup_database ;;
  health)     check_health ;;
  deploy-log) lines=$(line_count "${argument:-400}"); log=$(latest_log) || true; [[ -n ${log:-} ]] || die "chưa có log deploy."; tail -n "$lines" "$log" ;;
  app-log)    lines=$(line_count "$argument"); log=$(ls -t storage/logs/laravel*.log 2>/dev/null | head -n 1) || true; [[ -n ${log:-} ]] || die "chưa có log ứng dụng."; echo "== $log"; tail -n "$lines" "$log" ;;
  *)          die "hành động không được phép: '$action'. Dùng: status | plan | dry-run | deploy | health | deploy-log [n] | app-log [n]" ;;
esac
