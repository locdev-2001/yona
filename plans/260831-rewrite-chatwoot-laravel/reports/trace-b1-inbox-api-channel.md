# Trace B1 — Inbox + kênh API

Nguồn: Chatwoot v4.17.1 (`refs/chatwoot`). Ngày port: 01/09/2026.

## Backend Ruby ↔ PHP

| Nguồn Chatwoot | Đích Laravel | Ghi chú |
|---|---|---|
| `db/schema.rb` bảng `inboxes` | `database/migrations/2026_09_01_100000_create_inboxes_tables.php` | Đủ cột; `portal_id` giữ chỗ chưa FK (portals nhóm D) |
| `db/schema.rb` bảng `channel_api` | cùng migration | unique identifier + hmac_token như gốc |
| `db/schema.rb` bảng `inbox_members` | cùng migration | unique (inbox_id, user_id) + index inbox_id |
| `app/models/inbox.rb` | `app/Models/Inbox.php` | morphTo channel; addMembers/removeMembers; assignableAgents; orderByName; `dependent: :destroy` channel+avatar qua `booted::deleted` |
| `app/models/channel/api.rb` + `Channelable` + `WebhookSecretable` | `app/Models/Channel/Api.php` | `has_secure_token` → Str::random(24) cho identifier/hmac_token/secret khi creating; `resetSecret()`; EDITABLE_ATTRS |
| `app/models/inbox_member.rb` | `app/Models/InboxMember.php` | Round-robin queue + FilteredCountInvalidator → nợ B4/B6 |
| `User#assigned_inboxes` | `User::assignedInboxes()` | admin = mọi inbox account, agent = inbox mình là member |
| `app/policies/inbox_policy.rb` | inline trong controller | Scope = assignedInboxes; show? member/admin → 401 khi trái; create/update/destroy/reset_secret/avatar = `authorizeAdministrator` |
| `Api::V1::Accounts::InboxesController` | `app/Http/Controllers/WebApi/InboxesController.php` | index/show/create/update/destroy/reset_secret/avatar(DELETE)/assignable_agents. BỎ: campaigns (D1), agent_bot + set_agent_bot (D), message_templates/sync_templates/health/register_webhook/whatsapp_business_management_token (kênh WhatsApp), branded_email_layout (EE) |
| `Api::V1::Accounts::InboxMembersController` | `app/Http/Controllers/WebApi/InboxMembersController.php` | Giữ nguyên ngữ nghĩa: create chỉ THÊM id thiếu, update diff add/remove, destroy bỏ qua id lạ; inbox_id sai → 404; user không tồn tại → 422 `User must exist` |
| `api/v1/models/_inbox.json.jbuilder` | `app/Http/Resources/InboxResource.php` | Giữ đủ key kênh khác (null qua `try`); hmac_token/secret chỉ admin; `working_hours: []` tới khi port Business Hours; `help_center` bỏ tới khi có portals |
| `DeleteObjectJob` (destroy) | `App\Jobs\DeleteObjectJob` (queue `low`) | có sẵn từ A5 |
| morph map `Channel::Api` | `AppServiceProvider::boot()` `Relation::morphMap` | channel_type lưu đúng chuỗi Ruby |
| Avatarable (User + Inbox) | `app/Models/Concerns/Avatarable.php` | DRY: gộp logic avatar từ ProfilesController về 1 trait dùng chung |

## Routes

| Chatwoot | Yona | |
|---|---|---|
| `GET/POST /api/v1/accounts/:id/inboxes` + member `GET :id` `PATCH :id` `DELETE :id` `GET assignable_agents` `POST reset_secret` `DELETE avatar` | `routes/web_api.php` cùng path | |
| `inbox_members`: `GET /:inbox_id`, `POST` + `PATCH` + `DELETE` collection (inbox_id trong body) | `routes/web_api.php` cùng shape | |
| `inbox.routes.js` (list/new/:sub_page/:inbox_id/agents/:inbox_id/finish/:inboxId/:tab?) | `routes/web.php` + `App\Http\Controllers\App\InboxesSettingsController` | mọi route admin-only như meta.permissions gốc |

## Frontend Vue ↔ React

