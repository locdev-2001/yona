# Yona — dev shortcuts.
# Yêu cầu PHP 8.4 + Postgres + Redis local. DB dev = yona_rw, test = yona_rw_test.

PHP      := php
ARTISAN  := $(PHP) artisan
# Chạy composer bằng đúng PHP của artisan: shebang của composer có thể trỏ PHP hệ
# thống khác phiên bản (tzdata hệ thống thiếu tên múi giờ cũ, Pest đỏ giả).
COMPOSER := $(PHP) $(shell command -v composer)
PSQL     := psql -h 127.0.0.1 -U postgres

.DEFAULT_GOAL := help
.PHONY: help setup dev serve worker reverb migrate seed test format stan check build i18n i18n-check tinker \
	up down status

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

serve: ## Laravel dev server (cổng lấy từ SERVER_PORT trong .env)
	$(ARTISAN) serve

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

# Thứ tự tier là MỘT nguồn duy nhất: config/queue_tiers.php. Horizon
# (production) đọc cùng file đó, Makefile chỉ đọc lại cho queue:listen dev.
QUEUE_TIERS := $(shell $(PHP) -r 'echo implode(",", require "config/queue_tiers.php");')

# Cổng là MỘT nguồn duy nhất: .env. `artisan serve`/`reverb:start` tự đọc
# SERVER_PORT/REVERB_SERVER_PORT, Makefile chỉ đọc lại để kiểm tra và in thông báo.
APP_PORT ?= $(shell sed -n 's/^SERVER_PORT=//p' .env 2>/dev/null | head -1)
APP_PORT := $(if $(APP_PORT),$(APP_PORT),8610)
REVERB_PORT ?= $(shell sed -n 's/^REVERB_SERVER_PORT=//p' .env 2>/dev/null | head -1)
REVERB_PORT := $(if $(REVERB_PORT),$(REVERB_PORT),8611)

up: ## Bật cả môi trường sau khi mở máy: yona serve + queue worker + reverb chạy nền (cổng theo .env)
	@if curl -sf -o /dev/null http://localhost:$(APP_PORT); then \
		echo "yona: đã chạy sẵn trên :$(APP_PORT)"; \
	else \
		nohup $(PHP) artisan serve > storage/logs/serve.log 2>&1 & \
		sleep 2 && curl -sf -o /dev/null http://localhost:$(APP_PORT) \
			&& echo "yona: đã start trên :$(APP_PORT) (log: storage/logs/serve.log)" \
			|| { echo "yona: START LỖI — xem storage/logs/serve.log"; exit 1; }; \
	fi
	@if [ -f storage/logs/worker.pid ] && kill -0 $$(cat storage/logs/worker.pid) 2>/dev/null; then \
		echo "worker: đã chạy sẵn (pid $$(cat storage/logs/worker.pid))"; \
	else \
		nohup $(PHP) artisan queue:listen --queue=$(QUEUE_TIERS),stickers --tries=1 > storage/logs/worker.log 2>&1 & \
		echo $$! > storage/logs/worker.pid; \
		echo "worker: đã start (queue:listen $(QUEUE_TIERS) — log: storage/logs/worker.log)"; \
	fi
	@if [ -f storage/logs/reverb.pid ] && kill -0 $$(cat storage/logs/reverb.pid) 2>/dev/null; then \
		echo "reverb: đã chạy sẵn (pid $$(cat storage/logs/reverb.pid))"; \
	else \
		nohup $(PHP) artisan reverb:start > storage/logs/reverb.log 2>&1 & \
		echo $$! > storage/logs/reverb.pid; \
		echo "reverb: đã start trên :$(REVERB_PORT) (log: storage/logs/reverb.log)"; \
	fi
	@$(MAKE) --no-print-directory status

worker: ## Queue worker foreground (dev): đủ tier theo config/queue_tiers.php
	$(ARTISAN) queue:listen --queue=$(QUEUE_TIERS),stickers --tries=1

reverb: ## Reverb websocket server foreground (cổng theo .env)
	$(ARTISAN) reverb:start --debug

down: ## Tắt yona serve + worker + reverb
	@pkill -f 'artisan serve' && echo "yona: đã tắt" || echo "yona: không có process nào"
	@if [ -f storage/logs/worker.pid ]; then \
		{ kill $$(cat storage/logs/worker.pid) 2>/dev/null && echo "worker: đã tắt"; } || echo "worker: không có process nào"; \
		rm -f storage/logs/worker.pid; \
	else echo "worker: không có process nào"; fi
	@if [ -f storage/logs/reverb.pid ]; then \
		{ kill $$(cat storage/logs/reverb.pid) 2>/dev/null && echo "reverb: đã tắt"; } || echo "reverb: không có process nào"; \
		rm -f storage/logs/reverb.pid; \
	else echo "reverb: không có process nào"; fi

status: ## Kiểm tra yona + reverb + worker (cổng theo .env)
	@printf 'yona    :$(APP_PORT)  '; curl -sf -o /dev/null http://localhost:$(APP_PORT) && echo OK || echo TẮT
	@printf 'worker         '; { [ -f storage/logs/worker.pid ] && kill -0 $$(cat storage/logs/worker.pid) 2>/dev/null; } && echo OK || echo TẮT
	@printf 'reverb  :$(REVERB_PORT)  '; curl -sf -o /dev/null http://localhost:$(REVERB_PORT)/up && echo OK || echo TẮT
