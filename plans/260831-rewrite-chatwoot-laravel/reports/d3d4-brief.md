# Đợt D3 Macros + D4 Webhooks/Agent Bots — brief chung cho 4 agent (06/09/2026)

Đọc file này TRƯỚC khi làm. Phiên chính (QA) đã bật môi trường; agent KHÔNG tự bật/tắt
server, worker, reverb, podman, KHÔNG chạy process nền, KHÔNG spawn agent con.

## Bối cảnh
- Repo `/home/robertnguyen/www/yona`, nhánh `rewrite/chatwoot-laravel`. Port 100% Chatwoot v4.17.1
  từ `refs/chatwoot` (CẤM mở `refs/chatwoot/enterprise/`). UI giống 100% (Inertia + React + TS).
- Đọc: `CLAUDE.md` khối đầu, `docs/code-standards.md` §0, `plans/260831-rewrite-chatwoot-laravel/plan.md`
  (13 quyết định), `reports/trace-d1-automation-rules.md` (bẫy đã trả giá; D3 dùng lại executor của D1),
  `reports/d5-notes.md` (mẫu note + cách wiring listener).
- Listener: class trong `app/Listeners` extends `BaseListener`, method `handle(DomainEvent $event)` rẽ nhánh
  theo `$event->methodName()` (Laravel event discovery tự đăng ký — xem `AutomationRuleListener`).
- Event types: `app/Events/EventType.php`. Action executor dùng chung: `app/Services/ConversationActions/ActionExecutor.php`.
- Route đã được phiên chính thêm SẴN (không sửa route file, chỉ tạo controller/page cho khớp tên):
  - `routes/web_api.php`: `/macros` CRUD + `POST /macros/{id}/execute` → `WebApi\MacrosController`;
    `/webhooks` → `WebApi\WebhooksController`; `/agent_bots` (+ `destroyAvatar`, `resetAccessToken`, `resetSecret`)
    → `WebApi\AgentBotsController`; `GET /inboxes/{id}/agent_bot` + `POST /inboxes/{id}/set_agent_bot`
    → `InboxesController@agentBot/@setAgentBot`; `GET /integrations/apps[/{appId}]` → `WebApi\Integrations\AppsController`.
  - `routes/web.php`: Inertia page `dashboard/settings/macros/Index`, `dashboard/settings/macros/MacroEditor`
    (prop `macroId?`), `dashboard/settings/agentBots/Index`, `dashboard/settings/integrations/Index`,
    `dashboard/settings/integrations/Webhooks/Index`, `dashboard/settings/integrations/ShowIntegration` (prop `integrationId`).
  - Cần route khác → ghi vào note của bạn, phiên chính thêm.
- i18n: `lang/en/<file>.php` là nguồn duy nhất (giữ key Chatwoot từ `app/javascript/dashboard/i18n/locale/en/*.json`),
  chạy `php artisan i18n:generate` để sinh `resources/js/i18n/generated/en.ts` (KHÔNG sửa tay file generated).
  Mỗi agent chỉ tạo/sửa đúng file lang của mình (ghi ở phần sở hữu).
- Ràng buộc sản phẩm (lệnh founder): người dùng cuối KHÔNG điền slug/key/identifier kỹ thuật; form chỉ nhận tên tự do.
- Tuân thủ CLAUDE.md: DRY, single point of modification, không hardcode case cụ thể vào lõi; comment tối thiểu, tiếng Việt.

## Môi trường test
- DB dev `yona_rw` — TUYỆT ĐỐI KHÔNG `migrate:fresh/refresh/wipe`. Chạy migration mới bằng `php artisan migrate`.
- Pest: MỖI agent dùng DB test RIÊNG: `createdb yona_rw_test_<slug>` (tạo extension `pg_trgm`, `pgcrypto`),
  chạy `DB_DATABASE=yona_rw_test_<slug> vendor/bin/pest <đường dẫn test của bạn>`; cuối cùng chạy TOÀN suite
  một lần với DB riêng đó, rồi `dropdb`. Không chạy `--parallel`.
- Pint theo danh sách file của bạn: `vendor/bin/pint <files>` (KHÔNG `--dirty`).
- FE: `npx tsc --noEmit`, `npm test -- <file>` (vitest), `npm run build` chỉ khi kết thúc. Lỗi tsc ở file của agent
  khác → ghi vào note, không sửa hộ.
- Oracle Chatwoot đang chạy `localhost:3000` (account id 1), Yona `localhost:8000` (account id 2);
  login `john@acme.inc` / `Password1!`. Seed oracle: `podman exec oracle-rails bundle exec rails runner '<ruby>'`.
  Yona API: `node ~/www/pixel-diff/yona-api.mjs <METHOD> <path> ['<json>']`.
