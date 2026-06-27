# Chó Rách Management — dev shortcuts.
#
# Two workflows:
#   • Docker (`docker-*`): a fresh machine only needs Docker Desktop. Recommended.
#   • Host (plain targets below): for devs already running PHP 8.4 + Postgres + Redis.
# See docs/local-development.md.

DC       := docker compose
EXEC     := $(DC) exec app
RUN      := $(DC) run --rm app

# Force PHP 8.4 into the recipe PATH (harness/make shells may default to 8.3).
export PATH := /opt/homebrew/opt/php@8.4/bin:$(PATH)

PHP      := php
ARTISAN  := $(PHP) artisan
COMPOSER := composer

.DEFAULT_GOAL := help
.PHONY: help setup setup-docker setup-host install dev serve queue horizon reverb \
        db-roles migrate seed test format pint pint-test stan check build \
        clear tinker \
        docker-up docker-down docker-restart docker-logs docker-ps \
        docker-sh docker-artisan docker-migrate docker-seed docker-test \
        docker-pint docker-stan docker-check docker-front docker-workers docker-build

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

## ── Setup (auto-detects Docker, else host) ────────────
# Inlined (no recursive $(MAKE)) so it works with GnuWin32 make on Windows,
# whose program path contains spaces. Recipes run via sh (sh.exe on Windows).
setup: ## First-time: Docker if available, otherwise host (install+migrate+build)
	@if docker info >/dev/null 2>&1; then \
		echo "→ Docker detected — running Docker setup"; \
		$(DC) build && \
		$(DC) up -d postgres redis && \
		$(DC) run --rm app php artisan migrate --database=pgsql_privileged --force && \
		$(DC) run --rm -e DB_DATABASE=cho_rach_test app php artisan migrate --database=pgsql_privileged --force && \
		$(DC) up -d && \
		echo "✓ setup done → http://localhost:8080  (then: make dev — for Vite hot reload)"; \
	else \
		echo "→ Docker not available — running host setup"; \
		$(COMPOSER) install && \
		pnpm install && \
		{ test -f .env || cp .env.example .env; } && \
		{ grep -q "APP_KEY=base64:" .env || $(ARTISAN) key:generate; } && \
		psql -U cho_rach_owner -d cho_rach      -f database/sql/setup-roles.sql && \
		psql -U cho_rach_owner -d cho_rach_test -f database/sql/setup-roles.sql && \
		$(ARTISAN) migrate --database=pgsql_privileged --force && \
		DB_DATABASE=cho_rach_test $(ARTISAN) migrate --database=pgsql_privileged --force && \
		pnpm run build && \
		echo "✓ host setup done"; \
	fi

# The Docker entrypoint bootstraps .env / vendor / APP_KEY on first boot, so
# `run --rm app ...` and `up -d` are enough — no host-side shell builtins needed.
setup-docker: ## Force Docker setup (build, bootstrap, migrate, start app)
	$(DC) build
	$(DC) up -d postgres redis
	$(DC) run --rm app php artisan migrate --database=pgsql_privileged --force
	$(DC) run --rm -e DB_DATABASE=cho_rach_test app php artisan migrate --database=pgsql_privileged --force
	$(DC) up -d
	@echo "✓ setup done → http://localhost:8080  (then: make dev — for Vite hot reload)"

setup-host: ## Force host setup (deps + env + key + roles + migrate + assets)
	$(COMPOSER) install
	pnpm install
	@test -f .env || cp .env.example .env
	@grep -q "APP_KEY=base64:" .env || $(ARTISAN) key:generate
	psql -U cho_rach_owner -d cho_rach      -f database/sql/setup-roles.sql
	psql -U cho_rach_owner -d cho_rach_test -f database/sql/setup-roles.sql
	$(ARTISAN) migrate --database=pgsql_privileged --force
	DB_DATABASE=cho_rach_test $(ARTISAN) migrate --database=pgsql_privileged --force
	pnpm run build
	@echo "✓ host setup done"

## ── Docker (day-to-day) ────────────────────────────────
docker-up: ## Start core services (app, nginx, postgres, redis)
	$(DC) up -d

docker-down: ## Stop services (ARGS=-v to wipe the DB volume)
	$(DC) down $(ARGS)

