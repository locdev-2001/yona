# Kiểm kê API + tầng xử lý nền — Chatwoot v4.17.1

> Báo cáo agent kiểm kê 31/08/2026. Nguồn: `refs/chatwoot` (v4.17.1). Không mở `enterprise/` — nhánh `if ChatwootApp.enterprise?` chỉ ghi nhận từ `config/routes.rb`.

---

## 1. Bản đồ route (`config/routes.rb`, 770 dòng)

### 1.1 Tổng quan namespace

| Namespace | Prefix | Base controller | Endpoint (ước tính) |
|---|---|---|---|
| API v1 — account scoped | `/api/v1/accounts/:account_id/...` | `Api::V1::Accounts::BaseController` | ~372 (+~18 EE) |
| API v1 — non-account | `/api/v1/...` (profile, widget, notification_subscriptions) | `Api::BaseController` / `Api::V1::Widget::BaseController` | ~42 (widget 23) |
| API v2 — reports | `/api/v2/accounts/:account_id/...` | `Api::V2::Accounts::*` | ~24 |
| Platform API | `/platform/api/v1/...` | `PlatformController` | ~21 |
| Public API (contact-facing) | `/public/api/v1/...` | `PublicController` | ~19 |
| Help Center public | `/hc/:slug/...` | `Public::Api::V1::Portals*` | 11 |
| Channel webhooks + OAuth callbacks | `/webhooks/*`, `/{provider}/callback` | `Webhooks::*` | ~21 (+4 EE voice) |
| Super Admin (Administrate) | `/super_admin/...` | `SuperAdmin::ApplicationController` | ~65 |
| Dashboard / SPA / misc | `/`, `/app/*`, `/widget`, `/survey`, `/health`, `/swagger` | `DashboardController`, `WidgetsController` | ~25 |
| Enterprise API | `/enterprise/api/v1/...` | (không mở) | ~14 |

Tổng OSS ≈ **600 endpoint** (±5%).

### 1.2 Chi tiết api/v1/accounts (nhóm lớn nhất)
- **Conversation core**: `conversations` 38 (nested messages 6, assignments, labels 2, participants 4, direct_uploads, draft_messages 3), `search` 5, `unread_counts`.
- **Contact/Company**: `contacts` 24, `companies` 14 (EE), `contact_inboxes` 1, `actions/contact_merge` 1, `data_imports` 9.
- **Captain (AI)**: ~60 — toàn bộ EE, skip.
- **Inbox & channel**: `inboxes` 22, `inbox_members` 4, `agent_bots` 8, facebook `callbacks` 4, `channels/twilio_channel` 1, OAuth authorizations ×7 (twitter, microsoft, google, instagram, tiktok, notion, whatsapp).
- **Automation & routing**: `automation_rules` 6, `macros` 6, `sla_policies` 5 (EE), `assignment_policies` + `inboxes/assignment_policy` 11, `agent_capacity_policies` 11 (EE), `bulk_actions` 1.
- **Team/quyền**: `agents` 5, `teams`+`team_members` 9, `custom_roles` 5 (EE), `assignable_agents` 1, `audit_logs` 1 (EE), `saml_settings` 4 (EE).
- **Integration**: `integrations` 25 (apps, hooks + process_event, slack, dyte, shopify, linear ×8, notion), `webhooks` 4.
- **Help Center**: `portals` 25 (portals + categories + articles + bulk_actions).
- **Khác**: `notifications` 8, `notification_settings` 2, `labels` 5, `canned_responses` 4, `custom_attribute_definitions` 5, `custom_filters` 5, `dashboard_apps` 5, `campaigns` 5, `csat_survey_responses` 3, `applied_slas` 3 (EE), `branded_email_layout` 2, `onboarding` 2, `upload` 1, account root 5.

