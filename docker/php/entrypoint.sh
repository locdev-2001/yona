#!/bin/sh
# Container entrypoint: make the app self-bootstrapping so a plain
# `docker compose up` works on a fresh machine. Heavy/destructive steps
# (migrate) are left to `make setup` — this only ensures the app can boot.
set -e
cd /var/www/html

[ -f .env ] || cp .env.example .env

if [ ! -f vendor/autoload.php ]; then
    echo "→ vendor missing, running composer install"
    composer install --no-interaction --prefer-dist
fi

if ! grep -q '^APP_KEY=base64:' .env; then
    echo "→ generating APP_KEY"
    php artisan key:generate --force
fi

exec "$@"
