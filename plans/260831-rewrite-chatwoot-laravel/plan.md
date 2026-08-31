# Rewrite 100% Chatwoot → Laravel (plan 260831)

**Lệnh founder 31/08/2026:** viết lại toàn bộ Chatwoot v4.17.1 (trừ `enterprise/`) sang Laravel, fresh start — không giữ hệ thống cũ. Zalo cá nhân + automation cũ trích từ `main` cắm lại SAU khi rewrite xong. UI = Inertia + React nhưng **giống 100% giao diện Chatwoot**.

**Trạng thái — HANDOFF 31/08/2026 (phiên 2 kết thúc: A3-nửa-sau + A4 = đủ 2 tính năng theo nhịp founder):**

**Đã xong: A1 + A2 + A3 + A4** (…`6a0b3ed` A3 → `b7cb796` scaffold → `2f71525` A4 → `01b51ee` fix 5 finding pixel → `6823979` fix ranh giới stylesheet → `7645fbd` docs). Gate: Pest **57/57** + tsc + `pnpm build` xanh; pint sạch.
- Trace từng tính năng: `reports/trace-a1-login.md`, `trace-a2-signup-account.md`, `trace-a3-shell-sidebar.md`, `trace-a4-profile-settings.md` (A4 có bảng 6 finding pixel-diff + cách fix).
- **A4 gồm:** `/api/v1/profile` GET/PUT + DELETE avatar (bảng attachments polymorphic), đổi email kiểu Devise reconfirmable, trang profile settings đủ section (signature textarea tạm chờ ProseMirror B3; MFA/Sessions/Audio/AccessToken → F8/D5), avatar_url + message_signature vào shared props, sidebar_width → ui_settings.
- **Pixel-diff (yona-ee xác nhận):** flyout collapsed **0.000%**, profile settings 0.114%/0.122% (toàn data noise), login/signup vẫn 0.000% sau các fix. DoD (a)(b)(c) A1–A4 ĐẠT; (d) founder "Test ngay" A3+A4: yona-ee đã báo founder bấm.
- **Bài học phiên này (đã trả giá, đừng lặp):** (1) `<html>` phải có `dir="ltr"` — thiếu là mọi variant `ltr:`/`rtl:` Tailwind chết im lặng; (2) Chatwoot có style leak KHÔNG scoped `p:last-child{mb-0}` từ message bubble — đã port vào `_base.scss`, spacing các màn sau phụ thuộc nó; (3) ranh giới bundle v3.scss↔app.scss: mọi chuyển trang auth↔dashboard PHẢI `Inertia::location` (login/logout đã làm) — thêm flow mới vượt ranh giới thì nhớ; (4) enum availability = online:0/offline:1/busy:2 (từng bị port đảo).
- **Hạ tầng kiểm chứng (phiên yona-ee giữ, KHÔNG đụng):** oracle Chatwoot podman `http://localhost:3000` (`~/www/chatwoot-oracle/oracle.sh`), pixel-diff `~/www/pixel-diff` (`node compare.mjs <path>`). Kết quả: login + signup **0.000%** light+dark (DoD (c) A1+A2 ĐẠT, ngưỡng 0.5%). Bài học đã trả giá: trang auth v3 dùng stylesheet riêng `resources/scss/v3.scss` (không `_base.scss` — xem blade switch theo prefix component `v3/`).
- DB: dev `yona_rw` (seed john@acme.inc / Password1! + account "Acme Inc" id=2; founder@yona.vn + account "Yona" id=1), test `yona_rw_test`. `ENABLE_ACCOUNT_SIGNUP=true` trong .env dev.
- Hạ tầng kiểm chứng (phiên yona-ee giữ, KHÔNG đụng): oracle podman :3000 (`~/www/chatwoot-oracle/oracle.sh`, đã ENABLE_RACK_ATTACK=false + nâng MAX_USER_SESSIONS), pixel-diff `~/www/pixel-diff` (compare.mjs auto-login, flyout.mjs, collapsed.mjs). Xong tính năng → nhắn yona-ee diff.

**Việc kế tiếp: A5 Quản lý Agents** (roadmap dòng 33): nguồn `settings/agents` + `/api/v1/accounts/:id/agents` (5 endpoint) + `AgentBuilder`; port CRUD agent + mời qua email (mailer + template) + role agent/administrator + xác nhận tài khoản; Pest port từ spec agents. Test ngay: mời agent qua mail (log/mailpit) → agent đặt password → đăng nhập → thấy trong danh sách. Lưu ý có sẵn: khung mail xác nhận + `User::passwordRules()` + `ConfirmationInstructions` (A2/A4), routes agents đặt TRƯỚC catch-all placeholder, trang settings dùng lại `SettingsWrapper`/`SectionLayout`/`BaseSettingsHeader` vừa dựng ở A4. Nhịp: xong A5 compact; xong A5+A6 handoff phiên mới.

