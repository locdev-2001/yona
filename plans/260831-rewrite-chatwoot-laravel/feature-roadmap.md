# Lộ trình port từng tính năng — Chatwoot → Laravel

**Nguyên tắc giao hàng (lệnh founder 31/08):** port TỪNG TÍNH NĂNG một, mỗi tính năng đi đủ 3 tầng **migration → backend → UI React**, xong là **bấm được trên UI và test được ngay**, rồi mới sang tính năng kế. Không port toàn bộ cùng lúc.

Mỗi mục ghi: nguồn Chatwoot (bảng / endpoint / màn hình) → việc phải làm bên Laravel/React → tiêu chí "test ngay trên UI".

Thứ tự là thứ tự thi công. Tính năng sau chỉ phụ thuộc tính năng trước nó.

---

## Nhóm A — Nền móng (vào cửa được, thấy giao diện thật)

### A1. Skeleton + design system + trang Login
- **Nguồn:** `v3/` (Login.vue + SAML bỏ), token 4 file: `tailwind.config.js`, `theme/colors.js`, `theme/icons.js`, `_next-colors.scss`.
- **Port:** Laravel 12 mới tinh trên branch (xóa app cũ), Inertia+React+Vite; DB `yona_rw` + migration `users` (đủ cột Chatwoot: pubsub_token, ui_settings, availability, type cho SuperAdmin STI; 2FA để cột sẵn, làm sau); port nguyên 2 hệ màu + icon woot + font Inter (weight 420–620) + `prose-bubble`; auth session Laravel (thay devise_token_auth) — login form.
- **Test ngay:** mở `/app/login` thấy trang login GIỐNG Chatwoot (light+dark), đăng nhập bằng user seed → redirect dashboard trống.

### A2. Signup + tạo Account + onboarding
- **Nguồn:** `v3/` signup, `AccountBuilder`, bảng `accounts` + `account_users`, route `/onboarding`.
- **Port:** migration `accounts` (feature_flags jsonb, settings jsonb, status, locale) + `account_users` (role agent/administrator) + PG trigger `conv_dpid_seq_<id>`/`camp_dpid_seq_<id>`; AccountBuilder service; màn signup + onboarding account details.
- **Test ngay:** đăng ký user mới → tạo account → vào `/app/accounts/:id` đúng flow Chatwoot.

### A3. Dashboard shell + Sidebar + điều hướng
- **Nguồn:** `Dashboard.vue`, `components-next/sidebar/Sidebar.vue` (1100 dòng), router `/app/accounts/:accountId/*`.
- **Port:** layout Inertia shell + Sidebar React (đủ nhóm nav, ẩn mục EE), route đủ nhưng trang con là placeholder; Current context (account scoping middleware — mọi query scope theo account_id); switch account.
- **Test ngay:** sidebar giống Chatwoot pixel, click từng mục điều hướng đúng URL, dark mode toggle ăn toàn shell.

### A4. Profile settings
- **Nguồn:** `/profile/settings` (21 .vue), `/api/v1/profile`.
- **Port:** update tên/email/password/avatar (bảng attachments dùng chung — dựng luôn migration `attachments` + disk), availability, message signature, `ui_settings`.
- **Test ngay:** đổi tên + upload avatar → thấy ngay trên sidebar; đổi password → login lại được.

### A5. Quản lý Agents
- **Nguồn:** settings/agents, `/api/v1/accounts/:id/agents` (5 endpoint), `AgentBuilder`.
- **Port:** CRUD agent + mời qua email (mailer + template), role agent/administrator, xác nhận tài khoản.
- **Test ngay:** mời agent mới qua email thật (mailpit dev), agent đặt password, đăng nhập, thấy trong danh sách.

### A6. Teams
- **Nguồn:** settings/teams (10 .vue), `teams` + `team_members`, 9 endpoint.
- **Port:** CRUD team + gán member, wizard 4 bước như Chatwoot.
- **Test ngay:** tạo team, gán 2 agent, sửa/xóa — UI wizard giống bản gốc.

