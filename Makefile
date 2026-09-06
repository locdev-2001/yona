# Yona (rewrite/chatwoot-laravel) — dev shortcuts.
# Yêu cầu PHP 8.4 + Postgres + Redis local. DB dev = yona_rw, test = yona_rw_test.

PHP      := php
ARTISAN  := $(PHP) artisan
COMPOSER := composer
PSQL     := psql -h 127.0.0.1 -U postgres
ORACLE   := $(HOME)/www/chatwoot-oracle/oracle.sh
PIXEL    := $(HOME)/www/pixel-diff

.DEFAULT_GOAL := help
.PHONY: help setup dev serve worker reverb migrate seed test format stan check build i18n i18n-check tinker \
	up down status oracle oracle-down oracle-status diff

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
	$(ARTISAN) i18n:generate
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

i18n: ## Sinh bundle i18n frontend từ lang/{locale}/*.php
	$(ARTISAN) i18n:generate

i18n-check: ## Bundle i18n đã commit phải khớp lang/ (gate CI)
	$(ARTISAN) i18n:generate --check

build: i18n ## i18n:generate + tsc + vite build
	pnpm tsc && pnpm build

check: format i18n-check test build ## Full gate: pint + i18n-check + pest + tsc + vite build

tinker: ## artisan tinker
	$(ARTISAN) tinker

QUEUE_TIERS = critical,high,medium,default,mailers,low,scheduled_jobs,purgable

REVERB_PORT ?= 8080

up: ## Bật cả môi trường sau khi mở máy: oracle (podman :3000) + yona serve (:8000) + queue worker + reverb (:8080) chạy nền
	$(ORACLE) up
	@if curl -sf -o /dev/null http://localhost:8000; then \
		echo "yona: đã chạy sẵn trên :8000"; \
	else \
		nohup $(PHP) artisan serve --port=8000 > storage/logs/serve.log 2>&1 & \
		sleep 2 && curl -sf -o /dev/null http://localhost:8000 \
			&& echo "yona: đã start trên :8000 (log: storage/logs/serve.log)" \
			|| { echo "yona: START LỖI — xem storage/logs/serve.log"; exit 1; }; \
	fi
	@if [ -f storage/logs/worker.pid ] && kill -0 $$(cat storage/logs/worker.pid) 2>/dev/null; then \
		echo "worker: đã chạy sẵn (pid $$(cat storage/logs/worker.pid))"; \
	else \
		nohup $(PHP) artisan queue:listen --queue=$(QUEUE_TIERS) --tries=1 > storage/logs/worker.log 2>&1 & \
		echo $$! > storage/logs/worker.pid; \
		echo "worker: đã start (queue:listen $(QUEUE_TIERS) — log: storage/logs/worker.log)"; \
	fi
	@if [ -f storage/logs/reverb.pid ] && kill -0 $$(cat storage/logs/reverb.pid) 2>/dev/null; then \
		echo "reverb: đã chạy sẵn (pid $$(cat storage/logs/reverb.pid))"; \
	else \
		nohup $(PHP) artisan reverb:start --port=$(REVERB_PORT) > storage/logs/reverb.log 2>&1 & \
		echo $$! > storage/logs/reverb.pid; \
		echo "reverb: đã start trên :$(REVERB_PORT) (log: storage/logs/reverb.log)"; \
	fi
	@$(MAKE) --no-print-directory status

worker: ## Queue worker foreground (dev): đủ tier theo phân tầng Chatwoot
	$(ARTISAN) queue:listen --queue=$(QUEUE_TIERS) --tries=1

reverb: ## Reverb websocket server foreground (:8080) — thay ActionCable
	$(ARTISAN) reverb:start --port=$(REVERB_PORT) --debug

down: ## Tắt yona serve + worker + reverb + oracle
	@pkill -f 'artisan serve --port=8000' && echo "yona: đã tắt" || echo "yona: không có process nào"
	@if [ -f storage/logs/worker.pid ]; then \
		{ kill $$(cat storage/logs/worker.pid) 2>/dev/null && echo "worker: đã tắt"; } || echo "worker: không có process nào"; \
		rm -f storage/logs/worker.pid; \
	else echo "worker: không có process nào"; fi
	@if [ -f storage/logs/reverb.pid ]; then \
		{ kill $$(cat storage/logs/reverb.pid) 2>/dev/null && echo "reverb: đã tắt"; } || echo "reverb: không có process nào"; \
		rm -f storage/logs/reverb.pid; \
	else echo "reverb: không có process nào"; fi
	$(ORACLE) down

status: ## Kiểm tra cổng 3000/8000/8080 + worker + container podman
	@printf 'oracle  :3000  '; curl -sf -o /dev/null http://localhost:3000 && echo OK || echo TẮT
	@printf 'yona    :8000  '; curl -sf -o /dev/null http://localhost:8000 && echo OK || echo TẮT
	@printf 'worker         '; { [ -f storage/logs/worker.pid ] && kill -0 $$(cat storage/logs/worker.pid) 2>/dev/null; } && echo OK || echo TẮT
	@printf 'reverb  :$(REVERB_PORT)  '; curl -sf -o /dev/null http://localhost:$(REVERB_PORT)/up && echo OK || echo TẮT
	@podman ps --format '  podman: {{.Names}} ({{.Status}})' 2>/dev/null || true

oracle: ## Bật oracle Chatwoot (podman)
	$(ORACLE) up

oracle-down: ## Tắt oracle
	$(ORACLE) down

oracle-status: ## Trạng thái oracle
	$(ORACLE) status

diff: ## Pixel-diff oracle vs yona: make diff PAGE='/app/login' (trang auth: PAGE='/app/accounts/{id}/dashboard')
	cd $(PIXEL) && node compare.mjs '$(PAGE)'