| Nguồn | Đích | Ghi chú |
|---|---|---|
| `settings/inbox/Index.vue` | `settings/inboxes/Index.tsx` | list + search (picoSearch 2 tầng như `searchInboxes`) + modal xóa gõ tên |
| `settings/inbox/InboxChannels.vue` | `settings/inboxes/WizardLayout.tsx` | wizard 4 bước CHANNEL/INBOX/AGENT/FINISH + PageHeader mobile |
| `settings/inbox/ChannelList.vue` + `widgets/ChannelItem.vue` + `components/ChannelSelector.vue` | `NewChannelList.tsx` + `components/widgets/ChannelItem.tsx` + `components/ChannelSelector.tsx` | 11 card (bỏ tiktok — cần tiktokAppId); chỉ `api` active, kênh khác disabled mờ, port kênh nào mở kênh đó |
| `settings/inbox/ChannelFactory.vue` + `channels/Api.vue` | `NewChannel.tsx` (map CHANNEL_VIEWS) | validation như vuelidate: name required, webhook bắt đầu `http` |
| `settings/inbox/AddAgents.vue` | `AddAgents.tsx` | TagInput chọn agent, ≥1 mới cho qua |
| `settings/inbox/FinishSetup.vue` | `FinishSetup.tsx` | nhánh API: EmptyState + 2 nút; QR/script kênh khác vào cùng kênh |
| `settings/inbox/Settings.vue` | `Show.tsx` | tab bar đủ 6 tab như oracle (Business Hours/CSAT/Bot nội dung trống — feature chưa tới); sync tab ↔ URL bằng history.replaceState như gốc |
| `settingsPage/CollaboratorsPage.vue` | `settingsPage/CollaboratorsPage.tsx` | nhánh CE: assignment_v2/advanced_assignment (EE) + max_assignment_limit (enterprise) bỏ |
| `settingsPage/ConfigurationPage.vue` | `settingsPage/ConfigurationPage.tsx` | nhánh isAPIInbox: identifier + hmac_token + checkbox hmac_mandatory |
| `helper/inbox.js` | `helper/inbox.ts` | INBOX_TYPES, identifier resolvers, icon map line, searchInboxes |
| `components-next/sidebar/Sidebar.vue` (nhóm Channels) | `SetCurrentAccount` share `inboxes` + `menuItems.ts` | sort lower(name); icon ChannelIcon; link `inbox/{id}`; ChannelLeaf reauth-badge chưa cần (API không reauth) |
| Component mới port: `ui/Tabs`, `Code` (woot-code), `TagInput`, `DropdownMenu` (nhánh items), `SettingsFieldSection/ToggleSection/Accordion`, `Select`, `Label`, `ConfirmButton`, `AccessToken`, `SettingIntroBanner`, `ChannelIcon`, `ChannelName`, `LockToSingleConversationPreview`, `GreetingsEditor` | | |
| i18n `en/inboxMgmt.json` | copy nguyên văn + đăng ký; thêm GENERAL.BETA/BETA_DESCRIPTION | "Chatwoot" thay lúc render qua `useBranding` |

## Khác biệt cố ý

1. **GreetingsEditor** richtext (WootMessageEditor/ProseMirror) → textarea tạm, chờ B3 (cùng cách A4 làm message_signature).
2. **woot-code** bỏ highlight.js — B1 chỉ hiển thị token 1 dòng; style `code.hljs` đã có ở `_base.scss`. Form CodePen vào C1.
3. **InboxMembers cross-account:** bản gốc KHÔNG kiểm user thuộc account (belongs_to :user chỉ cần tồn tại) — lỗ scoping, mình chặn 422. Spec gốc không phủ case này.
4. **Tab bar Show đủ 6 tab** nhưng Business Hours/CSAT/Bot Configuration nội dung trống (feature chưa port); oracle account mặc định bật `agent_bots` nên tab Bot hiện.
5. **Help Center select** chỉ có option None (portals nhóm D).
6. **Factory `:inbox`** mặc định kênh api (gốc mặc định web_widget — chưa có driver).
7. **Sidebar Channels** lấy từ shared props Inertia thay vì store dispatch; unread badge chờ B8.

## Test (Pest ⇄ RSpec)

| RSpec | Pest | |
|---|---|---|
| `spec/controllers/.../inboxes_controller_spec.rb` (các block API-channel: index admin/agent, show 401/agent/hmac, create api + invalid type, update inbox + channel + avatar, delete + cross-account + agent, avatar delete, assignable_agents) | `tests/Feature/WebApi/InboxesControllerTest.php` (23 test) | block kênh khác (webwidget/email/line/sms/whatsapp/twitter/imap/smtp/branded email) port cùng kênh |
| `spec/controllers/.../inbox_members_controller_spec.rb` (đủ 4 action) | `tests/Feature/WebApi/InboxMembersControllerTest.php` (17 test) | + 1 test cross-account (hardening) |
| `spec/models/inbox_spec.rb` (add/remove members, api?, assignable, order, destroy cascade) | `tests/Feature/Models/InboxTest.php` (7 test) | phần conversations/cache/facebook vào nhóm sau |

Gate: Pest **194/194** + tsc + `npm run build` xanh, pint sạch.

## Đã bấm thật trên trình duyệt (01/09)

1. Login John → `/settings/inboxes/list` (empty state đúng).
2. Add Inbox → grid 11 kênh, Voice "Coming Soon", WhatsApp Call chip Beta.
3. Chọn API → form tạo → tên `api-test`, webhook trống → tạo OK, nhảy bước Add Agents.
4. Chọn John từ TagInput dropdown → Add agents → bước Voilà.
5. More settings → trang Show đủ banner tên + identifier + 6 tab; đổi greeting + Update → DB ăn (rồi trả về mặc định).
6. Tab Collaborators hiện John; tab Configuration hiện identifier/hmac/checkbox; URL sync theo tab.
7. Sidebar → Conversations → Channels hiện `api-test` → link `inbox/1`.
8. Tạo `temp-del` → xóa qua modal gõ tên → row biến mất; job `low` chạy → DB sạch cả channel (cascade).

Dữ liệu để pixel-diff: inbox `api-test` id=1 (oracle id=1), collaborator John, webhook trống. Vùng ngẫu nhiên cần crop né: identifier + hmac token + webhook secret (banner trang Show, tab Configuration, ô Webhook Secret tab Settings, cột identifier ở list).