---

## Nhóm B — Trục hội thoại (chat được thật)

### B1. Inbox + kênh API
- **Nguồn:** `inboxes` (polymorphic channel) + `channel_api`, settings/inboxes wizard, 22 endpoint inbox.
- **Port:** migration `inboxes` + `channel_api` + `inbox_members`; morph map channel; wizard tạo inbox kênh API + trang settings inbox (tab collaborators/configuration); `webhook_url` để trống dùng sau.
- **Test ngay:** tạo inbox "API" qua wizard, gán agent, thấy inbox trong sidebar.

### B2. Contacts tối thiểu + Contact Inboxes
- **Nguồn:** `contacts`, `contact_inboxes`, `ContactInboxWithContactBuilder` (dedupe identifier→email→phone), màn `/contacts`.
- **Port:** migration contacts (+ GIN trgm) + contact_inboxes; builder dedupe y hệt; UI list + tạo + trang chi tiết tối giản (đủ xem, chưa cần segments).
- **Test ngay:** tạo contact tay trên UI; gọi API tạo contact trùng email → không sinh bản ghi đôi.

### B3. Conversation + Message qua kênh API (lõi của lõi)
- **Nguồn:** `conversations` + `messages`, `ConversationBuilder`, `Messages::MessageBuilder`, endpoint `POST /api/v1/accounts/:id/conversations` + `.../messages`, màn ChatList + ConversationBox + ReplyBox.
- **Port:** 2 migration lớn (đủ enum status/priority, display_id qua trigger, content_types tối thiểu: text + incoming_email để sau); API tạo conversation/message (token auth `api_access_token` — dựng bảng `access_tokens` polymorphic luôn); UI 3 cột: ChatList, MessagesView, ReplyBox (ProseMirror `@chatwoot/prosemirror-schema` dùng lại nguyên); private note.
- **Test ngay:** curl tạo conversation + tin inbound → hiện trong dashboard (F5), agent gõ trả lời → message lưu, hiển thị bubble đúng chiều, đúng style `prose-bubble`.

### B4. Realtime
- **Nguồn:** RoomChannel + pubsub_token + `ActionCableListener`, ~30 event client.
- **Port:** Reverb + Echo; khung Event/Listener Laravel với đúng tên event Chatwoot; broadcast message.created/conversation.created/typing/presence; heartbeat presence 20s; typing indicator + online status agent.
- **Test ngay:** mở 2 trình duyệt 2 agent — tin mới hiện KHÔNG cần F5, thấy "đang gõ…", chấm online đổi màu.

### B5. Vòng đời conversation
- **Nguồn:** `toggle_status` (open/resolved/pending/snoozed + snoozed_until), `toggle_priority`, activity messages (`ActivityMessageHandler`), `waiting_since`/`first_reply_created_at`/`status_changed_at`.
- **Port:** service đổi status + sinh activity message y hệt câu chữ; nút Resolve/Snooze/priority trên ConversationHeader; cron reopen snoozed (scheduler).
- **Test ngay:** resolve → thấy activity line "X resolved…"; snooze tới giờ → tự mở lại; đổi priority thấy icon.

### B6. Assignment + auto-assignment
- **Nguồn:** `assignments` endpoint, `AutoAssignment::*` (round-robin + rate limiter), `assignee.changed`, `Conversations::AssignmentService`.
- **Port:** gán tay agent/team trên ConversationHeader + bulk; round-robin theo inbox_members khi conversation mới (auto_assignment_config); event + activity message.
- **Test ngay:** bật auto-assign trên inbox, bắn 3 conversation mới → chia vòng tròn cho các agent online; gán tay đổi được.

### B7. Labels
- **Nguồn:** `labels` + tagging (thiết kế lại: bảng `taggings` đơn giản scope theo account — không bê acts_as_taggable_on), settings/labels, LabelBox, sidebar nhóm label, `cached_label_list`.
- **Port:** CRUD label + gán vào conversation/contact + filter theo label ở sidebar.
- **Test ngay:** tạo label màu, gán vào conversation, click label trên sidebar lọc đúng.

