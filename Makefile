# Chó Rách Management — local dev shortcuts (host PHP 8.4 + local Postgres/Redis).
# Docker is for other devs (see docs/local-development.md); these targets run on the host.

# Force PHP 8.4 into the recipe PATH (harness/make shells may default to 8.3).
export PATH := /opt/homebrew/opt/php@8.4/bin:$(PATH)

PHP      := php
ARTISAN  := $(PHP) artisan
COMPOSER := composer

.DEFAULT_GOAL := help
.PHONY: help setup install dev serve queue horizon reverb \
        migrate seed test pint pint-test stan check build \
        clear tinker

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

## ── Setup ──────────────────────────────────────────────
setup: install migrate build ## First-time: deps + migrate + assets
	@echo "✓ setup done"

install: ## Install PHP + JS dependencies
	$(COMPOSER) install
	pnpm install

## ── Run ────────────────────────────────────────────────
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

## ── Database ───────────────────────────────────────────
migrate: ## Run pending migrations (additive, forward-only)
	$(ARTISAN) migrate

seed: ## Run seeders
	$(ARTISAN) db:seed

# NOTE: no migrate:fresh / migrate:reset / db:wipe target by design —
# supreme rule: never run anything that can wipe DB data.

## ── Quality ────────────────────────────────────────────
test: ## Run the Pest test suite
	$(ARTISAN) test

pint: ## Format code (Laravel Pint)
	$(PHP) vendor/bin/pint

pint-test: ## Check formatting without changing files
	$(PHP) vendor/bin/pint --test

stan: ## Static analysis (Larastan)
	$(PHP) vendor/bin/phpstan analyse

check: pint-test stan test ## Run all quality gates

## ── Utils ──────────────────────────────────────────────
build: ## Build frontend assets
	pnpm run build

clear: ## Clear all caches
	$(ARTISAN) optimize:clear

tinker: ## Open a REPL
	$(ARTISAN) tinker