- Pixel-diff harness `~/www/pixel-diff` (script PHẢI nằm trong đó): `node compare.mjs '/app/accounts/{id}/…' --login`,
  mẫu tương tác `d1-automation-ui.mjs`, `rediff.mjs`, `mask-diff.mjs`, `audit-buttons.mjs <base> <path>`.
  Ngưỡng ≤ 0.1% (nhiễu nền ~0.03%). Agent FE tự chạy pixel-diff cho màn của mình, light + dark.

## Các agent song song trong đợt này (không sửa file của nhau — nhắn qua SendMessage theo tên; nếu SendMessage
không khả dụng thì đọc/ghi CONTRACT trong file note của agent kia)
| Tên | Vùng sở hữu |
|---|---|
| `d3-be` | migration `macros`, `app/Models/Macro.php`, `app/Policies/MacroPolicy.php`, `app/Http/Controllers/WebApi/MacrosController.php`, `app/Http/Resources/Macro*`, `app/Services/Macros/**`, `app/Jobs/Macros*`, `tests/**/Macro*`, note `reports/d3-notes-be.md` |
| `d3-fe` | `resources/js/dashboard/settings/macros/**`, `resources/js/dashboard/conversation/macros/**` (mới), chỉ phần accordion `macros` trong `conversation/conversationbox/ContactPanel.tsx`, `resources/js/dashboard/commands/useMacroHotKeys.ts`, `lang/en/macros.php`, note `reports/d3-notes-fe.md` |
| `d4-be` | migration `webhooks`/`agent_bots`/`agent_bot_inboxes`, `app/Models/{Webhook,AgentBot,AgentBotInbox}.php`, trait `WebhookSecretable`, method `webhookData()` trên các model có sẵn, `app/Listeners/{WebhookListener,AgentBotListener}.php`, `app/Jobs/Webhook*`, `app/Jobs/AgentBots/**`, `app/Services/Webhooks/**`, `app/Http/Controllers/WebApi/{WebhooksController,AgentBotsController}.php`, `WebApi/Integrations/AppsController.php`, `config/integration/apps.php`, hai method `agentBot/setAgentBot` trong `InboxesController`, resources tương ứng, `tests/**/{Webhook,AgentBot,Integration}*`, note `reports/d4-notes-be.md` |
| `d4-fe` | `resources/js/dashboard/settings/integrations/**`, `resources/js/dashboard/settings/agentBots/**`, tab Bots trong `settings/inboxes/settingsPage/` + đăng ký tab, `lang/en/{integration_settings,webhooks,agent_bots}.php` (integration_settings.php đã có — bổ sung key thiếu), note `reports/d4-notes-fe.md` |

Agent backend: ghi CONTRACT API (route, body, JSON shape, mã lỗi) vào ĐẦU file note ngay khi chốt để agent FE đọc.
Agent FE: đọc contract từ note backend; trong lúc chờ, dựng UI theo jbuilder gốc (`app/views/api/v1/...`).

## Kết thúc
Kết thúc bằng:
```
Status: DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
Summary: 1–2 câu
Concerns/Blockers: (nếu có)
```
Note phải có: bảng trace Ruby↔PHP hoặc Vue↔TSX, spec↔Pest/vitest, "Khác biệt cố ý", "Bẫy đã trả giá", kết quả gate.

