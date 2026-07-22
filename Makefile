# Yona — dev shortcuts (host workflow).
# Requires local PHP 8.4 + Postgres + Redis. See docs/local-development.md.

# Force PHP 8.4 into the recipe PATH (harness/make shells may default to 8.3).
export PATH := /opt/homebrew/opt/php@8.4/bin:$(PATH)

PHP      := php
ARTISAN  := $(PHP) artisan
COMPOSER := composer
PSQL     := psql -h 127.0.0.1 -U postgres

.DEFAULT_GOAL := help
.PHONY: help setup install dev serve queue horizon reverb bridge workers \
        db-roles migrate seed test format pint pint-test stan check build \
        clear tinker

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

## ── Setup ──────────────────────────────────────────────
setup: ## First-time: deps + env + key + DB roles + migrate + assets
	$(COMPOSER) install
	pnpm install
	@test -f .env || cp .env.example .env
	@grep -q "APP_KEY=base64:" .env || $(ARTISAN) key:generate
	$(PSQL) -d yona      -f database/sql/setup-roles.sql
	$(PSQL) -d yona_test -f database/sql/setup-roles.sql
	$(ARTISAN) migrate --database=pgsql_privileged --force
	DB_DATABASE=yona_test $(ARTISAN) migrate --database=pgsql_privileged --force
	pnpm run build
	@echo "✓ setup done"

install: ## Install PHP + JS dependencies
	$(COMPOSER) install
	pnpm install

## ── Run ────────────────────────────────────────────────
dev: ## Run dev stack (server + queue + logs + Vite)
	$(COMPOSER) run dev

serve: ## Serve the app (http://localhost:8000)
	$(ARTISAN) serve

queue: ## Run a queue worker
	$(ARTISAN) queue:listen --tries=1

horizon: ## Run Horizon (Redis queues)
	$(ARTISAN) horizon

reverb: ## Run Reverb websocket server (live chat)
	$(ARTISAN) reverb:start

bridge: ## Start the Zalo personal bridge (foreground; kills any stale instance on the port first) — then connect at /integrations/zalo
	cd services/zalo-bridge && { test -d node_modules || pnpm install; } && \
		PORT=$${BRIDGE_HTTP_PORT:-3710}; \
		fuser -k $$PORT/tcp 2>/dev/null && sleep 0.5 || true; \
		node src/index.mjs

workers: ## Run full pipeline (Horizon queues + Reverb websocket)
	trap 'kill 0' INT TERM; \
	$(ARTISAN) horizon & \
	$(ARTISAN) reverb:start & \
	wait

## ── Database ───────────────────────────────────────────
# Roles: yona_app (runtime, RLS-enforced) + yona_owner (schema owner, BYPASSRLS,
# NOSUPERUSER). setup-roles.sql creates both — run as the real superuser.
db-roles: ## Create/grant yona_app + yona_owner roles (real RLS) on both DBs
	$(PSQL) -d yona      -f database/sql/setup-roles.sql
	$(PSQL) -d yona_test -f database/sql/setup-roles.sql

migrate: ## Run pending migrations (additive, forward-only) on dev + test DBs
	$(ARTISAN) migrate --database=pgsql_privileged --force
	DB_DATABASE=yona_test $(ARTISAN) migrate --database=pgsql_privileged --force
	DB_DATABASE=yona_test $(ARTISAN) db:seed --class=PlatformPermissionSeeder --force
	DB_DATABASE=yona_test $(ARTISAN) db:seed --class=AdminPermissionSeeder --force

seed: ## Run seeders (idempotent foundation data)
	$(ARTISAN) db:seed --force

# NOTE: no migrate:fresh / migrate:reset / db:wipe target by design —
# supreme rule: never run anything that can wipe DB data.

## ── Quality ────────────────────────────────────────────
test: ## Run the Pest test suite
	$(ARTISAN) test

format: ## Format everything (Pint + Prettier)
	$(PHP) vendor/bin/pint
	pnpm run format

pint: ## Format PHP only (Laravel Pint)
	$(PHP) vendor/bin/pint

pint-test: ## Check formatting without changing files
	$(PHP) vendor/bin/pint --test

stan: ## Static analysis (Larastan)
	$(PHP) vendor/bin/phpstan analyse --memory-limit=1G

check: pint-test stan test ## Run all quality gates

## ── Utils ──────────────────────────────────────────────
build: ## Build frontend assets
	pnpm run build

clear: ## Clear all caches
	$(ARTISAN) optimize:clear

tinker: ## Open a REPL
	$(ARTISAN) tinker