### 1.3 Endpoint then chốt vòng đời hội thoại
Agent-side: `POST conversations` (qua `ContactInboxWithContactBuilder` + `ConversationBuilder`), `GET conversations` / `POST conversations/filter` / `search` / `meta` / `unread_counts`, `POST :id/toggle_status` (nguồn CSAT + reporting event), `POST :id/assignments`, `POST :id/messages` (→ `SendReplyJob`), `messages/:id/retry` + `translate`, `toggle_typing_status`, `update_last_seen`, `unread`, `mute/unmute`, `toggle_priority`, `transcript`, `custom_attributes`, `attachments`, `draft_messages` GET/PUT/DELETE.

Contact-side: Widget `POST /api/v1/widget/conversations|messages`, `toggle_typing`, `update_last_seen`, `GET toggle_status`, `PATCH /api/v1/widget/contact/set_user`. Public API: `POST /public/api/v1/inboxes/:inbox_id/contacts` → `conversations` → `messages` + toggle_status/toggle_typing/update_last_seen. CSAT: `GET/PATCH /public/api/v1/csat_survey/:id`, view `/survey/responses/:id`.

Inbound webhooks (không auth user): `POST /webhooks/{whatsapp/:phone_number, telegram/:bot_token, line/:line_channel_id, sms/:phone_number, instagram, tiktok, shopify}`, `POST /twilio/callback` + `/twilio/delivery_status`, mount Facebook Messenger tại `/bot`, `GET|POST /webhooks/twitter`.

---

## 2. Kiến trúc tầng

```
HTTP → Controller → Builder / Service (ghi DB)
                          ↓ (model callback after_commit)
                    Dispatcher.dispatch(event_name, ts, data)
                    ├── SyncDispatcher   (in-request, Wisper)
                    │     ├── ActionCableListener   → ActionCableBroadcastJob (critical)
                    │     └── AgentBotListener      → AgentBots::WebhookJob   (high)
                    └── AsyncDispatcher → EventDispatcherJob (critical)
                          → publish lại trong worker cho 10 listener
```

### 2.1 Controller layer
- `ApplicationController`: DeviseTokenAuth `SetUserByToken`, `RequestExceptionHandler`, Pundit, `SwitchLocale`, `TrackSessionActivity`. `pundit_user` = `{user, account, account_user}` từ `Current`.
- `Api::BaseController`: access token hoặc session; `check_authorization` Pundit.
- `Api::V1::Accounts::BaseController`: `EnsureCurrentAccountHelper` set `Current.account`/`Current.account_user`, chặn suspended, chặn token API nếu `api_and_webhooks_enabled?` false.
- 26 Pundit policy (`app/policies/`), 6 finder (`app/finders/`): ConversationFinder, MessageFinder, NotificationFinder, EmailChannelFinder…

### 2.2 Builders (38 file)
- Vòng đời: `ContactInboxBuilder`, `ContactInboxWithContactBuilder` (dedupe identifier → email → phone → instagram source_id, retry RecordNotUnique), `ConversationBuilder` (tôn trọng `lock_to_single_conversation`).
- Message inbound per-channel: `Messages::MessageBuilder`, `Messages::Facebook/Instagram/Messenger::MessageBuilder`.
- Email: `Email::{BaseBuilder, FromBuilder, ReplyToBuilder, SenderNameBuilder}`.
- Khác: `AccountBuilder`, `AgentBuilder`, `NotificationBuilder` (check notification_settings + ConversationPolicy), `NotificationSubscriptionBuilder`, `CsatSurveys::ResponseBuilder`, `Campaigns::CampaignConversationBuilder`.
- Reports: `V2::ReportBuilder` + 18 builder con (agent/team/inbox/label/channel_summary, drilldown, bot_metrics, timeseries, first_response_time_distribution, inbox_label_matrix, outgoing_messages_count).