### B8. Bộ lọc danh sách + unread + tabs
- **Nguồn:** `ConversationFinder` (tabs mine/unassigned/all, filter status/inbox/team/label), unread counts (đơn giản hóa: đếm SQL, chưa cần cụm Redis 19 file), `update_last_seen`.
- **Port:** ChatListHeader tabs + filter; badge unread trên sidebar + item; mark read khi mở.
- **Test ngay:** số unread đúng khi có tin mới, đổi tab lọc đúng, mở conversation badge biến mất.

### B9. Attachments
- **Nguồn:** bảng `attachments` (file_type image/audio/video/file), upload trong ReplyBox, ImageBubble/FileBubble, `direct_uploads`.
- **Port:** upload multipart → disk local (S3-ready), render bubble ảnh/video/file, download.
- **Test ngay:** gửi ảnh từ ReplyBox thấy thumbnail; gửi PDF thấy card file tải được.

### B10. Tiện ích soạn thảo
- **Nguồn:** canned_responses (`/` shortcut), draft_messages, keyboard shortcuts, emoji picker, CommandBar (ninja-keys).
- **Port:** CRUD canned response (settings) + popup `/` trong ReplyBox; draft lưu server; phím tắt chính; command bar tìm-nhảy conversation.
- **Test ngay:** gõ `/` chọn mẫu chèn đúng; gõ dở F5 còn draft; Ctrl+K mở command bar.

### B11. Participants, Mentions, Contact panel đầy đủ
- **Nguồn:** `conversation_participants`, `mentions` (@ trong private note), ContactPanel (ContactInfo/ConversationInfo/SharedFiles/CustomAttributes placeholder), notes trên contact, contact merge.
- **Port:** @mention autocompletion trong note, tab Mentions trên sidebar, panel phải đầy đủ, merge 2 contact.
- **Test ngay:** @tên trong private note → agent kia thấy ở mục Mentions; merge contact gộp hội thoại.

---

## Nhóm C — Widget website (kênh thật đầu tiên)

### C1. Kênh Web Widget + wizard
- **Nguồn:** `channel_web_widgets` (website_token, hmac_token, feature_flags, reply_time), wizard settings/inboxes loại Website.
- **Port:** migration + wizard + trang cấu hình (màu widget, welcome, launcher title).
- **Test ngay:** tạo inbox Website, copy đoạn script nhúng từ UI.

### C2. Widget app + SDK nhúng
- **Nguồn:** `widget/` app (46 .vue) + `sdk/` IIFE + postMessage protocol (`chatwoot-widget:*`) + widget JWT (X-Auth-Token, 180 ngày) + public widget API (23 endpoint).
- **Port:** app React build riêng (iframe, hash route: home/prechat/messages), SDK JS giữ nguyên API `window.$chatwoot` + `chatwootSDK.run`, cookie `cw_conversation`; realtime qua Echo với `contact_inboxes.pubsub_token`.
- **Test ngay:** trang HTML tĩnh nhúng script → bubble hiện, khách chat ↔ agent dashboard realtime 2 chiều, F5 giữ phiên.

### C3. Pre-chat form + HMAC identity + setUser
- **Nguồn:** pre_chat_form_options, `setUser`/`setCustomAttributes`, HMAC sha256 verify, `hmac_verified` continuity.
- **Port:** form pre-chat theo config; `set_user` verify HMAC; conversation continuity đa thiết bị khi verified.
- **Test ngay:** bật pre-chat → khách nhập tên/email trước khi chat; gọi `setUser` với HMAC đúng/sai → pass/401.

### C4. Campaigns ongoing (livechat)
- **Nguồn:** `campaigns` (ongoing + trigger_rules time_on_page/url), `CampaignListener`, màn campaigns livechat.
- **Port:** CRUD campaign livechat + widget tự bắn tin khi đủ điều kiện.
- **Test ngay:** đặt campaign "chào sau 5s ở trang /pricing" → mở trang, 5s sau widget nhả tin.