docker-restart: ## Recreate core services
	$(DC) up -d --force-recreate

docker-logs: ## Tail logs (S=app to scope to one service)
	$(DC) logs -f $(S)

docker-ps: ## List running services
	$(DC) ps

docker-sh: ## Shell into the app container
	$(EXEC) bash

docker-artisan: ## Run artisan: make docker-artisan CMD="migrate:status"
	$(EXEC) php artisan $(CMD)

docker-migrate: ## Run pending migrations in the container (as the owner role)
	$(EXEC) php artisan migrate --database=pgsql_privileged

docker-seed: ## Run seeders in the container
	$(EXEC) php artisan db:seed

docker-test: ## Run the Pest suite in the container
	$(EXEC) php artisan test

docker-pint: ## Format code in the container
	$(EXEC) php vendor/bin/pint

docker-stan: ## Static analysis in the container
	$(EXEC) php vendor/bin/phpstan analyse

docker-check: ## All quality gates in the container
	$(EXEC) php vendor/bin/pint --test
	$(EXEC) php vendor/bin/phpstan analyse
	$(EXEC) php artisan test

docker-front: ## Run Vite dev server (http://localhost:5173)
	$(DC) --profile frontend up node

docker-workers: ## Run Horizon + Reverb (queues + websocket)
	$(DC) --profile workers up -d horizon reverb

docker-build: ## Rebuild images without cache
	$(DC) build --no-cache

## ── Install (host: requires local PHP 8.4 + Postgres + Redis) ─
install: ## Install PHP + JS dependencies on the host
	$(COMPOSER) install
	pnpm install

## ── Run ────────────────────────────────────────────────
# Auto-detects Docker (like `setup`). Docker path starts the core services and
# runs the Vite dev server in the foreground — it writes public/hot so the app
# at :8080 renders with hot reload (no built manifest needed). Ctrl-C stops Vite;
# core services stay up (use `make docker-down` to stop them).
dev: ## Run dev stack: Docker (app + Vite) if available, else host (composer run dev)
	@if docker info >/dev/null 2>&1; then \
		echo "→ Docker detected — app on :8080, Vite dev server on :5173 (Ctrl-C to stop Vite)"; \
		$(DC) up -d && \
		$(DC) --profile frontend up node; \
	else \
		$(COMPOSER) run dev; \
	fi

serve: ## Serve the app (http://localhost:8000)
	$(ARTISAN) serve

queue: ## Run a queue worker
	$(ARTISAN) queue:listen --tries=1

horizon: ## Run Horizon (Redis queues)
	$(ARTISAN) horizon

reverb: ## Run Reverb websocket server (live chat)
	$(ARTISAN) reverb:start

workers: ## Run full pipeline (Horizon queues + Reverb websocket)
	trap 'kill 0' INT TERM; \
	$(ARTISAN) horizon & \
	$(ARTISAN) reverb:start & \
	wait

## ── Database (host) ────────────────────────────────────
db-roles: ## Create/grant the cho_rach_app runtime role (real RLS) on both DBs
	psql -U cho_rach_owner -d cho_rach      -f database/sql/setup-roles.sql
	psql -U cho_rach_owner -d cho_rach_test -f database/sql/setup-roles.sql

migrate: ## Run pending migrations (additive, forward-only) on dev + test DBs
	$(ARTISAN) migrate --database=pgsql_privileged --force
	DB_DATABASE=cho_rach_test $(ARTISAN) migrate --database=pgsql_privileged --force
	DB_DATABASE=cho_rach_test $(ARTISAN) db:seed --class=PlatformPermissionSeeder --force
	DB_DATABASE=cho_rach_test $(ARTISAN) db:seed --class=AdminPermissionSeeder --force

seed: ## Run seeders (idempotent foundation data)
	$(ARTISAN) db:seed --force

# NOTE: no migrate:fresh / migrate:reset / db:wipe target by design —
# supreme rule: never run anything that can wipe DB data.

## ── Quality (host) ─────────────────────────────────────
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

## ── Utils (host) ───────────────────────────────────────
build: ## Build frontend assets
	pnpm run build

clear: ## Clear all caches
	$(ARTISAN) optimize:clear

tinker: ## Open a REPL
	$(ARTISAN) tinker
	
shell: ## Open shell in app container
	$(EXEC) bash