### 2.3 Services (246 file) — theo domain
| Nhóm | Service tiêu biểu |
|---|---|
| Gửi tin ra kênh | `Base::SendOnChannelService` (abstract) + `Twilio/Whatsapp/Telegram/Line/Sms/Instagram/Tiktok/Twitter/Facebook/Email::SendOn*Service` |
| Nhận tin từ kênh | `Whatsapp::IncomingMessage*`, `Twilio/Telegram/Line/Sms::IncomingMessageService`, `Instagram/Twitter::WebhooksBaseService` |
| Email | `Email::SendOnEmailService`, `EmailTemplates::DbResolverService`, `Imap::*FetchEmailService` (base/google/microsoft), `Mailbox::ConversationFinder` + 4 strategy (in_reply_to, references, receiver_uuid, new_conversation) |
| Conversation | `Conversations::{AssignmentService, DeleteService, FilterService, MessageWindowService, PermissionFilterService, TypingStatusManager}`, cụm `Conversations::UnreadCounts::*` (~19 file, Redis snapshot) |
| Auto-assign | `AutoAssignment::{AssignmentService, AgentAssignmentService, InboxRoundRobinService, RoundRobinSelector, RateLimiter}` |
| Automation/Macro | `AutomationRules::{ActionService, ConditionsFilterService, ConditionValidationService}`, `Macros::ExecutionService` |
| Campaign | `Twilio/Sms::OneoffSmsCampaignService`, `Whatsapp::OneoffCampaignService`, `Liquid::CampaignTemplateService` |
| CSAT | `CsatSurveyService`, `CsatTemplateManagementService`, template services |
| Message templates (bot) | `MessageTemplates::HookExecutionService` + `Template::{Greeting, EmailCollect, OutOfOffice, CsatSurvey, AutoResolve}` |
| Notification | `Notification::{EmailNotificationService, PushNotificationService, FcmService, MarkConversationReadService}` |
| Data import | `DataImports::{Intercom, Freshdesk}::*` |
| Reports | `Reports::{DataSource, RawDataSource, ReportMetricRegistry}`, `ReportingEvents::{RollupService, BackfillService, MetricRegistry}` |
| Filter/Search | `FilterService`, `Conversations/Contacts::FilterService`, `SearchService` |
| WhatsApp platform | ~35 file (embedded signup, template sync/render, phone normalizers, Cloud API/360Dialog providers) |
| Auth/MFA | `Mfa::{AuthenticationService, ManagementService, TokenService}`, `BaseTokenService`, `Widget::TokenService`, `UserSessionTrackingService`, `BaseRefreshOauthTokenService` + Google/Microsoft/Instagram |

### 2.4 Dispatcher + Listener — event bắn đi đâu
Nguồn phát: model callback after_commit (Message → MESSAGE_CREATED/FIRST_REPLY_CREATED/MESSAGE_UPDATED; Conversation → CONVERSATION_*, ASSIGNEE_CHANGED, TEAM_CHANGED; Notification → NOTIFICATION_*).

**Sync**: `ActionCableListener` (gom pubsub token agents+admins+contact_inbox — contact HMAC-verified thì lấy toàn bộ contact_inboxes verified → `ActionCableBroadcastJob` critical, payload thêm `account_id` + `performer`); `AgentBotListener` (`AgentBots::WebhookJob` POST tới `outgoing_url`).

**Async** (qua `EventDispatcherJob` critical):
| Listener | Đích |
|---|---|
| `WebhookListener` | Account webhooks (lọc `subscriptions`) + `Channel::Api#webhook_url` → `WebhookJob` (medium) → `Webhooks::Trigger` |
| `HookListener` | `HookJob` (medium, mutex Redis) — slack/dialogflow/google_translate/leadsquared/linear |
| `AutomationRuleListener` | Match rule → `AutomationRules::ActionService` hoặc `AutomationRulePendingExecution` (delayed) |
| `NotificationListener` | `NotificationBuilder` → Notification → Push/Email/RemoveDuplicate jobs |
| `CsatSurveyListener` | resolved → `CsatSurveyService`; `input_csat` updated → `ResponseBuilder` |
| `CampaignListener` | `campaign.triggered` → `Campaigns::CampaignConversationBuilder` |
| `ReportingEventListener` | Ghi `ReportingEvent` + `safe_rollup` |
| `ParticipationListener` | `assignee.changed` → `ConversationParticipant` |
| `Conversations::UnreadCounts::Listener` | Invalidate/refresh unread-count Redis store |
| `InstallationWebhookListener` | `account.created` → webhook cài đặt |