### C5. CSAT
- **Nguồn:** `csat_survey_responses`, message `input_csat`, survey app, `CsatSurveyListener`, report CSAT.
- **Port:** bật CSAT trên inbox → resolve gửi survey trong widget + trang `/survey/responses/:uuid`; lưu rating/feedback; màn report CSAT để sang D2.
- **Test ngay:** resolve conversation → khách thấy card 5 mức, chấm điểm → agent thấy kết quả.

---

## Nhóm D — Vận hành đội ngũ

### D1. Automation rules
- **Nguồn:** `automation_rules` + pending_executions (delayed), `AutomationRuleListener`, `ConditionsFilterService` + `ActionService` (18 action), settings/automation (9 .vue).
- **Port:** đủ điều kiện/hành động OSS + delay execution qua queue; UI builder điều kiện giống Chatwoot.
- **Test ngay:** rule "message chứa 'giá' → gán label pricing + assign team Sales" chạy đúng khi khách nhắn.

### D2. Reports lõi
- **Nguồn:** `reporting_events` + `ReportingEventListener` (first_response, resolution, reply_time, +business hours) + rollups; màn overview/conversation/agent/CSAT.
- **Port:** ghi event từ Sóng B (bổ sung listener), builder số liệu + chart (thay @chatwoot/viz bằng lib chart React giữ hình dạng); heatmap + timeseries.
- **Test ngay:** chat và resolve vài conversation → số liệu overview khớp tay tính.

### D3. Macros
- **Nguồn:** `macros` + `Macros::ExecutionService`, MacroList trong ConversationSidebar, settings/macros.
- **Port:** builder chuỗi action + nút chạy trong conversation.
- **Test ngay:** macro "gắn label + resolve + gửi tin cảm ơn" chạy 1 click.

### D4. Webhooks out + Agent Bots
- **Nguồn:** `webhooks` (HMAC signing X-Chatwoot-Signature) + `WebhookListener`; `agent_bots` + allowlist bot endpoints + `AgentBotListener`; settings/integrations phần webhook.
- **Port:** đăng ký webhook + retry policy y hệt (429/500 retry; pending→open khi bot chết); bot API token.
- **Test ngay:** trỏ webhook vào requestbin thấy payload đúng schema + chữ ký verify được; bot echo tự trả lời.

### D5. Notifications
- **Nguồn:** `notifications` + settings + subscriptions (browser push/FCM), `NotificationListener` + builder, inbox-view (`/inbox-view`), email notify.
- **Port:** in-app notification center + badge, email notify theo settings, web push (FCM để sau nếu chưa cần mobile).
- **Test ngay:** được assign → chuông đổ số + email tới; tắt trong settings thì thôi.

### D6. Giờ làm việc + auto-reply templates
- **Nguồn:** `working_hours`, `OutOfOffisable`, `MessageTemplates::*` (greeting, email_collect, out_of_office, auto_resolve), auto-resolve scheduler.
- **Port:** UI cấu hình giờ làm việc trên inbox + các template tự động + cron auto-resolve.
- **Test ngay:** ngoài giờ khách nhắn → nhận out-of-office; bật greeting → khách mở widget được chào.

---

## Nhóm E — Dữ liệu & khám phá

### E1. Custom attributes + custom filters + segments
- **Nguồn:** `custom_attribute_definitions` (8 display type), `custom_filters`, FilterInput (14 .vue), segments contact.
- **Port:** định nghĩa attribute, hiện trên ContactPanel + conversation, filter builder + lưu folder/segment.
- **Test ngay:** tạo attribute "Gói quan tâm" dạng list, set trên conversation, lọc + lưu folder thấy trên sidebar.

### E2. Search toàn cục
- **Nguồn:** `SearchService` (pg_trgm), màn search (conversations/contacts/messages).
- **Port:** full-text 3 loại + UI kết quả nhóm.
- **Test ngay:** tìm cụm từ trong tin nhắn cũ ra đúng conversation.