**Nhịp phiên (lệnh founder):** xong mỗi tính năng → compact; xong mỗi 2 tính năng → handoff như note này.

## Quyết định kiến trúc (chốt khi lập plan)

| # | Quyết định | Lý do |
|---|---|---|
| 1 | Branch `rewrite/chatwoot-laravel`; main giữ nguyên chạy được tới khi swap | founder chọn |
| 2 | DB dev mới **`yona_rw`** cho nhánh rewrite (main vẫn dùng `yona`); swap xong mới hợp nhất tên | không phá main; founder xác nhận data xóa được |
| 3 | Giữ quy ước 3 mặt tiền route: `web.php` (Inertia page) / `web_api.php` (JSON cho SPA, session) / `api.php` (token) — map thẳng vào namespace Chatwoot (dashboard SPA ↔ web_api, public+platform API ↔ api) | quy ước founder trong docs/code-standards.md §0, khớp tự nhiên với Chatwoot |
| 4 | Realtime: **Laravel Reverb** + Echo, giữ khái niệm `pubsub_token` + 1 kênh RoomChannel + presence heartbeat | thay ActionCable 1:1 |
| 5 | Queue: Redis + **Horizon**, giữ phân tầng queue (critical > high > medium > default > mailers > low > scheduled…); cron = Laravel scheduler | thay Sidekiq + sidekiq-cron |
| 6 | Event: Laravel Events/Listeners, **giữ nguyên tên ~35 event** (`message.created`, `conversation.status_changed`…) + 10 listener như Chatwoot | tương đương Wisper dispatcher |
| 7 | `display_id` per-account: **giữ PG trigger + sequence** như Chatwoot (`conv_dpid_seq_<id>`) | hành vi y hệt, ít code nhất |
| 8 | Feature flags: bảng jsonb trên `accounts.feature_flags` (map từ `features.yml`), KHÔNG bê bitset FlagShihTzu | bitset là chi tiết Ruby gem, không phải hành vi |
| 9 | File: bảng `attachments` + Laravel filesystem (thay ActiveStorage 3 bảng) | idiom Laravel |
| 10 | Search: `pg_trgm` GIN như Chatwoot; KHÔNG Elasticsearch (advanced_search = EE) | |
| 11 | Frontend: port nguyên 4 file token (`tailwind.config.js`, `theme/colors.js`, `theme/icons.js`, `_next-colors.scss`) TRƯỚC, giữ cả 2 hệ màu (legacy + `n-*`), class `dark` trên `<body>`; state = TanStack Query + Zustand theo shape store Chatwoot | pixel-perfect, xem frontend-inventory §4.6 |
| 12 | Skip toàn bộ EE: 30 bảng, ~150 endpoint (Captain/SLA/roles/audit/SAML/voice/companies/billing), cột EE trong bảng core để null/bỏ | giấy phép + founder chốt chưa cần |
| 13 | Zalo cá nhân = **`Channel::Zalo`** driver mới trong khung channel Chatwoot (bảng `channel_zalo`), tái dùng zalo-bridge từ main | thêm kênh = thêm driver |

## Phạm vi số liệu
~62 bảng nghiệp vụ OSS, ~600 endpoint (trừ EE còn ~450), 98 job nền, 246 service, 38 builder, 10 listener; FE: dashboard 1.057 .vue + widget 46 + v3 21 + survey + portal; components-next 492 .vue. Chi tiết: [backend-inventory](reports/backend-inventory.md) · [api-jobs-inventory](reports/api-jobs-inventory.md) · [frontend-inventory](reports/frontend-inventory.md).

## Cách giao hàng (lệnh founder 31/08, bổ sung)
Port **TỪNG TÍNH NĂNG** một — mỗi tính năng đi đủ migration → backend → UI, xong là dùng được trên UI và test được ngay, rồi mới sang tính năng kế. KHÔNG port toàn bộ cùng lúc. Danh sách tính năng + thứ tự thi công + tiêu chí test từng mục: **[feature-roadmap.md](feature-roadmap.md)** (nhóm A→G, ~40 tính năng). Bảng sóng dưới đây chỉ là nhóm logic của các tính năng đó.

## Các sóng (nhóm logic)

