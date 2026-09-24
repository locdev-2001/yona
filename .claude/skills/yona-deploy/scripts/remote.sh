#!/usr/bin/env bash
# Gọi cổng deploy yona.vn trên server (/usr/local/sbin/yona-deploy-gate, nguồn scripts/deploy-gate.sh).
# Chạy được với key bị buộc command= (chỉ chạy được cổng) lẫn key root thường (cổng tự bỏ tên mình ở đầu lệnh).
#
#   remote.sh status | plan | dry-run | deploy | health | deploy-log [n] | app-log [n]
#
# Cấu hình: nhóm PROD_DEPLOY_* trong .env của repo (mẫu ở .env.example).
set -euo pipefail

cd "$(dirname "$0")"
# shellcheck source=../../../../scripts/lib/prod-env.sh
source "$(git rev-parse --show-toplevel)/scripts/lib/prod-env.sh"
require_prod_env PROD_DEPLOY_SSH_HOST PROD_DEPLOY_SSH_PORT PROD_DEPLOY_SSH_USER PROD_DEPLOY_SSH_KEY

[[ $# -ge 1 ]] || { sed -n '2,6p' "$0" | sed 's/^# \{0,1\}//'; exit 2; }

exec ssh -p "$PROD_DEPLOY_SSH_PORT" -i "${PROD_DEPLOY_SSH_KEY/#\~/$HOME}" \
  -o IdentitiesOnly=yes -o BatchMode=yes -o ServerAliveInterval=30 \
  "$PROD_DEPLOY_SSH_USER@$PROD_DEPLOY_SSH_HOST" "yona-deploy-gate $*"