### E3. Contacts nâng cao + import/export
- **Nguồn:** contacts UI đầy đủ (36 .vue), `data_imports` CSV, `Account::ContactsExportJob`.
- **Port:** bảng contacts sortable + bulk, import CSV (map cột, báo lỗi từng dòng, file failed_records), export.
- **Test ngay:** import 100 dòng CSV có 5 dòng lỗi → 95 vào, tải file lỗi về xem.

### E4. Campaigns one-off + Help Center
- **Nguồn:** campaigns one_off (SMS/WhatsApp — phụ thuộc kênh E/F, phần khung làm trước), portals/categories/articles + trang public `/hc/:slug` + article editor.
- **Port:** Help Center đầy đủ (editor, phân locale, public page SSR Laravel); campaign one-off khung + chạy thật khi có kênh SMS/WhatsApp.
- **Test ngay:** viết bài, publish, mở `/hc/slug/vi/bai-viet` thấy trang public; widget search được bài.

---

## Nhóm F — Kênh ngoài & nền tảng (mỗi kênh là 1 tính năng độc lập, làm theo nhu cầu VN)

| # | Kênh/tính năng | Nguồn | Test ngay |
|---|---|---|---|
| F1 | Email channel (SMTP gửi + IMAP nhận + reply parsing `Mailbox::*` 4 strategy + forward_to) | `channel_email`, ConversationReplyEmailJob | gửi mail vào địa chỉ forward → thành conversation; agent reply → khách nhận mail thread đúng |
| F2 | Facebook Messenger | `channel_facebook_pages`, webhook `/bot`, Messages::Facebook::MessageBuilder | page test nhắn → vào inbox, reply về Messenger |
| F3 | Instagram DM | `channel_instagram`, webhook instagram | tương tự |
| F4 | Telegram | `channel_telegram`, webhook `/webhooks/telegram/:bot_token` | bot test 2 chiều |
| F5 | LINE / SMS Twilio / WhatsApp Cloud / TikTok / Twitter | các bảng channel_* còn lại | mỗi kênh 1 đợt riêng, thứ tự theo nhu cầu khách |
| F6 | Integrations chọn lọc (slack, google_translate, dialogflow, dashboard_apps) | `integrations_hooks`, HookListener | theo từng app |
| F7 | Platform API + Super Admin | platform_apps + permissibles, Administrate → Filament hoặc trang Inertia riêng | tạo account/user qua Platform API bằng token |
| F8 | MFA/2FA + user sessions + security | cột otp_*, `user_sessions`, `/profile/mfa`; giới hạn `MAX_USER_SESSIONS=25`/user — vượt thì login trả **409 kèm session picker** (finding yona-ee 31/08, oracle phải nâng limit khi harness login dồn dập) | bật TOTP, login đòi mã; revoke session; login vượt limit thấy picker |

---

## Nhóm G — Zalo cá nhân + hợp nhất (SAU khi core xong)

| # | Việc | Nguồn | Test ngay |
|---|---|---|---|
| G1 | `Channel::Zalo` driver (bảng `channel_zalo`) + QR login lifecycle | zalo-bridge + code Zalo trên main | quét QR kết nối, tin Zalo vào inbox, reply từ dashboard |
| G2 | Đối chiếu automation cũ trên main — tính năng nào chưa phủ bởi D1 thì bổ sung | main | các rule cũ dựng lại chạy được |
| G3 | i18n tiếng Việt toàn bộ + e2e browser gate toàn hệ + hardening + swap main | — | founder nghiệm thu end-to-end rồi merge |

---

## Nhịp làm việc mỗi tính năng
1. Đọc kỹ phần tương ứng trong `refs/chatwoot` (model + service + controller + component Vue).
2. Migration → model/service Laravel → route (đúng 3 mặt tiền) → component React (đối chiếu screenshot Chatwoot).
3. Pest test cho backend + test seam end-to-end; `npm run build` + tsc xanh.
4. **Demo trên UI được ngay** — founder mở trình duyệt bấm thử.
5. Commit theo conventional commit, cập nhật artifact tiến độ.