| Sóng | Nội dung | Ra được gì chạy được | Phụ thuộc |
|---|---|---|---|
| **0. Nền móng** | Laravel 12 skeleton mới trên branch (xóa app cũ), DB `yona_rw` + migration cụm core, auth (users STI SuperAdmin, account_users, access_tokens, MFA để sau), Current context + account scoping, khung event/queue/Reverb, design tokens + primitives React (button/input/dialog/dropdown…), layout shell + sidebar | Đăng nhập, tạo account, vào dashboard shell trống đúng giao diện Chatwoot | — |
| **1. Trục hội thoại** | inboxes + channel polymorphic (WebWidget, Api), contacts + contact_inboxes, conversations + messages + attachments, labels, teams, assignment (round-robin), participants/mentions/draft, unread counts, ConversationFinder/filter, realtime broadcast đủ event, UI: ChatList + ConversationBox + ReplyBox + ContactPanel + settings inbox/agents/teams/labels | Agent chat được với contact tạo qua API channel, realtime 2 chiều | 0 |
| **2. Widget + SDK** | Public API (`/public/api/v1`), widget iframe app (React), SDK IIFE + postMessage protocol y hệt, widget JWT + HMAC identity, pre-chat form, campaigns ongoing (livechat), CSAT survey app | Website ngoài nhúng script → chat end-to-end với dashboard | 1 |
| **3. Vận hành** | Automation rules (+delayed pending executions), macros, canned responses, webhooks out (HMAC signing), agent bots, notifications (in-app + email + push), CSAT flow đầy đủ, email templates + mailers, MessageTemplates hooks (greeting/email_collect/out_of_office/csat/auto_resolve), working hours | Automation 18 action chạy, notify đủ đường | 1 |
| **4. Dữ liệu & nhìn lại** | reporting_events + rollups + toàn bộ reports UI (overview/conversation/csat/bot/agent/inbox/team/label), search toàn cục, custom attributes + custom filters + segments, contacts UI đầy đủ, data import/export CSV, campaigns one-off, Help Center (portals/categories/articles + trang public `/hc`) | Reports + search + import dùng được | 1, 3 |
| **5. Kênh & nền tảng** | Email channel (SMTP/IMAP + mailbox reply parsing), FB Messenger, Instagram, Telegram, LINE, SMS/Twilio, WhatsApp Cloud, TikTok, Twitter (theo độ ưu tiên VN: Email → FB → IG → Telegram → còn lại), integrations (slack/dialogflow/translate/linear/notion/shopify — chọn lọc), Platform API, Super Admin | Thêm kênh thật ngoài widget | 1, 3 |
| **6. Zalo + hợp nhất** | `Channel::Zalo` driver (trích zalo-bridge + logic từ main), automation cũ nếu còn gì chưa phủ, i18n vi hoàn chỉnh, e2e browser gate toàn hệ, hardening + deploy runbook, **swap main** | Yona mới thay main, có Zalo | 2, 5 |

Trong mỗi sóng: phase file chi tiết viết KHI VÀO SÓNG (`phase-XX-*.md`), không viết trước cả 7 sóng.

## Giao thức kiểm chứng port (chốt 31/08 — trả lời "làm sao chắc port đúng")
1. **Ported test suite:** mỗi tính năng port kèm RSpec tương ứng trong `refs/chatwoot/spec/` → Pest. Code phải pass test dịch từ đặc tả gốc, không phải test tự nghĩ.
2. **Oracle sống:** dựng Chatwoot gốc chạy local bằng `refs/chatwoot/docker-compose.yaml` (việc đầu A1). Cùng kịch bản bắn vào 2 hệ → so DB + response + event.
3. **Contract test:** response API mới khớp schema `refs/chatwoot/swagger/`.
4. **Trace nguồn→đích:** report mỗi tính năng có bảng file Ruby ↔ file PHP, method bỏ (EE) ghi lý do.
5. **Visual regression:** Playwright chụp màn gốc vs bản React (cùng viewport + seed, light + dark) → pixel-diff; 92 Histoire story làm mốc component.
6. **Definition of Done mỗi tính năng:** (a) Pest port xanh, (b) bảng trace, (c) pixel-diff đạt, (d) founder bấm kịch bản "Test ngay" trên UI. Thiếu 1 = chưa done.

## Tiêu chí nghiệm thu xuyên suốt
- Gate mỗi cụm: `composer test` (Pest) + `npm run build` + tsc xanh ([[build-verify-gate-frontend]]).
- Seam nối module có test end-to-end, không chỉ per-step ([[integration-seam-end-to-end-verify]]).
- Xong cụm tính năng → e2e trình duyệt như người dùng cuối ([[e2e-browser-gate]]).
- UI đối chiếu screenshot với Chatwoot chạy tham chiếu (Histoire 92 story làm mốc).
- Không mở/port bất kỳ file nào dưới `refs/chatwoot/enterprise/`.
- Giữ copyright notice MIT của Chatwoot, gỡ nhãn hiệu "Chatwoot" trong UI.

## Rủi ro chính
1. Khối lượng: ước lượng cũ 18–36 người-tháng — founder biết và vẫn chốt. Giảm bằng: EE skip (~25% backend), Captain/voice/companies bỏ (~150 endpoint + ~120 .vue), port theo sóng có sản phẩm chạy được.
2. Pixel-perfect từ Vue sang React: Radix primitives đổi DOM/focus → phải override; 2 nguồn lệch pixel lớn nhất = `prose-bubble` + font weight lẻ.
3. ProseMirror editor (`@chatwoot/prosemirror-schema`) — thư viện này framework-agnostic, dùng lại được trong React, KHÔNG viết lại.
4. Email channel (IMAP + reply parsing) là phần khó nhất Sóng 5 — để cuối sóng.
