# Nạp nhóm biến PROD_* từ .env của repo cho các script thao tác production ở máy dev.
# Không source cả .env của Laravel: giá trị có dấu cách, ký tự đặc biệt. Biến đã có trong môi trường được giữ nguyên.
#
#   source "$(git rev-parse --show-toplevel)/scripts/lib/prod-env.sh"
#   require_prod_env PROD_X PROD_Y

PROD_ENV_FILE=$(git rev-parse --show-toplevel)/.env

prod_env_die() { echo "LỖI: $*" >&2; exit 1; }

if [[ -f $PROD_ENV_FILE ]]; then
  while IFS= read -r line; do
    name=${line%%=*} value=${line#*=}
    value=${value%\"}; value=${value#\"}; value=${value%\'}; value=${value#\'}
    [[ -z ${!name:-} ]] && export "$name=$value"
  done < <(grep -E '^PROD_[A-Z_]+=' "$PROD_ENV_FILE")
fi

require_prod_env() {
  local name
  for name in "$@"; do
    [[ -n ${!name:-} ]] || prod_env_die "thiếu $name (đặt trong $PROD_ENV_FILE hoặc biến môi trường)"
  done
}