## Bổ sung đợt D2 Reports (chạy song song cùng D3/D4, cùng quy tắc trên)
| Tên | Vùng sở hữu |
|---|---|
| `d2-be` | migration `reporting_events` (+ `reporting_events_rollups` nếu port rollup), `app/Models/ReportingEvent*.php`, concern `Reportable`, `app/Listeners/ReportingEventListener.php`, `app/Services/ReportingEvents/**`, `app/Services/Reports/**`, `app/Builders/Reports/**` (V2::ReportBuilder + reports/*), `app/Http/Controllers/WebApi/Reports/{ReportsController,SummaryReportsController,LiveReportsController}.php`, `app/Http/Controllers/WebApi/CsatSurveyResponsesController.php` phần `metrics`/`download` nếu C5 chưa có, `app/Policies/ReportPolicy.php`, `tests/**/Report*`, note `reports/d2-notes-be.md` |
| `d2-fe-charts` | `resources/js/dashboard/reports/**` (mới) gồm primitives chart (port `@chatwoot/viz` BarChart/PercentageChart/HeatmapChart sang React, đặt ở `resources/js/shared/components/charts/`), `ReportsWrapper`, `ReportHeader`, `ReportFilters`, `OverviewReportFilters`, `ReportMetricCard`, `ChartStats`, `ReportContainer`, heatmaps, trang Overview (`LiveReports`) + trang Conversation (`Index`); `lang/en/report.php` (+ `overview_reports.php` nếu gốc tách file); note `reports/d2-notes-fe-charts.md` |
| `d2-fe-pages` (đợt sau, khi charts xong) | các trang Agent/Inbox/Label/Team cũ + `*_overview` + `*/:id` drilldown, CSAT responses, Bot reports |
Route đã có sẵn: `routes/web.php` các page `dashboard/reports/{LiveReports,Index,CsatResponses,BotReports,AgentReports,InboxReports,LabelReports,TeamReports,AgentReportsIndex,AgentReportsShow,…}` (prop `id` cho trang show); `routes/web_api.php` nhóm `/api/v2/accounts/{account}/reports/*`, `/summary_reports/*`, `/live_reports/*` → `WebApi\Reports\{ReportsController,SummaryReportsController,LiveReportsController}` (tên method camelCase của action gốc).

## Bổ sung đợt E (E1 + E2 + E4-be, chạy song song với `d2-fe-pages`; cùng quy tắc trên)
| Tên | Vùng sở hữu |
|---|---|
| `e1-be` | migration `custom_attribute_definitions` + `custom_filters`, `app/Models/{CustomAttributeDefinition,CustomFilter}.php`, `app/Policies/*` tương ứng, `app/Http/Controllers/WebApi/{CustomAttributeDefinitionsController,CustomFiltersController}.php`, resources, `app/Services/Filters/**` (custom attribute filter cho hội thoại + liên hệ; MỞ RỘNG `app/Services/Conversations/FilterService.php` có sẵn, không nhân bản), `POST /contacts/filter` nếu thiếu, `tests/**/{CustomAttribute,CustomFilter,ContactsFilter}*`, note `reports/e1-notes-be.md` |
| `e1-fe` | `resources/js/dashboard/settings/attributes/**`, `components-next/filter/{ContactsFilter,SaveCustomView}.tsx` + `contactProvider.ts` (+ mở rộng ConditionRow/provider có sẵn cho custom attribute), `components-next/CustomAttributes/**`, `components/CustomAttribute*.tsx`, khối "Contact Attributes"/"Conversation Information" trong `conversation/conversationbox/ContactPanel.tsx` (CHỈ body hai accordion đó), mục Folders/Segments trong `components-next/sidebar/menuItems.ts` (+ store customViews), trang contacts nhận prop `segmentId`, `lang/en/{custom_attributes,attributes_mgmt}.php` (+ key filter), note `reports/e1-notes-fe.md` |
| `e2` | backend `app/Services/SearchService.php`, `WebApi/SearchController.php`, resources, Pest; FE `resources/js/dashboard/search/**` (page `SearchView.tsx` prop `tab?`), `lang/en/search.php`, note `reports/e2-notes.md` |
| `e4-be` | migration `portals`/`categories`/`articles`/`related_categories`/`portal_members`…, models, policies, `WebApi/{Portals,Categories,Articles}Controller` + bulk actions, public API `app/Http/Controllers/Public/Portals/**` (trang `/hc/*` render Blade/Inertia ở đợt E4-fe), services (article search, slug), Pest (route đăng ký tạm trong test như `d2-be` đã làm — KHÔNG sửa `routes/*.php`, ghi route cần thêm vào đầu note), note `reports/e4-notes-be.md` |
Route stub đã có: `web_api.php` `/custom_attribute_definitions` CRUD, `/custom_filters` CRUD, `/search{,/conversations,/messages,/contacts,/articles}`; `web.php` `/settings/custom-attributes/list` → `dashboard/settings/attributes/Index`, `/custom_view/{foldersId}[/conversations/{id}]` → `ConversationView` prop `foldersId`, `/contacts/segments/{segmentId}` → `dashboard/contacts/Index` prop `segmentId`, `/contacts/{id}/segments/{segmentId}`, `/search/{tab?}` → `dashboard/search/SearchView`.
Nhắc: `d2-fe-pages` đang sửa `resources/js/dashboard/reports/**` + `lang/en/report.php` — không đụng.

## Bổ sung đợt E (2): `e4-fe` + `e3-be`
| Tên | Vùng sở hữu |
|---|---|
| `e4-fe` | `resources/js/dashboard/helpcenter/**` (mới), `resources/js/portal/**` (trang public, mới) hoặc Blade `resources/views/public/portal/**`, lớp render HTML trong `app/Http/Controllers/Public/Portals/*` (giữ JSON), khối route giữa hai comment `// E4 helpcenter.routes.js — BEGIN/END` trong `routes/web.php`, `lang/en/help_center.php` (+ file lang portal public), note `reports/e4-notes-fe.md`. KHÔNG sửa `components-next/sidebar/menuItems.ts` (e1-fe đang giữ) — ghi thay đổi sidebar cần thiết vào note. Cấu hình `help_center` trong `InboxResource`/tab inbox: ghi note, phiên chính giao sau. |
| `e3-be` | migration `data_imports`, `data_import_*`, model/job/service import CSV (`DataImportJob`, `DataImportService`), `Account\ContactsExportJob` + mailer export, `WebApi\DataImportsController`, `contacts#export`, `contacts#import`, `contacts#destroy_custom_attributes`, `contacts#active`/sort/`include_contact_inboxes` (kiểm thiếu gì so `contacts_controller.rb`), khối route giữa hai comment `// E3 data_imports + contacts export — BEGIN/END` trong `routes/web_api.php`, Pest, note `reports/e3-notes-be.md` |
