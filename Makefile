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
        migrate seed test format pint pint-test stan check build \
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
		$(DC) run --rm app php artisan migrate --force && \
		$(DC) up -d && \
		echo "✓ setup done → http://localhost:8080  (frontend: make docker-front)"; \
	else \
		echo "→ Docker not available — running host setup"; \
		$(COMPOSER) install && \
		pnpm install && \
		{ test -f .env || cp .env.example .env; } && \
		{ grep -q "APP_KEY=base64:" .env || $(ARTISAN) key:generate; } && \
		$(ARTISAN) migrate && \
		pnpm run build && \
		echo "✓ host setup done"; \
	fi

# The Docker entrypoint bootstraps .env / vendor / APP_KEY on first boot, so
# `run --rm app ...` and `up -d` are enough — no host-side shell builtins needed.
setup-docker: ## Force Docker setup (build, bootstrap, migrate, start app)
	$(DC) build
	$(DC) up -d postgres redis
	$(DC) run --rm app php artisan migrate --force
	$(DC) up -d
	@echo "✓ setup done → http://localhost:8080  (frontend: make docker-front)"

setup-host: ## Force host setup (deps + env + key + migrate + assets)
	$(COMPOSER) install
	pnpm install
	@test -f .env || cp .env.example .env
	@grep -q "APP_KEY=base64:" .env || $(ARTISAN) key:generate
	$(ARTISAN) migrate
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

docker-migrate: ## Run pending migrations in the container
	$(EXEC) php artisan migrate

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

## ── Run (host) ─────────────────────────────────────────
dev: ## Run full stack (server + queue + logs + vite)
	$(COMPOSER) run dev

serve: ## Serve the app (http://localhost:8000)
	$(ARTISAN) serve

queue: ## Run a queue worker
	$(ARTISAN) queue:listen --tries=1

horizon: ## Run Horizon (Redis queues)
	$(ARTISAN) horizon

reverb: ## Run Reverb websocket server (live chat)
	$(ARTISAN) reverb:start

## ── Database (host) ────────────────────────────────────
migrate: ## Run pending migrations (additive, forward-only)
	$(ARTISAN) migrate

seed: ## Run seeders
	$(ARTISAN) db:seed

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
	$(PHP) vendor/bin/phpstan analyse

check: pint-test stan test ## Run all quality gates

## ── Utils (host) ───────────────────────────────────────
build: ## Build frontend assets
	pnpm run build

clear: ## Clear all caches
	$(ARTISAN) optimize:clear

tinker: ## Open a REPL
	$(ARTISAN) tinker
