#!/usr/bin/env bash
# Phiên cloud không có ~/.ssh của máy dev: dựng key tunnel đọc DB production từ biến môi trường
# của environment (PROD_DB_SSH_KEY_B64, PROD_DB_SSH_KNOWN_HOSTS_B64). Máy dev bỏ qua.
set -euo pipefail

[[ ${CLAUDE_CODE_REMOTE:-} == true ]] || exit 0
[[ -n ${PROD_DB_SSH_KEY_B64:-} ]] || exit 0

key_path=${PROD_DB_SSH_KEY:-~/.ssh/yona_prod_db}
key_path=${key_path/#\~/$HOME}

install -d -m 700 "$HOME/.ssh"
umask 077
base64 -d <<<"$PROD_DB_SSH_KEY_B64" >"$key_path"
[[ -n ${PROD_DB_SSH_KNOWN_HOSTS_B64:-} ]] && base64 -d <<<"$PROD_DB_SSH_KNOWN_HOSTS_B64" >>"$HOME/.ssh/known_hosts"

command -v psql >/dev/null || echo "Thiếu psql: thêm postgresql-client vào setup script của environment." >&2