**Webhook signing** (`lib/webhooks/trigger.rb`): headers `X-Chatwoot-Delivery` (UUID), `X-Chatwoot-Timestamp`, `X-Chatwoot-Signature: sha256=HMAC_SHA256(secret, "ts.body")`. Timeout `WEBHOOK_TIMEOUT` mặc định 5s. Agent-bot webhook 429/500 → retry; thất bại khác → conversation pending chuyển open + activity message; API-inbox webhook fail → message status `failed`.

### 2.5 ActionCable
- `RoomChannel` duy nhất: subscribe bằng `pubsub_token` (`user_id` → User, ngược lại ContactInbox → contact). Stream `pubsub_token` + `account_<id>` nếu User. Cập nhật `OnlineStatusTracker` (Redis), broadcast `presence.update`. `ApplicationCable::Connection` rỗng.

---

## 3. Job nền (98 job)

Queue priority (`config/sidekiq.yml`): critical > high > medium > default > mailers > action_mailbox_routing > low > scheduled_jobs > deferred > purgable > housekeeping > async_database_migration > … Concurrency 10, max_retries 3, timeout 25.

Nhóm chính: Event/realtime (`EventDispatcherJob`, `ActionCableBroadcastJob` — critical); Gửi tin (`SendReplyJob` high — map `CHANNEL_SERVICES` 11 channel, attachment delay 2s; `ConversationReplyEmailJob` mailers; Slack jobs; `Conversations::ActivityMessageJob` high; `UpdateMessageStatusJob` deferred); Webhook out (`WebhookJob` medium, `AgentBots::WebhookJob` high, `HookJob` medium mutex); Webhook in (`Webhooks::{Facebook,Instagram,Line,Sms,Telegram,Tiktok,Twilio,Whatsapp}EventsJob`); Automation (`TriggerPendingExecutionsJob` scheduled, `ProcessPendingExecutionJob` medium claim atomic, `MacrosExecutionJob`, `BulkActionsJob`); Auto assignment (`AssignmentJob` default — coalesce per-inbox Redis token TTL 5', `PeriodicAssignmentJob` scheduled); Lifecycle (`ResolutionJob`, `ConversationsResolutionSchedulerJob`, `ReopenSnoozedConversationsJob`, `UserMentionJob`); Campaign (`TriggerOneoffCampaignJob`); Notification (Email/Push/RemoveDuplicate/Delete/ReopenSnoozed/RemoveOld); Email IMAP (`FetchImapEmailInboxesJob`, `FetchImapEmailsJob`); Channel sync (Whatsapp templates/health, Twilio templates); Data import; Contact/Avatar (IpLookup, ContactsExport, AvatarFrom{Url,Gravatar,Favicon}); Housekeeping (`Internal::*` — stale contacts/redis keys, orphan conversations, delete accounts, check versions); Migration async ×9.

### sidekiq-cron (`config/schedule.yml`)
| Cron | Job |
|---|---|
| `*/1` | `Inboxes::FetchImapEmailInboxesJob` |
| `*/5` | `TriggerScheduledItemsJob` — **fan-out chính**: oneoff campaigns (scheduled_at trong 3 ngày), reopen snoozed conversations + notifications, auto-resolve scheduler, whatsapp template sync, automation pending executions |
| `*/30` | `AutoAssignment::PeriodicAssignmentJob` |
| `0 * * * *` | `TriggerHourlyScheduledItemsJob` → Whatsapp health sync |
| `0 */12` | `RemoveOrphanConversationsJob` |
| `0 0` | `TriggerDailyScheduledItemsJob` → `CheckNewVersionsJob` (offset MD5 installation) |
| `0 1` | `DeleteAccountsJob` |
| `30 22` | `RemoveStaleContactInboxesJob`, `RemoveStaleRedisKeysJob`, `RemoveOldNotificationJob` |

---

## 4. Cơ chế auth

### 4.1 Access token (`AccessTokenAuthHelper`)
- Header `api_access_token` → `AccessToken.owner` = User / AgentBot / PlatformApp.
- **Bot allowlist** `BOT_ACCESSIBLE_ENDPOINTS`: AgentBot chỉ gọi được conversations#{show, toggle_status, toggle_typing_status, toggle_priority, create, update, custom_attributes}, messages#create, assignments#create, labels#{index, create}. Ngoài → 401.
- Token API bị chặn nếu account tắt `api_and_webhooks_enabled?` → 403.

### 4.2 Session (dashboard)
- devise_token_auth mount `/auth` (override Sessions/Passwords/Confirmations/TokenValidations/OmniauthCallbacks). Headers: `access-token`, `client`, `uid`, `expiry`, `token-type: Bearer`.
- `TrackSessionActivity` → `user_sessions`. Quản lý: `GET/DELETE /api/v1/profile/sessions`.
- MFA: `/api/v1/profile/mfa` (show/create/destroy/verify/backup_codes).
- Pundit `pundit_user = {user, account, account_user}`; `EnsureCurrentAccountHelper` chặn suspended.

### 4.3 Super Admin
- Devise model riêng `SuperAdmin` (STI User), gem Administrate tại `/super_admin`. Mount Sidekiq::Web `/monitoring/sidekiq`. Resources: accounts (+seed, reset_cache), users, access_tokens, installation_configs, agent_bots, platform_apps, platform_banners, app_config, instance_status…

### 4.4 Platform API
- `PlatformController < ActionController::API`, owner phải là PlatformApp; resource phải nằm trong `platform_app_permissibles` → 401 nếu không. `GET users/:id/login` + `POST users/:id/token` cấp SSO.

### 4.5 Widget token (JWT)
- `Widget::TokenService`: JWT `{source_id, inbox_id, exp, iat}`, exp = 180 ngày (InstallationConfig `WIDGET_TOKEN_EXPIRY`). Cấp lúc render `/widget`; API widget đọc header **`X-Auth-Token`**. `set_web_widget` theo `website_token`; CSP `frame-ancestors` theo `allowed_domains`; exception mobile WebView.

### 4.6 HMAC contact identity
- Secret = `channel_web_widgets.hmac_token`; công thức `HMAC_SHA256(hmac_token, identifier)` hexdigest, secure_compare. Cờ `hmac_mandatory`.
- Verify tại widget `ContactsController#set_user` (luôn) / `#update` (chỉ khi có identifier); public API `process_hmac`.
- Thành công → `contact_inbox.hmac_verified = true` → (a) query conversation trên toàn bộ contact_inboxes verified (continuity đa thiết bị); (b) ActionCable broadcast tới mọi pubsub_token verified.
- Webhook inbound: Shopify `X-Shopify-Hmac-SHA256`, Meta `MetaTokenVerifyConcern`, Twitter CRC.

---

## Cần đào sâu sau
- 18 report builder V2 + cụm `Conversations::UnreadCounts::*` (19 file Redis snapshot/versioning) — mới nắm tên/vai trò.
- ActionMailbox pipeline (`app/mailboxes/`: ApplicationMailbox, ReplyMailbox, DefaultMailbox, imap/).
- `lib/integrations/` (Dialogflow, OpenAI, Slack) chưa mở chi tiết.
- Captain AI (~60 endpoint) = EE, skip vĩnh viễn.
