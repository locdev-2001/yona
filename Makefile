# Yona (rewrite/chatwoot-laravel) — dev shortcuts.
# Yêu cầu PHP 8.4 + Postgres + Redis local. DB dev = yona_rw, test = yona_rw_test.

PHP      := php
ARTISAN  := $(PHP) artisan
COMPOSER := composer
PSQL     := psql -h 127.0.0.1 -U postgres

.DEFAULT_GOAL := help
.PHONY: help setup dev serve migrate seed test format stan check build tinker

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN{FS=":.*?## "}{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

setup: ## First-time: deps + env + key + DB + migrate + assets
	$(COMPOSER) install
	pnpm install
	@test -f .env || cp .env.example .env
	@grep -q "APP_KEY=base64:" .env || $(ARTISAN) key:generate
	@$(PSQL) -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='yona_rw'" | grep -q 1 || $(PSQL) -d postgres -c "CREATE DATABASE yona_rw OWNER yona_owner"
	@$(PSQL) -d postgres -tc "SELECT 1 FROM pg_database WHERE datname='yona_rw_test'" | grep -q 1 || $(PSQL) -d postgres -c "CREATE DATABASE yona_rw_test OWNER yona_owner"
	$(PSQL) -d yona_rw -c "CREATE EXTENSION IF NOT EXISTS pg_trgm"
	$(PSQL) -d yona_rw_test -c "CREATE EXTENSION IF NOT EXISTS pg_trgm"
	$(ARTISAN) migrate --force
	$(ARTISAN) db:seed --force
	pnpm build

dev: ## Vite dev server
	pnpm dev

serve: ## Laravel dev server (port 8000)
	$(ARTISAN) serve --port=8000

migrate: ## Run migrations (yona_rw)
	$(ARTISAN) migrate

seed: ## Seed dev data
	$(ARTISAN) db:seed

test: ## Pest suite (yona_rw_test)
	$(COMPOSER) test

format: ## Pint
	vendor/bin/pint

build: ## tsc + vite build
	pnpm tsc && pnpm build

check: format test build ## Full gate: pint + pest + tsc + vite build

tinker: ## artisan tinker
	$(ARTISAN) tinker
